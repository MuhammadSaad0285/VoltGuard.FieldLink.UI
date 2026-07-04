import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { PagedResult } from '../../../core/models/paged-result.model';
import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import {
  AssetDropdownItem,
  CustomerDropdownItem,
  JobListItem,
  JobPriority,
  JobStatus,
  JobType,
  SiteDropdownItem
} from '../job.models';
import { JobsService } from '../jobs.service';

type JobAction = 'start' | 'complete' | 'cancel' | 'delete';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './jobs-list.component.html',
  styleUrls: ['./jobs-list.component.scss']
})
export class JobsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly jobsService = inject(JobsService);

  readonly statuses: JobStatus[] = ['Scheduled', 'InProgress', 'Completed', 'Cancelled'];
  readonly priorities: JobPriority[] = ['Low', 'Medium', 'High', 'Critical'];
  readonly jobTypes: JobType[] = ['Inspection', 'Maintenance', 'Repair', 'Retest', 'FollowUp'];

  jobs: JobListItem[] = [];
  customers: CustomerDropdownItem[] = [];
  sites: SiteDropdownItem[] = [];
  assets: AssetDropdownItem[] = [];

  searchTerm = '';
  selectedCustomerId = '';
  selectedSiteId = '';
  selectedAssetId = '';
  selectedStatus = '';
  selectedPriority = '';
  selectedJobType = '';
  overdueOnly = false;

  pageNumber = 1;
  pageSize = 20;
  readonly pageSizeOptions = [5, 10, 20, 50];

  totalCount = 0;
  totalPages = 1;
  hasPreviousPage = false;
  hasNextPage = false;

  loading = false;
  customersLoading = false;
  sitesLoading = false;
  assetsLoading = false;
  actionLoadingKey = '';
  openActionMenuId = '';

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadCustomers();
    this.loadAssets();
    this.loadJobs();
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
    return this.authService.canViewAdmin;
  }

  get canEdit(): boolean {
    return this.authService.canViewAdmin;
  }

  get canDelete(): boolean {
    return this.authService.canDelete;
  }

  loadJobs(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.jobsService
      .getJobs({
        searchTerm: this.searchTerm,
        customerId: this.selectedCustomerId,
        siteId: this.selectedSiteId,
        assetId: this.selectedAssetId,
        status: this.selectedStatus,
        priority: this.selectedPriority,
        jobType: this.selectedJobType,
        overdueOnly: this.overdueOnly,
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => {
          this.jobs = [];
          this.errorMessage = 'Jobs could not be loaded. Please check the API and try again.';
        }
      });
  }

  loadCustomers(): void {
    this.customersLoading = true;

    this.jobsService
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

    this.jobsService
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

    this.jobsService
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
    this.loadJobs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCustomerId = '';
    this.selectedSiteId = '';
    this.selectedAssetId = '';
    this.selectedStatus = '';
    this.selectedPriority = '';
    this.selectedJobType = '';
    this.overdueOnly = false;
    this.sites = [];
    this.pageNumber = 1;
    this.loadAssets();
    this.loadJobs();
  }

  filterByCustomer(customerId: string): void {
    this.selectedCustomerId = customerId;
    this.selectedSiteId = '';
    this.selectedAssetId = '';
    this.sites = [];
    this.pageNumber = 1;

    if (customerId) {
      this.loadSites(customerId);
    }

    this.loadAssets(customerId);
    this.loadJobs();
  }

  filterBySite(siteId: string): void {
    this.selectedSiteId = siteId;
    this.selectedAssetId = '';
    this.pageNumber = 1;
    this.loadAssets(this.selectedCustomerId, siteId);
    this.loadJobs();
  }

  applyFilter(): void {
    this.pageNumber = 1;
    this.loadJobs();
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value);
    this.pageNumber = 1;
    this.loadJobs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.closeActionMenu();
    this.pageNumber = page;
    this.loadJobs();
  }

  toggleActionMenu(job: JobListItem, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.hasAvailableActions(job)) {
      this.closeActionMenu();
      return;
    }

    this.openActionMenuId = this.openActionMenuId === job.id ? '' : job.id;
  }

  keepActionMenuOpen(event: MouseEvent): void {
    event.stopPropagation();
  }

  startJob(job: JobListItem): void {
    this.closeActionMenu();
    this.runAction(job, 'start', () => this.jobsService.startJob(job.id), 'Job started.');
  }

  completeJob(job: JobListItem): void {
    this.closeActionMenu();
    this.runAction(job, 'complete', () => this.jobsService.completeJob(job.id), 'Job completed.');
  }

  cancelJob(job: JobListItem): void {
    const confirmed = window.confirm(`Cancel job "${this.getTitle(job)}"?`);

    if (!confirmed) {
      return;
    }

    this.closeActionMenu();
    this.runAction(job, 'cancel', () => this.jobsService.cancelJob(job.id), 'Job cancelled.');
  }

  deleteJob(job: JobListItem): void {
    const confirmed = window.confirm(`Delete job "${this.getTitle(job)}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    this.closeActionMenu();
    this.runAction(job, 'delete', () => this.jobsService.deleteJob(job.id), 'Job deleted.');
  }

  canStart(job: JobListItem): boolean {
    return this.getStatus(job) === 'Scheduled';
  }

  canComplete(job: JobListItem): boolean {
    const status = this.getStatus(job);
    return status === 'Scheduled' || status === 'InProgress';
  }

  canCancel(job: JobListItem): boolean {
    const status = this.getStatus(job);
    return this.authService.canViewAdmin && status !== 'Completed' && status !== 'Cancelled';
  }

  canEditJob(job: JobListItem): boolean {
    const status = this.getStatus(job);
    return this.canEdit && status !== 'Completed' && status !== 'Cancelled';
  }

  hasAvailableActions(job: JobListItem): boolean {
    return (
      this.canEditJob(job) ||
      this.canStart(job) ||
      this.canComplete(job) ||
      this.canCancel(job) ||
      this.canDelete
    );
  }

  getTitle(job: JobListItem): string {
    return job.title || 'Untitled job';
  }

  getAssetName(job: JobListItem): string {
    return job.assetName || 'Unknown asset';
  }

  getAssetTag(job: JobListItem): string {
    return job.assetTag || 'No tag';
  }

  getCustomerName(job: JobListItem): string {
    return job.customerName ?? job.customerCompanyName ?? 'Unknown customer';
  }

  getSiteName(job: JobListItem): string {
    return job.siteName || 'Unknown site';
  }

  getJobType(job: JobListItem): string {
    return job.jobType || 'Not set';
  }

  getPriority(job: JobListItem): string {
    return job.priority || 'Medium';
  }

  getStatus(job: JobListItem): string {
    return job.status || 'Scheduled';
  }

  getAssignedTo(job: JobListItem): string {
    return job.assignedToName ?? job.assignedToEmail ?? job.assignedToUserName ?? job.assignedTo ?? 'Unassigned';
  }

  getDueDate(job: JobListItem): string {
    return this.formatDate(this.getDueValue(job));
  }

  getDaysOverdue(job: JobListItem): string {
    const days = this.calculateDaysOverdue(job);

    if (days <= 0) {
      return 'On track';
    }

    return `${days} day${days === 1 ? '' : 's'}`;
  }

  getOverdueClass(job: JobListItem): string {
    const days = this.calculateDaysOverdue(job);

    if (days > 14) {
      return 'badge badge-critical';
    }

    if (days > 0) {
      return 'badge badge-danger';
    }

    return 'badge badge-success';
  }

  getPriorityClass(priority: string | null | undefined): string {
    const value = (priority ?? '').toLowerCase();

    if (value === 'critical') {
      return 'badge badge-critical';
    }

    if (value === 'high') {
      return 'badge badge-danger';
    }

    if (value === 'medium') {
      return 'badge badge-warning';
    }

    return 'badge badge-muted';
  }

  getStatusClass(status: string | null | undefined): string {
    const value = (status ?? '').toLowerCase();

    if (value === 'completed') {
      return 'badge badge-success';
    }

    if (value === 'cancelled') {
      return 'badge badge-muted';
    }

    if (value === 'inprogress') {
      return 'badge badge-warning';
    }

    return 'badge badge-info';
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

  trackByJob(_: number, job: JobListItem): string {
    return job.id;
  }

  trackByCustomer(_: number, customer: CustomerDropdownItem): string {
    return customer.id;
  }

  trackBySite(_: number, site: SiteDropdownItem): string {
    return site.id;
  }

  trackByAsset(_: number, asset: AssetDropdownItem): string {
    return asset.id;
  }

  private runAction(
    job: JobListItem,
    action: JobAction,
    request: () => Observable<unknown>,
    successMessage: string
  ): void {
    this.actionLoadingKey = `${action}:${job.id}`;
    this.errorMessage = '';
    this.successMessage = '';

    request()
      .pipe(finalize(() => (this.actionLoadingKey = '')))
      .subscribe({
        next: () => {
          this.successMessage = successMessage;

          if (this.jobs.length === 1 && this.pageNumber > 1 && action === 'delete') {
            this.pageNumber--;
          }

          this.loadJobs();
        },
        error: () => {
          this.errorMessage = `Job "${this.getTitle(job)}" could not be updated.`;
        }
      });
  }

  private applyResult(result: PagedResult<JobListItem>): void {
    this.jobs = result.items ?? [];
    this.pageNumber = result.pageNumber ?? this.pageNumber;
    this.pageSize = result.pageSize ?? this.pageSize;
    this.totalCount = result.totalCount ?? this.jobs.length;
    this.totalPages = result.totalPages ?? this.totalPages;
    this.hasPreviousPage = result.hasPreviousPage ?? this.pageNumber > 1;
    this.hasNextPage = result.hasNextPage ?? this.pageNumber < this.totalPages;
  }

  private calculateDaysOverdue(job: JobListItem): number {
    if (typeof job.daysOverdue === 'number') {
      return Math.max(0, job.daysOverdue);
    }

    if (job.isOverdue === false) {
      return 0;
    }

    const dueValue = this.getDueValue(job);

    if (!dueValue || this.getStatus(job) === 'Completed' || this.getStatus(job) === 'Cancelled') {
      return 0;
    }

    const dueDate = this.parseDate(dueValue);

    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000));
  }

  private getDueValue(job: JobListItem): string | null | undefined {
    return job.dueAtUtc ?? job.dueDateUtc;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not set';
    }

    const date = this.parseDate(value);

    if (!date || Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium'
    }).format(date);
  }

  private parseDate(value: string): Date | null {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (dateOnlyMatch) {
      return new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      );
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
