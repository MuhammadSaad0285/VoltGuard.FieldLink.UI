import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import {
  AssetDropdownItem,
  CustomerDropdownItem,
  EngineerDropdownItem,
  JobDetails,
  JobPriority,
  JobRequest,
  JobType,
  SiteDropdownItem
} from '../job.models';
import { JobsService } from '../jobs.service';

interface JobRawFormValue {
  customerId: string;
  siteId: string;
  assetId: string;
  testResultId: string;
  title: string;
  description: string;
  jobType: JobType | '';
  priority: JobPriority | '';
  assignedToUserId: string;
  scheduledDateUtc: string;
  dueDateUtc: string;
  notes: string;
}

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './job-form.component.html',
  styleUrls: ['./job-form.component.scss']
})
export class JobFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsService = inject(JobsService);

  readonly priorities: JobPriority[] = ['Low', 'Medium', 'High', 'Critical'];
  readonly jobTypes: JobType[] = ['Inspection', 'Maintenance', 'Repair', 'Retest', 'FollowUp'];

  jobId = '';
  isEditMode = false;
  isLocked = false;

  customers: CustomerDropdownItem[] = [];
  sites: SiteDropdownItem[] = [];
  assets: AssetDropdownItem[] = [];
  engineers: EngineerDropdownItem[] = [];

  loading = false;
  saving = false;
  customersLoading = false;
  sitesLoading = false;
  assetsLoading = false;
  engineersLoading = false;

  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    customerId: [''],
    siteId: [{ value: '', disabled: true }],
    assetId: [{ value: '', disabled: true }, Validators.required],
    testResultId: [''],
    title: ['', [Validators.required, Validators.maxLength(180)]],
    description: ['', Validators.maxLength(1000)],
    jobType: ['FollowUp' as JobType | '', Validators.required],
    priority: ['High' as JobPriority | '', Validators.required],
    assignedToUserId: [{ value: '', disabled: true }],
    scheduledDateUtc: [''],
    dueDateUtc: [''],
    notes: ['', Validators.maxLength(1000)]
  });

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditMode = !!this.jobId;

    this.applyPrefill();
    this.loadCustomers();
    this.loadAssets();
    this.loadEngineers();

    if (this.isEditMode) {
      this.loadJob();
    }
  }

  loadCustomers(): void {
    this.customersLoading = true;
    this.updateSelectState();

    this.jobsService
      .getCustomersForDropdown()
      .pipe(
        finalize(() => {
          this.customersLoading = false;
          this.updateSelectState();
        })
      )
      .subscribe({
        next: (customers) => {
          this.customers = customers;
        },
        error: () => {
          this.customers = [];
        }
      });
  }

  loadSitesForCustomer(customerId: string, preferredSiteId = ''): void {
    this.sitesLoading = true;
    this.sites = [];
    this.updateSelectState();

    this.jobsService
      .getSitesForDropdown(customerId)
      .pipe(
        finalize(() => {
          this.sitesLoading = false;
          this.updateSelectState();
        })
      )
      .subscribe({
        next: (sites) => {
          this.sites = sites;

          if (preferredSiteId) {
            this.form.patchValue({ siteId: preferredSiteId });
          }

          this.updateSelectState();
        },
        error: () => {
          this.sites = [];
        }
      });
  }

  loadAssets(customerId?: string, siteId?: string, preferredAssetId = ''): void {
    this.assetsLoading = true;
    this.updateSelectState();

    this.jobsService
      .getAssetsForDropdown(customerId, siteId)
      .pipe(
        finalize(() => {
          this.assetsLoading = false;
          this.updateSelectState();
        })
      )
      .subscribe({
        next: (assets) => {
          this.assets = assets;

          if (preferredAssetId) {
            this.form.patchValue({ assetId: preferredAssetId });
          }

          this.updateSelectState();
        },
        error: () => {
          this.assets = [];
        }
      });
  }

  loadEngineers(): void {
    this.engineersLoading = true;
    this.updateSelectState();

    this.jobsService
      .getEngineersForDropdown()
      .pipe(
        finalize(() => {
          this.engineersLoading = false;
          this.updateSelectState();
        })
      )
      .subscribe({
        next: (engineers) => {
          this.engineers = engineers;
        },
        error: () => {
          this.engineers = [];
        }
      });
  }

  loadJob(): void {
    this.loading = true;
    this.errorMessage = '';

    this.jobsService
      .getJob(this.jobId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (job) => this.patchJob(job),
        error: () => {
          this.errorMessage = 'Job could not be loaded. Please check the API and try again.';
        }
      });
  }

  onCustomerChange(): void {
    const customerId = this.form.controls.customerId.value ?? '';

    this.form.patchValue({
      siteId: '',
      assetId: ''
    });
    this.sites = [];
    this.updateSelectState();

    if (customerId) {
      this.loadSitesForCustomer(customerId);
    }

    this.loadAssets(customerId);
  }

  onSiteChange(): void {
    const customerId = this.form.controls.customerId.value ?? '';
    const siteId = this.form.controls.siteId.value ?? '';

    this.form.patchValue({ assetId: '' });
    this.updateSelectState();
    this.loadAssets(customerId, siteId);
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isLocked) {
      this.errorMessage = 'Completed or cancelled jobs cannot be edited.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete all required job fields.';
      return;
    }

    const request = this.buildRequest();

    this.saving = true;
    this.updateSelectState();

    const saveRequest = this.isEditMode
      ? this.jobsService.updateJob(this.jobId, request)
      : this.jobsService.createJob(request);

    saveRequest
      .pipe(
        finalize(() => {
          this.saving = false;
          this.updateSelectState();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = this.isEditMode ? 'Job updated successfully.' : 'Job created successfully.';
          this.router.navigate(['/jobs']);
        },
        error: () => {
          this.errorMessage = this.isEditMode
            ? 'Job could not be updated. Please check the fields and try again.'
            : 'Job could not be created. Please check the fields and try again.';
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/jobs']);
  }

  getTitle(): string {
    return this.isEditMode ? 'Edit Job' : 'Create Job';
  }

  getSubtitle(): string {
    return this.isEditMode
      ? 'Update scheduled work while it is still active'
      : 'Create operational work linked to an asset or failed test result';
  }

  isControlInvalid(controlName: keyof JobRawFormValue): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getCustomerDropdownLabel(customer: CustomerDropdownItem): string {
    return customer.name ?? customer.companyName ?? customer.customerName ?? customer.contactEmail ?? 'Unnamed customer';
  }

  getSiteDropdownLabel(site: SiteDropdownItem): string {
    const name = site.name ?? site.siteName ?? 'Unnamed site';
    const code = site.siteCode ?? site.code;
    const location = [site.city, site.postcode].filter(Boolean).join(', ');

    if (code && location) {
      return `${name} (${code}) - ${location}`;
    }

    if (code) {
      return `${name} (${code})`;
    }

    return location ? `${name} - ${location}` : name;
  }

  getAssetDropdownLabel(asset: AssetDropdownItem): string {
    const name = asset.name ?? asset.assetName ?? 'Unnamed asset';
    const tag = asset.assetTag ?? asset.tag;
    const site = asset.siteName;
    const suffix = [tag, site].filter(Boolean).join(' - ');
    return suffix ? `${name} (${suffix})` : name;
  }

  getEngineerDropdownLabel(engineer: EngineerDropdownItem): string {
    const name = engineer.fullName ?? engineer.name ?? engineer.userName ?? engineer.email ?? 'Unnamed engineer';
    return engineer.email && engineer.email !== name ? `${name} - ${engineer.email}` : name;
  }

  private applyPrefill(): void {
    const query = this.route.snapshot.queryParamMap;
    const assetId = query.get('assetId') ?? '';
    const testResultId = query.get('testResultId') ?? '';
    const title = query.get('title') ?? (testResultId ? 'Follow-up for failed test' : '');
    const priority = query.get('priority') ?? (testResultId ? 'High' : 'High');

    this.form.patchValue({
      assetId,
      testResultId,
      title,
      priority: this.normalizePriority(priority),
      jobType: testResultId ? 'FollowUp' : 'FollowUp'
    });
  }

  private patchJob(job: JobDetails): void {
    const status = job.status ?? 'Scheduled';
    this.isLocked = status === 'Completed' || status === 'Cancelled';

    this.form.patchValue({
      customerId: job.customerId ?? '',
      siteId: job.siteId ?? '',
      assetId: job.assetId ?? '',
      testResultId: job.testResultId ?? '',
      title: job.title ?? '',
      description: job.description ?? '',
      jobType: this.normalizeJobType(job.jobType),
      priority: this.normalizePriority(job.priority),
      assignedToUserId: job.assignedToUserId ?? job.assignedUserId ?? this.findEngineerId(job),
      scheduledDateUtc: this.formatDateInput(job.scheduledAtUtc ?? job.scheduledDateUtc),
      dueDateUtc: this.formatDateInput(job.dueAtUtc ?? job.dueDateUtc),
      notes: job.notes ?? ''
    });

    if (job.customerId) {
      this.loadSitesForCustomer(job.customerId, job.siteId ?? '');
    }

    this.loadAssets(job.customerId, job.siteId, job.assetId ?? '');

    if (this.isLocked) {
      this.form.disable();
      return;
    }

    this.updateSelectState();
  }

  private buildRequest(): JobRequest {
    const value = this.form.getRawValue() as JobRawFormValue;

    return {
      assetId: value.assetId,
      testResultId: this.cleanOptionalText(value.testResultId) ?? null,
      title: value.title.trim(),
      description: this.cleanOptionalText(value.description),
      jobType: value.jobType || 'FollowUp',
      priority: value.priority || 'High',
      assignedTo: this.cleanOptionalText(value.assignedToUserId) ?? null,
      scheduledAtUtc: this.toUtcNoonOrNull(value.scheduledDateUtc),
      dueAtUtc: this.toUtcNoonOrNull(value.dueDateUtc),
      notes: this.cleanOptionalText(value.notes)
    };
  }

  private normalizePriority(value: string | null | undefined): JobPriority {
    return this.priorities.includes(value as JobPriority) ? value as JobPriority : 'High';
  }

  private normalizeJobType(value: string | null | undefined): JobType {
    return this.jobTypes.includes(value as JobType) ? value as JobType : 'FollowUp';
  }

  private cleanOptionalText(value: string | null | undefined): string | undefined {
    const cleanValue = value?.trim();
    return cleanValue ? cleanValue : undefined;
  }

  private findEngineerId(job: JobDetails): string {
    const assignedValue = job.assignedTo ?? job.assignedToEmail ?? job.assignedToName ?? job.assignedToUserName ?? '';

    if (!assignedValue) {
      return '';
    }

    const match = this.engineers.find((engineer) =>
      engineer.id === assignedValue ||
      engineer.email === assignedValue ||
      engineer.fullName === assignedValue ||
      engineer.userName === assignedValue
    );

    return match?.id ?? assignedValue;
  }

  private toUtcNoonOrNull(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T12:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  private formatDateInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const dateOnlyMatch = /^(\d{4}-\d{2}-\d{2})/.exec(value);

    if (dateOnlyMatch) {
      return dateOnlyMatch[1];
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  private updateSelectState(): void {
    if (this.isLocked) {
      this.form.disable({ emitEvent: false });
      return;
    }

    const customerControl = this.form.controls.customerId;
    const siteControl = this.form.controls.siteId;
    const assetControl = this.form.controls.assetId;
    const assignedToControl = this.form.controls.assignedToUserId;
    const hasCustomer = !!customerControl.value;

    if (this.customersLoading || this.saving) {
      customerControl.disable({ emitEvent: false });
    } else {
      customerControl.enable({ emitEvent: false });
    }

    if (!hasCustomer || this.sitesLoading || this.saving) {
      siteControl.disable({ emitEvent: false });
    } else {
      siteControl.enable({ emitEvent: false });
    }

    if (this.assetsLoading || this.saving) {
      assetControl.disable({ emitEvent: false });
    } else {
      assetControl.enable({ emitEvent: false });
    }

    if (this.engineersLoading || this.saving) {
      assignedToControl.disable({ emitEvent: false });
    } else {
      assignedToControl.enable({ emitEvent: false });
    }
  }
}
