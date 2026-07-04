import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ReportDownloadService } from '../../core/services/report-download.service';
import { PageHeaderComponent } from '../../layout/page-header/page-header.component';
import { AssetDueForRetest, DashboardSummary, PriorityJob, RecentFailedTest } from './dashboard.models';
import { DashboardService } from './dashboard.service';

interface SummaryCard {
  title: string;
  value: number;
  helper: string;
  accent: string;
  tone: 'default' | 'success' | 'warning' | 'danger' | 'critical';
}

interface DistributionSegment {
  label: string;
  value: number;
  percent: number;
  tone: 'success' | 'warning' | 'danger' | 'critical' | 'muted';
}

interface ActionMetric {
  label: string;
  value: number;
  helper: string;
  tone: 'danger' | 'warning' | 'default';
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss']
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly reportDownloadService = inject(ReportDownloadService);
  private readonly tableRowLimit = 5;

  summary: DashboardSummary | null = null;
  cards: SummaryCard[] = [];

  loading = false;
  errorMessage = '';
  reportLoadingId = '';

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reportLoadingId = '';

    this.dashboardService
      .getSummary()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (summary) => {
          this.summary = this.normalizeSummary(summary);
          this.cards = this.buildCards(this.summary);
        },
        error: () => {
          this.errorMessage = 'Dashboard summary could not be loaded. Please check the API and try again.';
        }
      });
  }

  getVisibleFailedTests(summary: DashboardSummary): RecentFailedTest[] {
    return (summary.recentFailedTests ?? []).slice(0, this.tableRowLimit);
  }

  getVisibleAssetsDueForRetest(summary: DashboardSummary): AssetDueForRetest[] {
    return (summary.assetsDueForRetest ?? []).slice(0, this.tableRowLimit);
  }

  getVisiblePriorityJobs(summary: DashboardSummary): PriorityJob[] {
    return (summary.priorityJobs ?? []).slice(0, this.tableRowLimit);
  }

  getHiddenCount(total: number | undefined): number {
    return Math.max((total ?? 0) - this.tableRowLimit, 0);
  }

  getPassedTestsCount(summary: DashboardSummary): number {
    if (typeof summary.passedTestsCount === 'number') {
      return Math.max(summary.passedTestsCount, 0);
    }

    return Math.max(
      (summary.totalTestResults ?? 0) - (summary.warningTestsCount ?? 0) - (summary.failedTestsCount ?? 0),
      0
    );
  }

  getComplianceSegments(summary: DashboardSummary): DistributionSegment[] {
    const passed = this.getPassedTestsCount(summary);
    const warning = summary.warningTestsCount ?? 0;
    const failed = summary.failedTestsCount ?? 0;
    const total = Math.max(passed + warning + failed, summary.totalTestResults ?? 0, 0);

    return [
      this.buildSegment('Pass', passed, total, 'success'),
      this.buildSegment('Warning', warning, total, 'warning'),
      this.buildSegment('Fail', failed, total, 'danger')
    ];
  }

  getAssetRiskSegments(summary: DashboardSummary): DistributionSegment[] {
    const low = summary.lowRiskAssetsCount ?? 0;
    const medium = summary.mediumRiskAssetsCount ?? 0;
    const high = summary.highRiskAssetsCount ?? 0;
    const critical = summary.criticalRiskAssetsCount ?? 0;
    const unknown = summary.unknownRiskAssetsCount ?? summary.notEvaluatedAssetsCount ?? 0;
    const total = Math.max(summary.totalAssets ?? 0, low + medium + high + critical + unknown, 0);

    return [
      this.buildSegment('Low', low, total, 'success'),
      this.buildSegment('Medium', medium, total, 'warning'),
      this.buildSegment('High', high, total, 'danger'),
      this.buildSegment('Critical', critical, total, 'critical'),
      this.buildSegment('Unknown', unknown, total, 'muted')
    ];
  }

  getActionMetrics(summary: DashboardSummary): ActionMetric[] {
    return [
      {
        label: 'Failed Tests',
        value: summary.failedTestsCount ?? 0,
        helper: 'Need review or follow-up',
        tone: 'danger'
      },
      {
        label: 'Due for Retest',
        value: summary.assetsDueForRetestCount ?? 0,
        helper: 'Assets due or overdue',
        tone: 'warning'
      },
      {
        label: 'Open Jobs',
        value: summary.openJobsCount ?? 0,
        helper: 'Scheduled or in progress',
        tone: 'default'
      },
      {
        label: 'Overdue Jobs',
        value: summary.overdueJobsCount ?? 0,
        helper: 'Past due date',
        tone: 'danger'
      }
    ];
  }

  getDistributionTotal(segments: DistributionSegment[]): number {
    return segments.reduce((total, segment) => total + segment.value, 0);
  }

  getTestResultId(test: RecentFailedTest): string {
    return test.testResultId ?? test.id ?? '';
  }

  getTestReference(test: RecentFailedTest): string {
    const fallbackId = test.id ?? test.testResultId ?? '';
    return test.testReference ?? test.reference ?? test.reportNumber ?? this.cleanFallbackId(fallbackId) ?? 'Failed test';
  }

  getTestDate(test: RecentFailedTest): string {
    return this.formatDateTime(test.testDateUtc ?? test.testedAtUtc ?? test.createdAtUtc);
  }

  getTestStatus(test: RecentFailedTest): string {
    return test.status ?? test.resultStatus ?? test.overallStatus ?? 'Fail';
  }

  downloadReport(test: RecentFailedTest): void {
    const id = this.getTestResultId(test);
    const reference = this.getTestReference(test);

    if (!id) {
      this.errorMessage = 'This failed test has no test result id, so the report cannot be downloaded.';
      return;
    }

    this.reportLoadingId = id;
    this.errorMessage = '';

    this.reportDownloadService
      .downloadTestResultReport(id)
      .pipe(finalize(() => (this.reportLoadingId = '')))
      .subscribe({
        next: (blob) => {
          const fileName = this.reportDownloadService.buildTestResultReportFileName(reference, id);
          this.reportDownloadService.savePdf(blob, fileName);
        },
        error: () => {
          this.errorMessage = `Report could not be downloaded for "${reference}".`;
        }
      });
  }

  getAssetName(asset: AssetDueForRetest): string {
    return asset.assetName ?? asset.name ?? 'Unnamed asset';
  }

  getAssetTag(asset: AssetDueForRetest): string {
    return asset.assetTag ?? 'No tag';
  }

  getLastTestDate(asset: AssetDueForRetest): string {
    return this.formatDate(asset.lastTestDateUtc ?? asset.lastTestedAtUtc);
  }

  getNextDueDate(asset: AssetDueForRetest): string {
    return this.formatDate(
      asset.nextTestDueUtc ??
        asset.nextRetestDueUtc ??
        asset.retestDueUtc ??
        asset.dueDateUtc
    );
  }

  getDueMessage(asset: AssetDueForRetest): string {
    if (typeof asset.daysOverdue === 'number' && asset.daysOverdue > 0) {
      return `${asset.daysOverdue} day${asset.daysOverdue === 1 ? '' : 's'} overdue`;
    }

    if (typeof asset.daysUntilDue === 'number' && asset.daysUntilDue >= 0) {
      return `Due in ${asset.daysUntilDue} day${asset.daysUntilDue === 1 ? '' : 's'}`;
    }

    return 'Due for retest';
  }

  getDueBadgeClass(asset: AssetDueForRetest): string {
    if (typeof asset.daysOverdue === 'number' && asset.daysOverdue > 0) {
      return asset.daysOverdue > 14 ? 'badge badge-critical' : 'badge badge-danger';
    }

    return 'badge badge-warning';
  }

  getAssetId(asset: AssetDueForRetest): string {
    return asset.assetId ?? asset.id ?? '';
  }

  getPriorityJobTitle(job: PriorityJob): string {
    return job.title || 'Untitled job';
  }

  getPriorityJobId(job: PriorityJob): string {
    return job.jobId ?? job.id ?? '';
  }

  getPriorityJobDueDate(job: PriorityJob): string {
    return this.formatDate(job.dueAtUtc ?? job.dueDateUtc);
  }

  getPriorityJobOverdue(job: PriorityJob): string {
    const days = job.daysOverdue ?? 0;
    return days > 0 ? `${days} day${days === 1 ? '' : 's'}` : 'On track';
  }

  getRiskLevel(item: RecentFailedTest | AssetDueForRetest): string {
    const value = item.riskLevel ?? 'Not evaluated';
    return value.toLowerCase() === 'unknown' ? 'Not evaluated' : value;
  }

  getBadgeClass(value: string | null | undefined): string {
    const normalised = (value ?? 'unknown').toLowerCase();

    if (normalised.includes('critical')) {
      return 'badge badge-critical';
    }

    if (normalised.includes('high')) {
      return 'badge badge-danger';
    }

    if (normalised.includes('fail')) {
      return 'badge badge-danger';
    }

    if (normalised.includes('warning') || normalised.includes('medium')) {
      return 'badge badge-warning';
    }

    if (normalised.includes('pass') || normalised.includes('low')) {
      return 'badge badge-success';
    }

    return 'badge badge-muted';
  }

  trackByCardTitle(_: number, card: SummaryCard): string {
    return card.title;
  }

  trackBySegment(_: number, segment: DistributionSegment): string {
    return segment.label;
  }

  trackByActionMetric(_: number, metric: ActionMetric): string {
    return metric.label;
  }

  trackByFailedTest(index: number, test: RecentFailedTest): string {
    return test.id ?? test.testResultId ?? `${index}`;
  }

  trackByAsset(index: number, asset: AssetDueForRetest): string {
    return asset.assetId ?? asset.id ?? `${index}`;
  }

  trackByPriorityJob(index: number, job: PriorityJob): string {
    return job.jobId ?? job.id ?? `${index}`;
  }

  private normalizeSummary(summary: DashboardSummary): DashboardSummary {
    return {
      ...summary,
      totalCustomers: summary.totalCustomers ?? 0,
      totalSites: summary.totalSites ?? 0,
      totalAssets: summary.totalAssets ?? 0,
      totalTestResults: summary.totalTestResults ?? 0,
      passedTestsCount: summary.passedTestsCount,
      warningTestsCount: summary.warningTestsCount ?? 0,
      failedTestsCount: summary.failedTestsCount ?? 0,
      lowRiskAssetsCount: summary.lowRiskAssetsCount ?? 0,
      mediumRiskAssetsCount: summary.mediumRiskAssetsCount ?? 0,
      highRiskAssetsCount: summary.highRiskAssetsCount ?? 0,
      criticalRiskAssetsCount: summary.criticalRiskAssetsCount ?? 0,
      unknownRiskAssetsCount: summary.unknownRiskAssetsCount,
      notEvaluatedAssetsCount: summary.notEvaluatedAssetsCount,
      assetsDueForRetestCount: summary.assetsDueForRetestCount ?? 0,
      openJobsCount: summary.openJobsCount ?? 0,
      overdueJobsCount: summary.overdueJobsCount ?? 0,
      completedJobsLast30DaysCount: summary.completedJobsLast30DaysCount ?? 0,
      recentFailedTests: summary.recentFailedTests ?? [],
      assetsDueForRetest: summary.assetsDueForRetest ?? [],
      priorityJobs: summary.priorityJobs ?? []
    };
  }

  private buildCards(summary: DashboardSummary): SummaryCard[] {
    return [
      {
        title: 'Customers',
        value: summary.totalCustomers,
        helper: 'Active customer records',
        accent: 'Customer base',
        tone: 'default'
      },
      {
        title: 'Sites',
        value: summary.totalSites,
        helper: 'Registered customer sites',
        accent: 'Coverage',
        tone: 'default'
      },
      {
        title: 'Assets',
        value: summary.totalAssets,
        helper: 'Electrical assets tracked',
        accent: 'Inventory',
        tone: 'default'
      },
      {
        title: 'Test Results',
        value: summary.totalTestResults,
        helper: 'Recorded test results',
        accent: 'Evidence',
        tone: 'success'
      }
    ];
  }

  private buildSegment(
    label: string,
    value: number,
    total: number,
    tone: DistributionSegment['tone']
  ): DistributionSegment {
    return {
      label,
      value: Math.max(value ?? 0, 0),
      percent: total > 0 ? Math.round((Math.max(value ?? 0, 0) / total) * 100) : 0,
      tone
    };
  }

  private cleanFallbackId(value: string): string | null {
    if (!value) {
      return null;
    }

    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    return isGuid ? null : value;
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
