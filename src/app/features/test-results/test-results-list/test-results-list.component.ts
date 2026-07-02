import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  AssetDropdownItem,
  CustomerDropdownItem,
  SiteDropdownItem,
  TestResultListItem
} from '../test-result.models';
import { TestResultsService } from '../test-results.service';

@Component({
  selector: 'app-test-results-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ConfirmDialogComponent],
  templateUrl: './test-results-list.component.html',
  styleUrls: ['./test-results-list.component.scss']
})
export class TestResultsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly testResultsService = inject(TestResultsService);

  testResults: TestResultListItem[] = [];
  customers: CustomerDropdownItem[] = [];
  sites: SiteDropdownItem[] = [];
  assets: AssetDropdownItem[] = [];

  searchTerm = '';
  selectedCustomerId = '';
  selectedSiteId = '';
  selectedAssetId = '';
  selectedStatus = '';
  selectedRiskLevel = '';
  dateFrom = '';
  dateTo = '';

  pageNumber = 1;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];

  readonly statusOptions = ['Pass', 'Warning', 'Fail'];
  readonly riskOptions = ['Low', 'Medium', 'High', 'Critical', 'Unknown'];

  totalCount = 0;
  totalPages = 1;
  hasPreviousPage = false;
  hasNextPage = false;

  loading = false;
  customersLoading = false;
  sitesLoading = false;
  assetsLoading = false;
  actionLoadingId = '';
  reportLoadingId = '';
  openActionMenuId = '';
  pendingDeleteResult: TestResultListItem | null = null;

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadCustomers();
    this.loadTestResults();
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

  get canDelete(): boolean {
    return this.authService.canDelete;
  }

  loadTestResults(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.testResultsService
      .getTestResults({
        searchTerm: this.searchTerm,
        customerId: this.selectedCustomerId,
        siteId: this.selectedSiteId,
        assetId: this.selectedAssetId,
        status: this.selectedStatus,
        riskLevel: this.selectedRiskLevel,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => {
          this.testResults = [];
          this.errorMessage = 'Test results could not be loaded. Please check the API and try again.';
        }
      });
  }

  loadCustomers(): void {
    this.customersLoading = true;

    this.testResultsService
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

    this.testResultsService
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

  loadAssets(customerId?: string, siteId?: string): void {
    this.assetsLoading = true;

    this.testResultsService
      .getAssetsForDropdown(customerId, siteId)
      .pipe(finalize(() => (this.assetsLoading = false)))
      .subscribe({
        next: (assets) => {
          this.assets = assets;
        },
        error: () => {
          this.assets = [];
        }
      });
  }

  applySearch(): void {
    this.pageNumber = 1;
    this.loadTestResults();
  }

  clearFilters(): void {
    if (
      !this.searchTerm.trim() &&
      !this.selectedCustomerId &&
      !this.selectedSiteId &&
      !this.selectedAssetId &&
      !this.selectedStatus &&
      !this.selectedRiskLevel &&
      !this.dateFrom &&
      !this.dateTo
    ) {
      return;
    }

    this.searchTerm = '';
    this.selectedCustomerId = '';
    this.selectedSiteId = '';
    this.selectedAssetId = '';
    this.selectedStatus = '';
    this.selectedRiskLevel = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.sites = [];
    this.assets = [];
    this.pageNumber = 1;
    this.loadTestResults();
  }

  filterByCustomer(customerId: string): void {
    this.selectedCustomerId = customerId;
    this.selectedSiteId = '';
    this.selectedAssetId = '';
    this.sites = [];
    this.assets = [];
    this.pageNumber = 1;

    if (customerId) {
      this.loadSites(customerId);
      this.loadAssets(customerId);
    }

    this.loadTestResults();
  }

  filterBySite(siteId: string): void {
    this.selectedSiteId = siteId;
    this.selectedAssetId = '';
    this.assets = [];
    this.pageNumber = 1;

    if (siteId || this.selectedCustomerId) {
      this.loadAssets(this.selectedCustomerId, siteId);
    }

    this.loadTestResults();
  }

  filterByAsset(assetId: string): void {
    this.selectedAssetId = assetId;
    this.pageNumber = 1;
    this.loadTestResults();
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.pageNumber = 1;
    this.loadTestResults();
  }

  filterByRisk(riskLevel: string): void {
    this.selectedRiskLevel = riskLevel;
    this.pageNumber = 1;
    this.loadTestResults();
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value);
    this.pageNumber = 1;
    this.loadTestResults();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.closeActionMenu();
    this.pageNumber = page;
    this.loadTestResults();
  }

  toggleActionMenu(result: TestResultListItem, event: MouseEvent): void {
    event.stopPropagation();

    const id = this.getTestResultId(result);
    this.openActionMenuId = this.openActionMenuId === id ? '' : id;
  }

  keepActionMenuOpen(event: MouseEvent): void {
    event.stopPropagation();
  }

  deleteTestResult(result: TestResultListItem): void {
    this.closeActionMenu();

    const id = this.getTestResultId(result);

    if (!id) {
      this.errorMessage = 'This test result has no id, so it cannot be deleted.';
      return;
    }

    this.pendingDeleteResult = result;
  }

  cancelDelete(): void {
    if (this.actionLoadingId) {
      return;
    }

    this.pendingDeleteResult = null;
  }

  confirmDelete(): void {
    if (!this.pendingDeleteResult) {
      return;
    }

    const id = this.getTestResultId(this.pendingDeleteResult);
    const reference = this.getTestReference(this.pendingDeleteResult);

    if (!id) {
      this.pendingDeleteResult = null;
      this.errorMessage = 'This test result has no id, so it cannot be deleted.';
      return;
    }

    this.actionLoadingId = id;
    this.errorMessage = '';
    this.successMessage = '';

    this.testResultsService
      .deleteTestResult(id)
      .pipe(finalize(() => (this.actionLoadingId = '')))
      .subscribe({
        next: () => {
          this.successMessage = `Test result "${reference}" was deleted successfully.`;
          this.pendingDeleteResult = null;

          if (this.testResults.length === 1 && this.pageNumber > 1) {
            this.pageNumber--;
          }

          this.loadTestResults();
        },
        error: () => {
          this.errorMessage = `Test result "${reference}" could not be deleted.`;
        }
      });
  }

  downloadReport(result: TestResultListItem): void {
    this.closeActionMenu();

    const id = this.getTestResultId(result);
    const reference = this.getTestReference(result);

    if (!id) {
      this.errorMessage = 'This test result has no id, so the report cannot be generated.';
      return;
    }

    this.reportLoadingId = id;
    this.errorMessage = '';
    this.successMessage = '';

    this.testResultsService
      .downloadReport(id)
      .pipe(finalize(() => (this.reportLoadingId = '')))
      .subscribe({
        next: (blob) => {
          this.saveBlob(blob, `${this.cleanFileName(reference)}.pdf`);
          this.successMessage = `Report downloaded for "${reference}".`;
        },
        error: () => {
          this.errorMessage = `Report could not be downloaded for "${reference}".`;
        }
      });
  }

  getTestResultId(result: TestResultListItem): string {
    return result.id ?? result.testResultId ?? '';
  }

  getTestReference(result: TestResultListItem): string {
    const id = this.getTestResultId(result);
    return result.testReference || result.reference || result.reportNumber || id || 'Test result';
  }

  getAssetName(result: TestResultListItem): string {
    return result.assetName ?? 'Unknown asset';
  }

  getAssetTag(result: TestResultListItem): string {
    return result.assetTag ?? 'No tag';
  }

  getCustomerName(result: TestResultListItem): string {
    return result.customerName ?? result.customerCompanyName ?? 'Unknown customer';
  }

  getSiteName(result: TestResultListItem): string {
    return result.siteName ?? 'Unknown site';
  }

  getTestType(result: TestResultListItem): string {
    return result.testType ?? 'Not set';
  }

  getTestDate(result: TestResultListItem): string {
    return this.formatDateTime(result.testDateUtc ?? result.testedAtUtc ?? result.createdAtUtc);
  }

  getEngineerName(result: TestResultListItem): string {
    return result.engineerName ?? result.engineerEmail ?? 'Not set';
  }

  getStatus(result: TestResultListItem): string {
    return result.status ?? result.resultStatus ?? result.overallStatus ?? 'Unknown';
  }

  getRiskLevel(result: TestResultListItem): string {
    return result.riskLevel ?? result.assetRiskLevel ?? result.calculatedRiskLevel ?? 'Unknown';
  }

  getMeasurementCount(result: TestResultListItem): number {
    return result.measurementsCount ?? result.measurementCount ?? 0;
  }

  getStatusClass(value: string | null | undefined): string {
    const normalised = (value ?? 'unknown').toLowerCase();

    if (normalised.includes('fail')) {
      return 'badge badge-danger';
    }

    if (normalised.includes('warning')) {
      return 'badge badge-warning';
    }

    if (normalised.includes('pass')) {
      return 'badge badge-success';
    }

    return 'badge badge-muted';
  }

  getRiskClass(value: string | null | undefined): string {
    const normalised = (value ?? 'unknown').toLowerCase();

    if (normalised.includes('critical')) {
      return 'badge badge-critical';
    }

    if (normalised.includes('high')) {
      return 'badge badge-danger';
    }

    if (normalised.includes('medium') || normalised.includes('warning')) {
      return 'badge badge-warning';
    }

    if (normalised.includes('low')) {
      return 'badge badge-success';
    }

    return 'badge badge-muted';
  }

  getCustomerDropdownLabel(customer: CustomerDropdownItem): string {
    return customer.name ?? customer.companyName ?? customer.customerName ?? customer.contactEmail ?? 'Unnamed customer';
  }

  getSiteDropdownLabel(site: SiteDropdownItem): string {
    const name = site.name ?? site.siteName ?? 'Unnamed site';
    const code = site.siteCode ?? site.code;

    return code ? `${name} (${code})` : name;
  }

  getAssetDropdownLabel(asset: AssetDropdownItem): string {
    const name = asset.name ?? asset.assetName ?? 'Unnamed asset';
    const tag = asset.assetTag ?? asset.tag;

    return tag ? `${name} (${tag})` : name;
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

  trackByTestResult = (_: number, result: TestResultListItem): string => {
    return this.getTestResultId(result);
  };

  trackByCustomer(_: number, customer: CustomerDropdownItem): string {
    return customer.id;
  }

  trackBySite(_: number, site: SiteDropdownItem): string {
    return site.id;
  }

  trackByAsset(_: number, asset: AssetDropdownItem): string {
    return asset.id;
  }

  private applyResult(result: PagedResult<TestResultListItem>): void {
    this.testResults = result.items ?? [];
    this.pageNumber = result.pageNumber ?? this.pageNumber;
    this.pageSize = result.pageSize ?? this.pageSize;
    this.totalCount = result.totalCount ?? this.testResults.length;
    this.totalPages = Math.max(1, result.totalPages ?? 1);
    this.hasPreviousPage = result.hasPreviousPage ?? this.pageNumber > 1;
    this.hasNextPage = result.hasNextPage ?? this.pageNumber < this.totalPages;
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    window.URL.revokeObjectURL(url);
  }

  private cleanFileName(value: string): string {
    return (value || 'test-result-report')
      .replace(/[^a-z0-9\-_.]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Not set';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }
}

