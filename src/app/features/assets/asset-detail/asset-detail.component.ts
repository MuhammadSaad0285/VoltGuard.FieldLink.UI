import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { AuthService } from '../../../core/auth/auth.service';
import { JobListItem } from '../../jobs/job.models';
import { JobsService } from '../../jobs/jobs.service';
import { AssetDetails, AssetTestHistoryItem } from '../asset.models';
import { AssetsService } from '../assets.service';
import { AssetTestHistoryComponent } from '../asset-test-history/asset-test-history.component';

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, AssetTestHistoryComponent],
  templateUrl: './asset-detail.component.html',
  styleUrls: ['./asset-detail.component.scss']
})
export class AssetDetailComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly assetsService = inject(AssetsService);
  private readonly jobsService = inject(JobsService);

  assetId = '';
  asset: AssetDetails | null = null;
  testHistory: AssetTestHistoryItem[] = [];
  jobs: JobListItem[] = [];

  loading = false;
  errorMessage = '';
  historyErrorMessage = '';
  jobsErrorMessage = '';

  ngOnInit(): void {
    this.assetId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.assetId) {
      this.errorMessage = 'Asset id was not found in the route.';
      return;
    }

    this.loadAssetDetails();
  }

  get canCreate(): boolean {
    return this.authService.canCreate;
  }

  get canEdit(): boolean {
    return this.authService.canEdit;
  }

  get canManageJobs(): boolean {
    return this.authService.canViewAdmin;
  }

  loadAssetDetails(): void {
    this.loading = true;
    this.errorMessage = '';
    this.historyErrorMessage = '';
    this.jobsErrorMessage = '';

    forkJoin({
      asset: this.assetsService.getAsset(this.assetId),
      history: this.assetsService.getTestHistory(this.assetId).pipe(
        catchError(() => {
          this.historyErrorMessage = 'Test history could not be loaded.';
          return of([]);
        })
      ),
      jobs: this.jobsService.getJobs({
        assetId: this.assetId,
        pageNumber: 1,
        pageSize: 20
      }).pipe(
        catchError(() => {
          this.jobsErrorMessage = 'Jobs could not be loaded.';
          return of({
            items: [],
            pageNumber: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false
          });
        })
      )
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ asset, history, jobs }) => {
          this.asset = asset;
          this.testHistory = this.sortHistory(history);
          this.jobs = this.sortJobs(jobs.items ?? []);
        },
        error: () => {
          this.asset = null;
          this.testHistory = [];
          this.jobs = [];
          this.errorMessage = 'Asset details could not be loaded. Please check the API and try again.';
        }
      });
  }

  getAssetName(asset: AssetDetails): string {
    return this.readValue(asset, 'name', 'assetName') || 'Unnamed asset';
  }

  getAssetTag(asset: AssetDetails): string {
    return this.readValue(asset, 'assetTag', 'tag') || 'No tag';
  }

  getAssetType(asset: AssetDetails): string {
    return this.readValue(asset, 'assetType', 'type') || 'Not set';
  }

  getCustomerName(asset: AssetDetails): string {
    return this.readValue(asset, 'customerName', 'customerCompanyName') || 'Unknown customer';
  }

  getSiteName(asset: AssetDetails): string {
    return this.readValue(asset, 'siteName') || 'Unknown site';
  }

  getLocation(asset: AssetDetails): string {
    return this.readValue(asset, 'locationDescription', 'location') || 'No location';
  }

  getManufacturerModel(asset: AssetDetails): string {
    const parts = [asset.manufacturer, asset.model].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Manufacturer/model not set';
  }

  getRating(asset: AssetDetails): string {
    const voltage =
      asset.ratedVoltage !== null && asset.ratedVoltage !== undefined
        ? `${asset.ratedVoltage} V`
        : '';

    const current =
      asset.ratedCurrent !== null && asset.ratedCurrent !== undefined
        ? `${asset.ratedCurrent} A`
        : '';

    const parts = [voltage, current].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Not set';
  }

  getRiskLevel(asset: AssetDetails): string {
    return (
      this.readValue(
        asset,
        'latestRiskLevel',
        'currentRiskLevel',
        'riskLevel',
        'assetRiskLevel',
        'calculatedRiskLevel'
      ) || 'Unknown'
    );
  }

  getRiskClass(asset: AssetDetails): string {
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

  getStatusLabel(asset: AssetDetails): string {
    return asset.isActive === false ? 'Inactive' : 'Active';
  }

  getStatusClass(asset: AssetDetails): string {
    return asset.isActive === false
      ? 'status-badge status-badge--inactive'
      : 'status-badge status-badge--active';
  }

  getLatestTestDate(asset: AssetDetails): string {
    return this.formatDate(
      this.readValue(asset, 'latestTestDateUtc', 'lastTestedAtUtc', 'lastTestDateUtc')
    );
  }

  getNextDueDate(asset: AssetDetails): string {
    return this.formatDate(
      this.readValue(
        asset,
        'nextTestDueAtUtc',
        'nextTestDueUtc',
        'nextTestDueDateUtc',
        'nextRetestDueUtc'
      )
    );
  }

  getInstalledDate(asset: AssetDetails): string {
    return this.formatDate(this.readValue(asset, 'installedAtUtc', 'installDateUtc'));
  }

  getLatestTestReference(asset: AssetDetails): string {
    return (
      this.readValue(asset, 'latestTestReference', 'testReference', 'reference', 'reportNumber') ||
      'Not set'
    );
  }

  getLatestResultStatus(asset: AssetDetails): string {
    return (
      this.readValue(asset, 'latestResultStatus', 'latestOverallStatus', 'resultStatus', 'overallStatus') ||
      'Not set'
    );
  }

  getLatestTestResultId(asset: AssetDetails): string {
    return this.readValue(asset, 'latestTestResultId', 'testResultId');
  }

  getJobTitle(job: JobListItem): string {
    return job.title || 'Untitled job';
  }

  getJobType(job: JobListItem): string {
    return job.jobType || 'Not set';
  }

  getJobPriority(job: JobListItem): string {
    return job.priority || 'Medium';
  }

  getJobStatus(job: JobListItem): string {
    return job.status || 'Scheduled';
  }

  getJobAssignee(job: JobListItem): string {
    return job.assignedToName ?? job.assignedToEmail ?? job.assignedToUserName ?? job.assignedTo ?? 'Unassigned';
  }

  getJobDueDate(job: JobListItem): string {
    return this.formatDate(job.dueAtUtc ?? job.dueDateUtc);
  }

  getJobOverdue(job: JobListItem): string {
    const days = job.daysOverdue ?? 0;
    return days > 0 ? `${days} day${days === 1 ? '' : 's'} overdue` : 'On track';
  }

  getJobBadgeClass(value: string | null | undefined): string {
    const normalised = (value ?? '').toLowerCase();

    if (normalised.includes('critical')) {
      return 'badge badge-critical';
    }

    if (normalised.includes('high') || normalised.includes('cancelled')) {
      return 'badge badge-danger';
    }

    if (normalised.includes('medium') || normalised.includes('inprogress')) {
      return 'badge badge-warning';
    }

    if (normalised.includes('completed') || normalised.includes('low')) {
      return 'badge badge-success';
    }

    return 'badge badge-muted';
  }

  trackByJob(index: number, job: JobListItem): string {
    return job.id ?? `${index}`;
  }

  private sortHistory(history: AssetTestHistoryItem[]): AssetTestHistoryItem[] {
    return [...history].sort((a, b) => {
      const aDate = this.getHistoryDateValue(a);
      const bDate = this.getHistoryDateValue(b);

      return bDate - aDate;
    });
  }

  private sortJobs(jobs: JobListItem[]): JobListItem[] {
    return [...jobs].sort((a, b) => {
      const aDate = this.getJobDateValue(a);
      const bDate = this.getJobDateValue(b);

      return bDate - aDate;
    });
  }

  private getJobDateValue(job: JobListItem): number {
    const value = job.dueAtUtc ?? job.dueDateUtc ?? job.scheduledAtUtc ?? job.scheduledDateUtc ?? job.createdAtUtc;
    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  private getHistoryDateValue(test: AssetTestHistoryItem): number {
    const value = this.readValue(test, 'testDateUtc', 'testedAtUtc', 'createdAtUtc');
    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  private readValue(source: unknown, ...keys: string[]): string {
    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record?.[key];

      if (value !== undefined && value !== null && `${value}`.trim()) {
        return `${value}`;
      }
    }

    return '';
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

export { AssetDetailComponent as AssetDetailsComponent };
