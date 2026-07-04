import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ReportDownloadService } from '../../../core/services/report-download.service';
import { AssetTestHistoryItem } from '../asset.models';

@Component({
  selector: 'app-asset-test-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './asset-test-history.component.html',
  styleUrls: ['./asset-test-history.component.scss']
})
export class AssetTestHistoryComponent {
  private readonly reportDownloadService = inject(ReportDownloadService);

  @Input() history: AssetTestHistoryItem[] = [];
  @Input() loading = false;
  @Input() errorMessage = '';

  successMessage = '';
  reportLoadingId = '';

  downloadReport(test: AssetTestHistoryItem): void {
    const id = this.getTestResultId(test);
    const reference = this.getTestReference(test);

    if (!id) {
      this.successMessage = '';
      return;
    }

    this.reportLoadingId = id;
    this.successMessage = '';

    this.reportDownloadService
      .downloadTestResultReport(id)
      .pipe(finalize(() => (this.reportLoadingId = '')))
      .subscribe({
        next: (blob) => {
          const fileName = this.reportDownloadService.buildTestResultReportFileName(reference, id);
          this.reportDownloadService.savePdf(blob, fileName);
          this.successMessage = `Report downloaded for "${reference}".`;
        },
        error: () => {
          this.successMessage = '';
        }
      });
  }

  getTestResultId(test: AssetTestHistoryItem): string {
    return this.readValue(test, 'testResultId', 'id');
  }

  getTestReference(test: AssetTestHistoryItem): string {
    return (
      this.readValue(test, 'testReference', 'reference', 'reportNumber') ||
      this.cleanFallbackId(this.getTestResultId(test)) ||
      'Test result'
    );
  }

  getTestDate(test: AssetTestHistoryItem): string {
    return this.formatDateTime(this.readValue(test, 'testDateUtc', 'testedAtUtc', 'createdAtUtc'));
  }

  getStatus(test: AssetTestHistoryItem): string {
    return this.readValue(test, 'resultStatus', 'overallStatus', 'status') || 'Unknown';
  }

  getRiskLevel(test: AssetTestHistoryItem): string {
    return this.readValue(test, 'riskLevel', 'calculatedRiskLevel') || 'Unknown';
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

    if (normalised.includes('medium')) {
      return 'badge badge-warning';
    }

    if (normalised.includes('low')) {
      return 'badge badge-success';
    }

    return 'badge badge-muted';
  }

  trackByTest = (index: number, test: AssetTestHistoryItem): string => {
    return this.getTestResultId(test) || `${index}`;
  };

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

  private cleanFallbackId(value: string): string | null {
    if (!value) {
      return null;
    }

    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    return isGuid ? null : value;
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
