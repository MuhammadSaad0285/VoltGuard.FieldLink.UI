import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { AssetListItem, CustomerDropdownItem, SiteDropdownItem } from '../asset.models';
import { AssetsService } from '../assets.service';

@Component({
  selector: 'app-assets-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './assets-list.component.html',
  styleUrls: ['./assets-list.component.scss']
})
export class AssetsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assetsService = inject(AssetsService);

  assets: AssetListItem[] = [];
  customers: CustomerDropdownItem[] = [];
  sites: SiteDropdownItem[] = [];

  searchTerm = '';
  selectedCustomerId = '';
  selectedSiteId = '';
  includeInactive = false;

  pageNumber = 1;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];

  totalCount = 0;
  totalPages = 1;
  hasPreviousPage = false;
  hasNextPage = false;

  loading = false;
  customersLoading = false;
  sitesLoading = false;
  actionLoadingId = '';
  openActionMenuId = '';

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadCustomers();
    this.loadAssets();
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

  loadAssets(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.assetsService
      .getAssets({
        searchTerm: this.searchTerm,
        customerId: this.selectedCustomerId,
        siteId: this.selectedSiteId,
        includeInactive: this.includeInactive,
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => {
          this.assets = [];
          this.errorMessage = 'Assets could not be loaded. Please check the API and try again.';
        }
      });
  }

  loadCustomers(): void {
    this.customersLoading = true;

    this.assetsService
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

  loadSites(customerId?: string): void {
    this.sitesLoading = true;

    this.assetsService
      .getSitesForDropdown(customerId)
      .pipe(finalize(() => (this.sitesLoading = false)))
      .subscribe({
        next: (sites) => {
          this.sites = sites;
        },
        error: () => {
          this.sites = [];
        }
      });
  }

  applySearch(): void {
    this.pageNumber = 1;
    this.loadAssets();
  }

  clearFilters(): void {
    if (!this.searchTerm.trim() && !this.selectedCustomerId && !this.selectedSiteId && !this.includeInactive) {
      return;
    }

    this.searchTerm = '';
    this.selectedCustomerId = '';
    this.selectedSiteId = '';
    this.includeInactive = false;
    this.sites = [];
    this.pageNumber = 1;
    this.loadAssets();
  }

  filterByCustomer(customerId: string): void {
    this.selectedCustomerId = customerId;
    this.selectedSiteId = '';
    this.sites = [];
    this.pageNumber = 1;

    if (customerId) {
      this.loadSites(customerId);
    }

    this.loadAssets();
  }

  filterBySite(siteId: string): void {
    this.selectedSiteId = siteId;
    this.pageNumber = 1;
    this.loadAssets();
  }

  toggleIncludeInactive(): void {
    this.pageNumber = 1;
    this.loadAssets();
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value);
    this.pageNumber = 1;
    this.loadAssets();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.closeActionMenu();
    this.pageNumber = page;
    this.loadAssets();
  }

  toggleActionMenu(asset: AssetListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionMenuId = this.openActionMenuId === asset.id ? '' : asset.id;
  }

  keepActionMenuOpen(event: MouseEvent): void {
    event.stopPropagation();
  }

  deactivateAsset(asset: AssetListItem): void {
    this.closeActionMenu();

    const name = this.getAssetName(asset);

    const confirmed = window.confirm(
      `Deactivate/delete asset "${name}"? This action will call the backend delete endpoint.`
    );

    if (!confirmed) {
      return;
    }

    this.actionLoadingId = asset.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.assetsService
      .deleteAsset(asset.id)
      .pipe(finalize(() => (this.actionLoadingId = '')))
      .subscribe({
        next: () => {
          this.successMessage = `Asset "${name}" was deactivated/deleted successfully.`;

          if (this.assets.length === 1 && this.pageNumber > 1) {
            this.pageNumber--;
          }

          this.loadAssets();
        },
        error: () => {
          this.errorMessage = `Asset "${name}" could not be deactivated/deleted.`;
        }
      });
  }

  getAssetName(asset: AssetListItem): string {
    return asset.name ?? asset.assetName ?? 'Unnamed asset';
  }

  getAssetTag(asset: AssetListItem): string {
    return asset.assetTag ?? asset.tag ?? 'No tag';
  }

  getAssetType(asset: AssetListItem): string {
    return asset.assetType ?? asset.type ?? 'Not set';
  }

  getCustomerName(asset: AssetListItem): string {
    return asset.customerName ?? asset.customerCompanyName ?? 'Unknown customer';
  }

  getSiteName(asset: AssetListItem): string {
    return asset.siteName ?? 'Unknown site';
  }

  getLocation(asset: AssetListItem): string {
    return asset.locationDescription ?? asset.location ?? 'No location';
  }

  getManufacturerModel(asset: AssetListItem): string {
    const parts = [asset.manufacturer, asset.model].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Manufacturer/model not set';
  }

  getRating(asset: AssetListItem): string {
    const voltage = asset.ratedVoltage !== null && asset.ratedVoltage !== undefined
      ? `${asset.ratedVoltage} V`
      : '';

    const current = asset.ratedCurrent !== null && asset.ratedCurrent !== undefined
      ? `${asset.ratedCurrent} A`
      : '';

    const parts = [voltage, current].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Not set';
  }

  getRiskLevel(asset: AssetListItem): string {
    return (
      asset.latestRiskLevel ??
      asset.currentRiskLevel ??
      asset.riskLevel ??
      asset.assetRiskLevel ??
      'Unknown'
    );
  }

  getRiskClass(asset: AssetListItem): string {
    const value = this.getRiskLevel(asset).toLowerCase();

    if (value.includes('critical')) {
      return 'badge badge-critical';
    }

    if (value.includes('high')) {
      return 'badge badge-danger';
    }

    if (value.includes('medium') || value.includes('warning')) {
      return 'badge badge-warning';
    }

    if (value.includes('low')) {
      return 'badge badge-success';
    }

    return 'badge badge-muted';
  }

  getStatusLabel(asset: AssetListItem): string {
    return asset.isActive === false ? 'Inactive' : 'Active';
  }

  getStatusClass(asset: AssetListItem): string {
    return asset.isActive === false
      ? 'status-badge status-badge--inactive'
      : 'status-badge status-badge--active';
  }

  getLastTestDate(asset: AssetListItem): string {
    return this.formatDate(
      asset.latestTestDateUtc ??
        asset.lastTestedAtUtc ??
        asset.lastTestDateUtc
    );
  }

  getNextDueDate(asset: AssetListItem): string {
    return this.formatDate(
      asset.nextTestDueAtUtc ??
        asset.nextTestDueUtc ??
        asset.nextTestDueDateUtc ??
        asset.nextRetestDueUtc
    );
  }

  getCustomerDropdownLabel(customer: CustomerDropdownItem): string {
    return customer.name ?? customer.companyName ?? customer.contactEmail ?? 'Unnamed customer';
  }

  getSiteDropdownLabel(site: SiteDropdownItem): string {
    const name = site.name ?? site.siteName ?? 'Unnamed site';
    const code = site.siteCode ?? site.code;

    return code ? `${name} (${code})` : name;
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

  trackByAsset(_: number, asset: AssetListItem): string {
    return asset.id;
  }

  trackByCustomer(_: number, customer: CustomerDropdownItem): string {
    return customer.id;
  }

  trackBySite(_: number, site: SiteDropdownItem): string {
    return site.id;
  }

  private applyResult(result: PagedResult<AssetListItem>): void {
    this.assets = result.items ?? [];
    this.pageNumber = result.pageNumber ?? this.pageNumber;
    this.pageSize = result.pageSize ?? this.pageSize;
    this.totalCount = result.totalCount ?? this.assets.length;
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
