import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import {
  AssetDetails,
  AssetRequest,
  CustomerDropdownItem,
  SiteDropdownItem
} from '../asset.models';
import { AssetsService } from '../assets.service';

interface AssetRawFormValue {
  customerId: string;
  siteId: string;
  name: string;
  assetTag: string;
  serialNumber: string;
  assetType: string;
  manufacturer: string;
  model: string;
  locationDescription: string;
  ratedVoltage: number | null;
  ratedCurrent: number | null;
  installedAtUtc: string;
  lastTestedAtUtc: string;
  nextTestDueAtUtc: string;
  notes: string;
  isActive: boolean;
}

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './asset-form.component.html',
  styleUrls: ['./asset-form.component.scss']
})
export class AssetFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assetsService = inject(AssetsService);

  readonly assetTypes = [
    'Motor',
    'Transformer',
    'Cable',
    'Switchgear',
    'Distribution Board',
    'EV Charger',
    'Generator',
    'UPS',
    'Other'
  ];

  assetId = '';
  isEditMode = false;

  customers: CustomerDropdownItem[] = [];
  sites: SiteDropdownItem[] = [];

  loading = false;
  saving = false;
  customersLoading = false;
  sitesLoading = false;

  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    customerId: ['', Validators.required],
    siteId: [{ value: '', disabled: true }, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    assetTag: ['', [Validators.required, Validators.maxLength(80)]],
    serialNumber: ['', Validators.maxLength(120)],
    assetType: ['', [Validators.required, Validators.maxLength(80)]],
    manufacturer: ['', Validators.maxLength(120)],
    model: ['', Validators.maxLength(120)],
    locationDescription: ['', Validators.maxLength(250)],
    ratedVoltage: [null as number | null],
    ratedCurrent: [null as number | null],
    installedAtUtc: [''],
    lastTestedAtUtc: [''],
    nextTestDueAtUtc: [''],
    notes: ['', Validators.maxLength(1000)],
    isActive: [true]
  });

  ngOnInit(): void {
    this.assetId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditMode = !!this.assetId;

    this.loadCustomers();

    if (this.isEditMode) {
      this.loadAsset();
    }
  }

  loadCustomers(): void {
    this.customersLoading = true;
    this.updateLinkedSelectState();

    this.assetsService
      .getCustomersForDropdown()
      .pipe(
        finalize(() => {
          this.customersLoading = false;
          this.updateLinkedSelectState();
        })
      )
      .subscribe({
        next: (customers) => {
          this.customers = customers;
        },
        error: () => {
          this.customers = [];
          this.errorMessage = 'Customers could not be loaded. Please create a customer first or check the API.';
        }
      });
  }

  loadSitesForCustomer(customerId: string, preferredSiteId = ''): void {
    this.sitesLoading = true;
    this.sites = [];
    this.updateLinkedSelectState();

    this.assetsService
      .getSitesForDropdown(customerId)
      .pipe(
        finalize(() => {
          this.sitesLoading = false;
          this.updateLinkedSelectState();
        })
      )
      .subscribe({
        next: (sites) => {
          this.sites = sites;

          if (preferredSiteId) {
            this.form.patchValue({ siteId: preferredSiteId });
          }

          this.updateLinkedSelectState();
        },
        error: () => {
          this.sites = [];
          this.errorMessage = 'Sites could not be loaded for the selected customer.';
        }
      });
  }

  loadAsset(): void {
    this.loading = true;
    this.errorMessage = '';

    this.assetsService
      .getAsset(this.assetId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (asset) => this.patchAsset(asset),
        error: () => {
          this.errorMessage = 'Asset could not be loaded. Please check the API and try again.';
        }
      });
  }

  onCustomerChange(): void {
    const customerId = this.form.controls.customerId.value ?? '';

    this.form.patchValue({ siteId: '' });
    this.sites = [];
    this.updateLinkedSelectState();

    if (customerId) {
      this.loadSitesForCustomer(customerId);
    }
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete all required asset fields.';
      return;
    }

    const request = this.buildRequest();

    this.saving = true;
    this.updateLinkedSelectState();

    const saveRequest = this.isEditMode
      ? this.assetsService.updateAsset(this.assetId, request)
      : this.assetsService.createAsset(request);

    saveRequest
      .pipe(
        finalize(() => {
          this.saving = false;
          this.updateLinkedSelectState();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = this.isEditMode
            ? 'Asset updated successfully.'
            : 'Asset created successfully.';

          this.router.navigate(['/assets']);
        },
        error: () => {
          this.errorMessage = this.isEditMode
            ? 'Asset could not be updated. Please check the fields and try again.'
            : 'Asset could not be created. Please check the fields and try again.';
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/assets']);
  }

  getTitle(): string {
    return this.isEditMode ? 'Edit Asset' : 'Create Asset';
  }

  getSubtitle(): string {
    return this.isEditMode
      ? 'Update electrical asset details, site assignment, ratings, and retest dates'
      : 'Create a new electrical asset under a selected customer site';
  }

  isControlInvalid(controlName: keyof AssetRawFormValue): boolean {
    const control = this.form.get(controlName);

    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getCustomerDropdownLabel(customer: CustomerDropdownItem): string {
    return customer.name ?? customer.companyName ?? customer.contactEmail ?? 'Unnamed customer';
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

  private patchAsset(asset: AssetDetails): void {
    const customerId = asset.customerId ?? '';
    const siteId = asset.siteId ?? '';

    this.form.patchValue({
      customerId,
      siteId,
      name: asset.name ?? asset.assetName ?? '',
      assetTag: asset.assetTag ?? asset.tag ?? '',
      serialNumber: asset.serialNumber ?? '',
      assetType: asset.assetType ?? asset.type ?? '',
      manufacturer: asset.manufacturer ?? '',
      model: asset.model ?? '',
      locationDescription: asset.locationDescription ?? asset.location ?? '',
      ratedVoltage: asset.ratedVoltage ?? null,
      ratedCurrent: asset.ratedCurrent ?? null,
      installedAtUtc: this.formatDateInput(asset.installedAtUtc ?? asset.installDateUtc),
      lastTestedAtUtc: this.formatDateInput(asset.lastTestedAtUtc ?? asset.lastTestDateUtc),
      nextTestDueAtUtc: this.formatDateInput(
        asset.nextTestDueAtUtc ??
          asset.nextTestDueUtc ??
          asset.nextTestDueDateUtc
      ),
      notes: asset.notes ?? '',
      isActive: asset.isActive !== false
    });

    if (customerId) {
      this.loadSitesForCustomer(customerId, siteId);
      return;
    }

    this.updateLinkedSelectState();
  }

  private buildRequest(): AssetRequest {
    const value = this.form.getRawValue() as AssetRawFormValue;

    const request: AssetRequest = {
      siteId: value.siteId,
      name: value.name.trim(),
      assetTag: value.assetTag.trim(),
      serialNumber: this.cleanOptionalText(value.serialNumber),
      assetType: value.assetType.trim(),
      manufacturer: this.cleanOptionalText(value.manufacturer),
      model: this.cleanOptionalText(value.model),
      locationDescription: this.cleanOptionalText(value.locationDescription),
      ratedVoltage: this.cleanOptionalNumber(value.ratedVoltage),
      ratedCurrent: this.cleanOptionalNumber(value.ratedCurrent),
      installedAtUtc: this.toUtcNoonOrNull(value.installedAtUtc),
      lastTestedAtUtc: this.toUtcNoonOrNull(value.lastTestedAtUtc),
      nextTestDueAtUtc: this.toUtcNoonOrNull(value.nextTestDueAtUtc),
      notes: this.cleanOptionalText(value.notes)
    };

    if (this.isEditMode) {
      request.isActive = value.isActive;
    }

    return request;
  }

  private cleanOptionalText(value: string | null | undefined): string | undefined {
    const cleanValue = value?.trim();

    return cleanValue ? cleanValue : undefined;
  }

  private cleanOptionalNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isNaN(numericValue) ? null : numericValue;
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  private updateLinkedSelectState(): void {
    const customerControl = this.form.controls.customerId;
    const siteControl = this.form.controls.siteId;
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
  }
}
