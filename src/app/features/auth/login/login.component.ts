import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { getApiErrorMessage } from '../../../core/models/api-error.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['admin@voltguard.local', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loading = false;
  errorMessage = '';

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  ngOnInit(): void {
    if (!this.authService.getAccessToken()) {
      return;
    }

    this.authService.refreshSession().subscribe(session => {
      if (session) {
        this.router.navigateByUrl(this.getReturnUrl());
      }
    });
  }

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl(this.getReturnUrl());
      },
      error: error => {
        this.loading = false;
        this.errorMessage = getApiErrorMessage(error, 'Login failed. Please check your email and password.');
      }
    });
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!returnUrl || returnUrl === '/login' || returnUrl.startsWith('/login?')) {
      return '/dashboard';
    }

    return returnUrl;
  }

}
