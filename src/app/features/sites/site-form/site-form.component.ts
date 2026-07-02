import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { CustomerDropdownItem, SiteDetails, SiteRequest } from '../site.models';
import { SitesService } from '../sites.service';

@Component({
  selector: 'app-site-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './site-form.component.html',
  styleUrls: ['./site-form.component.scss']
})
export class SiteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sitesService = inject(SitesService);

  readonly siteForm = this.fb.nonNullable.group({
    customerId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    siteCode: ['', [Validators.required, Validators.maxLength(50)]],
    siteType: ['', [Validators.required, Validators.maxLength(80)]],
    contactPerson: ['', [Validators.required, Validators.maxLength(120)]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    contactPhone: ['', [Validators.required, Validators.maxLength(40), Validators.pattern(/^[0-9+()\-\s]+$/)]],
    addressLine1: ['', [Validators.required, Validators.maxLength(180)]],
    addressLine2: ['', [Validators.maxLength(180)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    postcode: ['', [Validators.required, Validators.maxLength(20)]],
    country: ['United Kingdom', [Validators.required, Validators.maxLength(100)]],
    notes: ['', [Validators.maxLength(500)]]
  });

  customers: CustomerDropdownItem[] = [];

  siteId = '';
  loading = false;
  customersLoading = false;
  saving = false;
  errorMessage = '';

  get isEditMode(): boolean {
    return !!this.siteId;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Site' : 'New Site';
  }

  get pageSubtitle(): string {
    return this.isEditMode
      ? 'Update site ownership, contact, and address details'
      : 'Create a site and link it to an existing customer';
  }

  ngOnInit(): void {
    this.siteId = this.route.snapshot.paramMap.get('id') ?? '';

    this.loadCustomers();

    if (this.siteId) {
      this.loadSite(this.siteId);
    }
  }

  save(): void {
    this.errorMessage = '';

    if (this.siteForm.invalid) {
      this.siteForm.markAllAsTouched();
      return;
    }

    const request = this.buildRequest();

    this.saving = true;

    const saveRequest = this.isEditMode
      ? this.sitesService.updateSite(this.siteId, request)
      : this.sitesService.createSite(request);

    saveRequest.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.router.navigate(['/sites']);
      },
      error: () => {
        this.errorMessage = this.isEditMode
          ? 'Site could not be updated. Please check the form and try again.'
          : 'Site could not be created. Please check the form and try again.';
      }
    });
  }

  isInvalid(controlName: keyof typeof this.siteForm.controls): boolean {
    const control = this.siteForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getFieldError(controlName: keyof typeof this.siteForm.controls): string {
    const control = this.siteForm.controls[controlName] as AbstractControl;

    if (!control.errors || !(control.dirty || control.touched)) {
      return '';
    }

    if (control.errors['required']) {
      return 'This field is required.';
    }

    if (control.errors['email']) {
      return 'Enter a valid email address.';
    }

    if (control.errors['maxlength']) {
      return `Maximum ${control.errors['maxlength'].requiredLength} characters allowed.`;
    }

    if (control.errors['pattern']) {
      return 'Only numbers, spaces, +, -, and brackets are allowed.';
    }

    return 'Invalid value.';
  }

  getCustomerDropdownLabel(customer: CustomerDropdownItem): string {
    return customer.name ?? customer.companyName ?? customer.contactEmail ?? 'Unnamed customer';
  }

  trackByCustomer(_: number, customer: CustomerDropdownItem): string {
    return customer.id;
  }

  private loadCustomers(): void {
    this.customersLoading = true;

    this.sitesService
      .getCustomersForDropdown()
      .pipe(finalize(() => (this.customersLoading = false)))
      .subscribe({
        next: (customers) => {
          this.customers = customers;
        },
        error: () => {
          this.customers = [];
          this.errorMessage = 'Customers could not be loaded for the dropdown. Create a customer first or check the API.';
        }
      });
  }

  private loadSite(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.sitesService
      .getSite(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (site) => this.patchForm(site),
        error: () => {
          this.errorMessage = 'Site could not be loaded. Please check the API and try again.';
        }
      });
  }

  private patchForm(site: SiteDetails): void {
    this.siteForm.patchValue({
      customerId: site.customerId ?? '',
      name: site.name ?? site.siteName ?? '',
      siteCode: site.siteCode ?? site.code ?? '',
      siteType: site.siteType ?? site.type ?? '',
      contactPerson: site.contactPerson ?? '',
      contactEmail: site.contactEmail ?? '',
      contactPhone: site.contactPhone ?? '',
      addressLine1: site.addressLine1 ?? '',
      addressLine2: site.addressLine2 ?? '',
      city: site.city ?? '',
      postcode: site.postcode ?? '',
      country: site.country ?? 'United Kingdom',
      notes: site.notes ?? ''
    });
  }

  private buildRequest(): SiteRequest {
    const value = this.siteForm.getRawValue();

    return {
      customerId: value.customerId,
      name: value.name.trim(),
      siteCode: value.siteCode.trim(),
      siteType: value.siteType.trim(),
      contactPerson: value.contactPerson.trim(),
      contactEmail: value.contactEmail.trim(),
      contactPhone: value.contactPhone.trim(),
      addressLine1: value.addressLine1.trim(),
      addressLine2: value.addressLine2.trim() || undefined,
      city: value.city.trim(),
      postcode: value.postcode.trim(),
      country: value.country.trim(),
      notes: value.notes.trim() || undefined
    };
  }
}
