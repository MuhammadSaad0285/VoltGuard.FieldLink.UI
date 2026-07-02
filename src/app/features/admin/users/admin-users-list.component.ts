import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result.model';
import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { AdminUserListItem } from './admin-user.models';
import { AdminUsersService } from './admin-users.service';

type ActiveFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './admin-users-list.component.html',
  styleUrls: ['./admin-users-list.component.scss']
})
export class AdminUsersListComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);

  users: AdminUserListItem[] = [];
  roles: string[] = ['Admin', 'Engineer'];

  searchTerm = '';
  selectedRole = '';
  activeFilter: ActiveFilter = 'all';
  pageNumber = 1;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];

  totalCount = 0;
  totalPages = 1;
  hasPreviousPage = false;
  hasNextPage = false;

  loading = false;
  actionLoadingId = '';
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminUsersService
      .getUsers({
        searchTerm: this.searchTerm,
        role: this.selectedRole,
        isActive: this.getIsActiveFilter(),
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: (error) => this.handleLoadError(error)
      });
  }

  handleLoadError(error: unknown): void {
    this.users = [];

    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.errorMessage = 'The Admin users API is not available at /api/admin/users yet.';
      return;
    }

    this.errorMessage = 'Users could not be loaded. Please check the API and try again.';
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    if (!this.searchTerm.trim() && !this.selectedRole && this.activeFilter === 'all') {
      return;
    }

    this.searchTerm = '';
    this.selectedRole = '';
    this.activeFilter = 'all';
    this.pageNumber = 1;
    this.loadUsers();
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value);
    this.pageNumber = 1;
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.pageNumber = page;
    this.loadUsers();
  }

  activateUser(user: AdminUserListItem): void {
    this.runStatusAction(user, true);
  }

  deactivateUser(user: AdminUserListItem): void {
    this.runStatusAction(user, false);
  }

  resetPassword(user: AdminUserListItem): void {
    const newPassword = window.prompt(`Enter a new password for ${this.getDisplayName(user)}.`);

    if (!newPassword) {
      return;
    }

    if (newPassword.trim().length === 0) {
      this.errorMessage = 'Password cannot be blank.';
      return;
    }

    this.actionLoadingId = user.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminUsersService
      .resetPassword(user.id, { newPassword })
      .pipe(finalize(() => (this.actionLoadingId = '')))
      .subscribe({
        next: () => {
          this.successMessage = `Password reset for ${this.getDisplayName(user)}.`;
        },
        error: () => {
          this.errorMessage = `Password could not be reset for ${this.getDisplayName(user)}.`;
        }
      });
  }

  getDisplayName(user: AdminUserListItem): string {
    return user.fullName || user.userName || user.email;
  }

  getRolesLabel(user: AdminUserListItem): string {
    return user.roles?.length ? user.roles.join(', ') : 'No roles';
  }

  getStatusLabel(user: AdminUserListItem): string {
    return user.isActive ? 'Active' : 'Inactive';
  }

  getStatusClass(user: AdminUserListItem): string {
    return user.isActive ? 'status-badge status-badge--active' : 'status-badge status-badge--inactive';
  }

  getCreatedDate(user: AdminUserListItem): string {
    return this.formatDate(user.createdAtUtc);
  }

  getLastLoginDate(user: AdminUserListItem): string {
    return this.formatDate(user.lastLoginAtUtc);
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const total = Math.max(1, this.totalPages);
    const start = Math.max(1, this.pageNumber - 2);
    const end = Math.min(total, this.pageNumber + 2);

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  }

  trackByUser(_: number, user: AdminUserListItem): string {
    return user.id;
  }

  private loadRoles(): void {
    this.adminUsersService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
      }
    });
  }

  private runStatusAction(user: AdminUserListItem, activate: boolean): void {
    const action = activate ? 'activate' : 'deactivate';
    const confirmed = window.confirm(`${activate ? 'Activate' : 'Deactivate'} ${this.getDisplayName(user)}?`);

    if (!confirmed) {
      return;
    }

    this.actionLoadingId = user.id;
    this.errorMessage = '';
    this.successMessage = '';

    const request = activate
      ? this.adminUsersService.activateUser(user.id)
      : this.adminUsersService.deactivateUser(user.id);

    request.pipe(finalize(() => (this.actionLoadingId = ''))).subscribe({
      next: () => {
        this.successMessage = `${this.getDisplayName(user)} was ${activate ? 'activated' : 'deactivated'}.`;
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = `${this.getDisplayName(user)} could not be ${action}d.`;
      }
    });
  }

  private applyResult(result: PagedResult<AdminUserListItem>): void {
    this.users = result.items ?? [];
    this.pageNumber = result.pageNumber ?? this.pageNumber;
    this.pageSize = result.pageSize ?? this.pageSize;
    this.totalCount = result.totalCount ?? this.users.length;
    this.totalPages = Math.max(1, result.totalPages ?? 1);
    this.hasPreviousPage = result.hasPreviousPage ?? this.pageNumber > 1;
    this.hasNextPage = result.hasNextPage ?? this.pageNumber < this.totalPages;
  }

  private getIsActiveFilter(): boolean | null {
    if (this.activeFilter === 'active') {
      return true;
    }

    if (this.activeFilter === 'inactive') {
      return false;
    }

    return null;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not set';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium'
    }).format(date);
  }
}
