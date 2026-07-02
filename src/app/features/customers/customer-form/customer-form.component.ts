import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { CustomerDetails, CustomerRequest } from '../customer.models';
import { CustomersService } from '../customers.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss']
})
export class CustomerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customersService = inject(CustomersService);

  readonly customerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
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

  customerId = '';
  loading = false;
  saving = false;
  errorMessage = '';

  get isEditMode(): boolean {
    return !!this.customerId;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Customer' : 'New Customer';
  }

  get pageSubtitle(): string {
    return this.isEditMode
      ? 'Update customer contact and address details'
      : 'Create a customer before adding sites, assets, and test results';
  }

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id') ?? '';

    if (this.customerId) {
      this.loadCustomer(this.customerId);
    }
  }

  save(): void {
    this.errorMessage = '';

    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const request = this.buildRequest();

    this.saving = true;

    const saveRequest = this.isEditMode
      ? this.customersService.updateCustomer(this.customerId, request)
      : this.customersService.createCustomer(request);

    saveRequest.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.router.navigate(['/customers']);
      },
      error: () => {
        this.errorMessage = this.isEditMode
          ? 'Customer could not be updated. Please check the form and try again.'
          : 'Customer could not be created. Please check the form and try again.';
      }
    });
  }

  isInvalid(controlName: keyof typeof this.customerForm.controls): boolean {
    const control = this.customerForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getFieldError(controlName: keyof typeof this.customerForm.controls): string {
    const control = this.customerForm.controls[controlName] as AbstractControl;

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

  private loadCustomer(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.customersService
      .getCustomer(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (customer) => this.patchForm(customer),
        error: () => {
          this.errorMessage = 'Customer could not be loaded. Please check the API and try again.';
        }
      });
  }

  private patchForm(customer: CustomerDetails): void {
    this.customerForm.patchValue({
      name: customer.name ?? customer.companyName ?? '',
      contactPerson: customer.contactPerson ?? '',
      contactEmail: customer.contactEmail ?? '',
      contactPhone: customer.contactPhone ?? '',
      addressLine1: customer.addressLine1 ?? '',
      addressLine2: customer.addressLine2 ?? '',
      city: customer.city ?? '',
      postcode: customer.postcode ?? '',
      country: customer.country ?? 'United Kingdom',
      notes: customer.notes ?? ''
    });
  }

  private buildRequest(): CustomerRequest {
    const value = this.customerForm.getRawValue();

    return {
      name: value.name.trim(),
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
