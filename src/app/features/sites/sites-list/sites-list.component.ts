import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { CustomerDropdownItem, SiteListItem } from '../site.models';
import { SitesService } from '../sites.service';

@Component({
  selector: 'app-sites-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './sites-list.component.html',
  styleUrls: ['./sites-list.component.scss']
})
export class SitesListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly sitesService = inject(SitesService);

  sites: SiteListItem[] = [];
  customers: CustomerDropdownItem[] = [];

  searchTerm = '';
  selectedCustomerId = '';

  pageNumber = 1;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];

  totalCount = 0;
  totalPages = 1;
  hasPreviousPage = false;
  hasNextPage = false;

  loading = false;
  customersLoading = false;
  actionLoadingId = '';
  openActionMenuId = '';

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadCustomers();
    this.loadSites();
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

  loadSites(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.sitesService
      .getSites({
        searchTerm: this.searchTerm,
        customerId: this.selectedCustomerId,
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => {
          this.sites = [];
          this.errorMessage = 'Sites could not be loaded. Please check the API and try again.';
        }
      });
  }

  loadCustomers(): void {
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
        }
      });
  }

  applySearch(): void {
    this.pageNumber = 1;
    this.loadSites();
  }

  clearSearch(): void {
    if (!this.searchTerm.trim() && !this.selectedCustomerId) {
      return;
    }

    this.searchTerm = '';
    this.selectedCustomerId = '';
    this.pageNumber = 1;
    this.loadSites();
  }

  filterByCustomer(customerId: string): void {
    this.selectedCustomerId = customerId;
    this.pageNumber = 1;
    this.loadSites();
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value);
    this.pageNumber = 1;
    this.loadSites();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.closeActionMenu();
    this.pageNumber = page;
    this.loadSites();
  }

  toggleActionMenu(site: SiteListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === site.id ? '' : site.id;
  }

  keepActionMenuOpen(event: MouseEvent): void {
    event.stopPropagation();
  }

  deactivateSite(site: SiteListItem): void {
    this.closeActionMenu();

    const name = this.getSiteName(site);

    const confirmed = window.confirm(
      `Deactivate/delete site "${name}"? This action will call the backend delete endpoint.`
    );

    if (!confirmed) {
      return;
    }

    this.actionLoadingId = site.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.sitesService
      .deleteSite(site.id)
      .pipe(finalize(() => (this.actionLoadingId = '')))
      .subscribe({
        next: () => {
          this.successMessage = `Site "${name}" was deactivated/deleted successfully.`;

          if (this.sites.length === 1 && this.pageNumber > 1) {
            this.pageNumber--;
          }

          this.loadSites();
        },
        error: () => {
          this.errorMessage = `Site "${name}" could not be deactivated/deleted.`;
        }
      });
  }

  getSiteName(site: SiteListItem): string {
    return site.name ?? site.siteName ?? 'Unnamed site';
  }

  getCustomerName(site: SiteListItem): string {
    return site.customerName ?? site.customerCompanyName ?? 'Unknown customer';
  }

  getSiteCode(site: SiteListItem): string {
    return site.siteCode ?? site.code ?? 'No code';
  }

  getSiteType(site: SiteListItem): string {
    return site.siteType ?? site.type ?? 'Not set';
  }

  getContactEmail(site: SiteListItem): string {
    return site.contactEmail || 'No email';
  }

  getContactPhone(site: SiteListItem): string {
    return site.contactPhone || 'No phone';
  }

  getLocation(site: SiteListItem): string {
    const parts = [site.city, site.postcode, site.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'No location';
  }

  getAssetsCount(site: SiteListItem): number {
    return site.assetsCount ?? site.assetCount ?? 0;
  }

  getStatusLabel(site: SiteListItem): string {
    return site.isActive === false ? 'Inactive' : 'Active';
  }

  getStatusClass(site: SiteListItem): string {
    return site.isActive === false
      ? 'status-badge status-badge--inactive'
      : 'status-badge status-badge--active';
  }

  getCreatedDate(site: SiteListItem): string {
    return this.formatDate(site.createdAtUtc);
  }

  getCustomerDropdownLabel(customer: CustomerDropdownItem): string {
    return customer.name ?? customer.companyName ?? customer.contactEmail ?? 'Unnamed customer';
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

  trackBySite(_: number, site: SiteListItem): string {
    return site.id;
  }

  trackByCustomer(_: number, customer: CustomerDropdownItem): string {
    return customer.id;
  }

  private applyResult(result: PagedResult<SiteListItem>): void {
    this.sites = result.items ?? [];
    this.pageNumber = result.pageNumber ?? this.pageNumber;
    this.pageSize = result.pageSize ?? this.pageSize;
    this.totalCount = result.totalCount ?? this.sites.length;
    this.totalPages = result.totalPages ?? this.totalPages;
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
