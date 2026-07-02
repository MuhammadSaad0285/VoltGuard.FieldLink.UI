import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { AdminUserDetails } from './admin-user.models';
import { AdminUsersService } from './admin-users.service';

@Component({
  selector: 'app-admin-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './admin-user-form.component.html',
  styleUrls: ['./admin-user-form.component.scss']
})
export class AdminUserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminUsersService = inject(AdminUsersService);

  readonly userForm = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
      password: ['', [Validators.maxLength(128)]],
      roles: this.fb.nonNullable.control<string[]>([], [this.atLeastOneRoleValidator()]),
      isActive: [true]
    }
  );

  userId = '';
  roles: string[] = ['Admin', 'Engineer'];
  loading = false;
  saving = false;
  errorMessage = '';

  get isEditMode(): boolean {
    return !!this.userId;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit User' : 'New User';
  }

  get pageSubtitle(): string {
    return this.isEditMode
      ? 'Update user identity, role membership, and account status'
      : 'Create a workspace user and assign their initial role access';
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') ?? '';
    this.configurePasswordValidators();
    this.loadRoles();

    if (this.userId) {
      this.loadUser(this.userId);
    }
  }

  save(): void {
    this.errorMessage = '';

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving = true;

    const value = this.userForm.getRawValue();
    const baseRequest = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      roles: value.roles,
      isActive: value.isActive
    };

    const saveRequest = this.isEditMode
      ? this.adminUsersService.updateUser(this.userId, baseRequest)
      : this.adminUsersService.createUser({
          ...baseRequest,
          password: value.password.trim()
        });

    saveRequest.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.router.navigate(['/admin/users']);
      },
      error: () => {
        this.errorMessage = this.isEditMode
          ? 'User could not be updated. Please check the form and try again.'
          : 'User could not be created. Please check the form and try again.';
      }
    });
  }

  isInvalid(controlName: keyof typeof this.userForm.controls): boolean {
    const control = this.userForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  isRoleSelected(role: string): boolean {
    return this.userForm.controls.roles.value.includes(role);
  }

  toggleRole(role: string, checked: boolean): void {
    const currentRoles = this.userForm.controls.roles.value;
    const roles = checked
      ? Array.from(new Set([...currentRoles, role]))
      : currentRoles.filter((currentRole) => currentRole !== role);

    this.userForm.controls.roles.setValue(roles);
    this.userForm.controls.roles.markAsTouched();
  }

  getFieldError(controlName: keyof typeof this.userForm.controls): string {
    const control = this.userForm.controls[controlName] as AbstractControl;

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

    if (control.errors['atLeastOneRole']) {
      return 'Select at least one role.';
    }

    return 'Invalid value.';
  }

  private configurePasswordValidators(): void {
    const passwordControl = this.userForm.controls.password;

    if (this.isEditMode) {
      passwordControl.clearValidators();
      passwordControl.addValidators([Validators.maxLength(128)]);
    } else {
      passwordControl.addValidators([Validators.required, Validators.maxLength(128)]);
    }

    passwordControl.updateValueAndValidity();
  }

  private loadRoles(): void {
    this.adminUsersService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
      }
    });
  }

  private loadUser(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminUsersService
      .getUser(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (user) => this.patchForm(user),
        error: () => {
          this.errorMessage = 'User could not be loaded. Please check the API and try again.';
        }
      });
  }

  private patchForm(user: AdminUserDetails): void {
    this.userForm.patchValue({
      fullName: user.fullName ?? user.userName ?? '',
      email: user.email ?? '',
      password: '',
      roles: user.roles ?? [],
      isActive: user.isActive
    });
  }

  private atLeastOneRoleValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const roles = control.value as string[] | null;
      return roles?.length ? null : { atLeastOneRole: true };
    };
  }
}
