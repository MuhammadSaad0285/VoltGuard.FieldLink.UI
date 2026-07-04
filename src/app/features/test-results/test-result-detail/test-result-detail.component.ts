import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { AuthService } from '../../../core/auth/auth.service';
import { TestResultDetails, TestResultMeasurement } from '../test-result.models';
import { TestResultsService } from '../test-results.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-test-result-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, ConfirmDialogComponent],
  templateUrl: './test-result-detail.component.html',
  styleUrls: ['./test-result-detail.component.scss']
})
export class TestResultDetailComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly testResultsService = inject(TestResultsService);

  testResult: TestResultDetails | null = null;
  testResultId = '';

  loading = false;
  actionLoading = false;
  reportLoading = false;

  errorMessage = '';
  successMessage = '';
  showDeleteDialog = false;

  ngOnInit(): void {
    this.testResultId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadTestResult();
  }

  get canDelete(): boolean {
    return this.authService.canDelete;
  }

  get canCreate(): boolean {
    return this.authService.canCreate;
  }

  get canManageJobs(): boolean {
    return this.authService.canViewAdmin;
  }

  loadTestResult(): void {
    if (!this.testResultId) {
      this.errorMessage = 'No test result id was provided.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.testResultsService
      .getTestResult(this.testResultId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.testResult = result;
        },
        error: () => {
          this.testResult = null;
          this.errorMessage = 'Test result details could not be loaded. Please check the API and try again.';
        }
      });
  }

  deleteTestResult(): void {
    if (!this.testResultId || !this.testResult) {
      return;
    }

    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    if (this.actionLoading) {
      return;
    }

    this.showDeleteDialog = false;
  }

  confirmDelete(): void {
    if (!this.testResultId || !this.testResult) {
      return;
    }

    const reference = this.getTestReference(this.testResult);

    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.testResultsService
      .deleteTestResult(this.testResultId)
      .pipe(finalize(() => (this.actionLoading = false)))
      .subscribe({
        next: () => {
          this.showDeleteDialog = false;
          this.router.navigate(['/test-results']);
        },
        error: () => {
          this.errorMessage = `Test result "${reference}" could not be deleted.`;
        }
      });
  }

  downloadReport(): void {
    if (!this.testResultId || !this.testResult) {
      return;
    }

    const reference = this.getTestReference(this.testResult);
    this.reportLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.testResultsService
      .downloadReport(this.testResultId)
      .pipe(finalize(() => (this.reportLoading = false)))
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

  getTestReference(result: TestResultDetails): string {
    return (
      result.testReference ||
      result.reference ||
      result.reportNumber ||
      this.cleanFallbackId(result.id || result.testResultId || '') ||
      'Test result'
    );
  }

  getAssetName(result: TestResultDetails): string {
    return result.assetName ?? 'Unknown asset';
  }

  getAssetTag(result: TestResultDetails): string {
    return result.assetTag ?? 'No tag';
  }

  getAssetType(result: TestResultDetails): string {
    return result.assetType ?? 'Not set';
  }

  getCustomerName(result: TestResultDetails): string {
    return result.customerName ?? result.customerCompanyName ?? 'Unknown customer';
  }

  getSiteName(result: TestResultDetails): string {
    return result.siteName ?? 'Unknown site';
  }

  getLocation(result: TestResultDetails): string {
    return result.locationDescription ?? result.location ?? 'No location';
  }

  getManufacturerModel(result: TestResultDetails): string {
    const parts = [result.manufacturer, result.model].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Not set';
  }

  getTestType(result: TestResultDetails): string {
    return result.testType ?? 'Not set';
  }

  getEngineerName(result: TestResultDetails): string {
    return result.engineerName ?? result.engineerEmail ?? 'Not set';
  }

  getTestDate(result: TestResultDetails): string {
    return this.formatDateTime(result.testDateUtc ?? result.testedAtUtc ?? result.createdAtUtc);
  }

  getCreatedDate(result: TestResultDetails): string {
    return this.formatDateTime(result.createdAtUtc);
  }

  getUpdatedDate(result: TestResultDetails): string {
    return this.formatDateTime(result.updatedAtUtc);
  }

  getNextDueDate(result: TestResultDetails): string {
    return this.formatDate(result.nextTestDueUtc ?? result.nextRetestDueUtc);
  }

  getStatus(result: TestResultDetails | TestResultMeasurement): string {
    return result.status ?? result.resultStatus ?? ('overallStatus' in result ? result.overallStatus : undefined) ?? ('evaluationStatus' in result ? result.evaluationStatus : undefined) ?? 'Unknown';
  }

  getRiskLevel(result: TestResultDetails): string {
    return result.riskLevel ?? result.calculatedRiskLevel ?? 'Unknown';
  }

  getFollowUpPriority(result: TestResultDetails): string {
    const risk = this.getRiskLevel(result).toLowerCase();
    const status = this.getStatus(result).toLowerCase();

    return risk.includes('critical') || status.includes('critical') ? 'Critical' : 'High';
  }

  getFollowUpTitle(result: TestResultDetails): string {
    const asset = this.getAssetName(result);
    return asset && asset !== 'Unknown asset'
      ? `Follow-up for failed test - ${asset}`
      : 'Follow-up for failed test';
  }

  shouldShowFollowUpAction(result: TestResultDetails): boolean {
    const status = this.getStatus(result).toLowerCase();
    const risk = this.getRiskLevel(result).toLowerCase();

    return status.includes('fail') || risk.includes('high') || risk.includes('critical');
  }

  getNotes(result: TestResultDetails): string {
    return result.notes ?? result.comments ?? 'No notes recorded.';
  }

  getMeasurements(result: TestResultDetails): TestResultMeasurement[] {
    return [...(result.measurements ?? [])].sort(
      (left, right) => (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER)
    );
  }

  getMeasurementName(measurement: TestResultMeasurement): string {
    return measurement.name ?? measurement.measurementName ?? measurement.parameter ?? measurement.measurementType ?? 'Measurement';
  }

  getMeasurementValue(measurement: TestResultMeasurement): string {
    const value = measurement.measuredValue ?? measurement.value ?? measurement.readingValue;

    if (value === null || value === undefined || value === '') {
      return 'Not set';
    }

    return `${value}${measurement.unit ? ' ' + measurement.unit : ''}`;
  }

  getThreshold(measurement: TestResultMeasurement): string {
    if (measurement.thresholdDescription) {
      return measurement.thresholdDescription;
    }

    if (measurement.expectedValue) {
      return measurement.expectedValue;
    }

    const min =
      measurement.expectedMin ??
      measurement.minThreshold ??
      measurement.minimumAllowedValue ??
      measurement.warningMinimumValue;
    const max =
      measurement.expectedMax ??
      measurement.maxThreshold ??
      measurement.maximumAllowedValue ??
      measurement.warningMaximumValue;

    if ((min === null || min === undefined || min === '') && (max === null || max === undefined || max === '')) {
      return 'Not set';
    }

    if (min !== null && min !== undefined && min !== '' && max !== null && max !== undefined && max !== '') {
      return `${min} - ${max}${measurement.unit ? ' ' + measurement.unit : ''}`;
    }

    if (min !== null && min !== undefined && min !== '') {
      return `Min ${min}${measurement.unit ? ' ' + measurement.unit : ''}`;
    }

    return `Max ${max}${measurement.unit ? ' ' + measurement.unit : ''}`;
  }

  getMeasurementNotes(measurement: TestResultMeasurement): string {
    return measurement.notes || 'No notes';
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

  trackByMeasurement(index: number, measurement: TestResultMeasurement): string {
    return measurement.id ?? `${index}`;
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
