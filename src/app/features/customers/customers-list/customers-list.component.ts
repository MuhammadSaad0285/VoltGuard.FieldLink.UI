import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { CustomerListItem } from '../customer.models';
import { CustomersService } from '../customers.service';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './customers-list.component.html',
  styleUrls: ['./customers-list.component.scss']
})
export class CustomersListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly customersService = inject(CustomersService);

  customers: CustomerListItem[] = [];

  searchTerm = '';
  pageNumber = 1;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];

  totalCount = 0;
  totalPages = 1;
  hasPreviousPage = false;
  hasNextPage = false;

  loading = false;
  actionLoadingId = '';
  openActionMenuId = '';
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadCustomers();
  }

  @HostListener('document:click')
  closeActionMenu(): void {
    this.openActionMenuId = '';
  }

  @HostListener('document:keydown.escape')
  closeActionMenuOnEscape(): void {
    this.closeActionMenu();
  }

  get canCreate(): boolean {
    return this.authService.canCreate;
  }

  get canEdit(): boolean {
    return this.authService.canEdit;
  }

  get canDelete(): boolean {
    return this.authService.canDelete;
  }

  loadCustomers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.customersService
      .getCustomers({
        searchTerm: this.searchTerm,
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => {
          this.customers = [];
          this.errorMessage = 'Customers could not be loaded. Please check the API and try again.';
        }
      });
  }

  applySearch(): void {
    this.pageNumber = 1;
    this.loadCustomers();
  }

  clearSearch(): void {
    if (!this.searchTerm.trim()) {
      return;
    }

    this.searchTerm = '';
    this.pageNumber = 1;
    this.loadCustomers();
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value);
    this.pageNumber = 1;
    this.loadCustomers();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.closeActionMenu();
    this.pageNumber = page;
    this.loadCustomers();
  }

  toggleActionMenu(customer: CustomerListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === customer.id ? '' : customer.id;
  }

  keepActionMenuOpen(event: MouseEvent): void {
    event.stopPropagation();
  }

  deactivateCustomer(customer: CustomerListItem): void {
    this.closeActionMenu();

    const name = this.getCustomerName(customer);

    const confirmed = window.confirm(
      `Deactivate/delete customer "${name}"? This action will call the backend delete endpoint.`
    );

    if (!confirmed) {
      return;
    }

    this.actionLoadingId = customer.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.customersService
      .deleteCustomer(customer.id)
      .pipe(finalize(() => (this.actionLoadingId = '')))
      .subscribe({
        next: () => {
          this.successMessage = `Customer "${name}" was deactivated/deleted successfully.`;

          if (this.customers.length === 1 && this.pageNumber > 1) {
            this.pageNumber--;
          }

          this.loadCustomers();
        },
        error: () => {
          this.errorMessage = `Customer "${name}" could not be deactivated/deleted.`;
        }
      });
  }

  getCustomerName(customer: CustomerListItem): string {
    return customer.name ?? customer.companyName ?? 'Unnamed customer';
  }

  getContactEmail(customer: CustomerListItem): string {
    return customer.contactEmail || 'No email';
  }

  getContactPhone(customer: CustomerListItem): string {
    return customer.contactPhone || 'No phone';
  }

  getLocation(customer: CustomerListItem): string {
    const parts = [customer.city, customer.postcode, customer.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'No location';
  }

  getSitesCount(customer: CustomerListItem): number {
    return customer.sitesCount ?? customer.siteCount ?? 0;
  }

  getAssetsCount(customer: CustomerListItem): number {
    return customer.assetsCount ?? customer.assetCount ?? 0;
  }

  getStatusLabel(customer: CustomerListItem): string {
    return customer.isActive === false ? 'Inactive' : 'Active';
  }

  getStatusClass(customer: CustomerListItem): string {
    return customer.isActive === false ? 'status-badge status-badge--inactive' : 'status-badge status-badge--active';
  }

  getCreatedDate(customer: CustomerListItem): string {
    return this.formatDate(customer.createdAtUtc);
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

  trackByCustomer(_: number, customer: CustomerListItem): string {
    return customer.id;
  }

  private applyResult(result: PagedResult<CustomerListItem>): void {
    this.customers = result.items ?? [];
    this.pageNumber = result.pageNumber ?? this.pageNumber;
    this.pageSize = result.pageSize ?? this.pageSize;
    this.totalCount = result.totalCount ?? this.customers.length;
    this.totalPages = Math.max(1, result.totalPages ?? 1);
    this.hasPreviousPage = result.hasPreviousPage ?? this.pageNumber > 1;
    this.hasNextPage = result.hasNextPage ?? this.pageNumber < this.totalPages;
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
