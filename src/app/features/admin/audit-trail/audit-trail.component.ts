import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result.model';
import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import { AuditFieldChange, AuditLogItem } from './audit-trail.models';
import { AuditTrailService } from './audit-trail.service';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './audit-trail.component.html',
  styleUrls: ['./audit-trail.component.scss']
})
export class AuditTrailComponent implements OnInit {
  private readonly auditTrailService = inject(AuditTrailService);

  readonly actions = ['Created', 'Updated', 'Deleted'];
  readonly entityTypes = ['Asset', 'Customer', 'Site', 'Job', 'TestResult', 'ApplicationUser'];
  readonly pageSizeOptions = [10, 20, 50, 100];

  auditLogs: AuditLogItem[] = [];
  selectedLog: AuditLogItem | null = null;
  selectedChanges: AuditFieldChange[] = [];

  fromDate = '';
  toDate = '';
  actorEmail = '';
  selectedAction = '';
  selectedEntityType = '';
  searchTerm = '';

  pageNumber = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 1;
  hasPreviousPage = false;
  hasNextPage = false;

  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  @HostListener('document:keydown.escape')
  closeDrawerOnEscape(): void {
    this.closeDetails();
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auditTrailService
      .getAuditLogs({
        actorEmail: this.actorEmail,
        action: this.selectedAction,
        entityType: this.selectedEntityType,
        fromUtc: this.toUtcIso(this.fromDate),
        toUtc: this.toUtcIso(this.toDate),
        search: this.searchTerm,
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => {
          this.auditLogs = [];
          this.errorMessage = 'Audit records could not be loaded. Please check the API and try again.';
        }
      });
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.loadAuditLogs();
  }

  clearFilters(): void {
    if (!this.hasActiveFilters()) {
      return;
    }

    this.fromDate = '';
    this.toDate = '';
    this.actorEmail = '';
    this.selectedAction = '';
    this.selectedEntityType = '';
    this.searchTerm = '';
    this.pageNumber = 1;
    this.loadAuditLogs();
  }

  changePageSize(value: string | number): void {
    this.pageSize = Number(value);
    this.pageNumber = 1;
    this.loadAuditLogs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.pageNumber = page;
    this.loadAuditLogs();
  }

  openDetails(log: AuditLogItem): void {
    this.selectedLog = log;
    this.selectedChanges = this.getFieldChanges(log);
  }

  closeDetails(): void {
    this.selectedLog = null;
    this.selectedChanges = [];
  }

  hasActiveFilters(): boolean {
    return !!(
      this.fromDate ||
      this.toDate ||
      this.actorEmail.trim() ||
      this.selectedAction ||
      this.selectedEntityType ||
      this.searchTerm.trim()
    );
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

  getLocalTimestamp(value: string | null | undefined): string {
    const date = this.parseDate(value);

    if (!date) {
      return 'Not set';
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  getUtcTimestamp(value: string | null | undefined): string {
    const date = this.parseDate(value);

    if (!date) {
      return value || 'Not set';
    }

    return date.toISOString();
  }

  getActorLabel(log: AuditLogItem): string {
    return log.actorEmail || 'System';
  }

  getEntityLabel(log: AuditLogItem): string {
    return log.entityType || 'Unknown';
  }

  getValueOrDash(value: string | null | undefined): string {
    return value?.trim() ? value : '-';
  }

  getActionClass(action: string): string {
    const normalized = action.toLowerCase();

    if (normalized === 'created') {
      return 'action-badge action-badge--created';
    }

    if (normalized === 'updated') {
      return 'action-badge action-badge--updated';
    }

    if (normalized === 'deleted') {
      return 'action-badge action-badge--deleted';
    }

    return 'action-badge action-badge--muted';
  }

  getDetailsTitle(log: AuditLogItem): string {
    return `${log.action} ${log.entityType}`;
  }

  trackByAuditLog(_: number, log: AuditLogItem): string {
    return log.id;
  }

  trackByChange(_: number, change: AuditFieldChange): string {
    return change.field;
  }

  private applyResult(result: PagedResult<AuditLogItem>): void {
    this.auditLogs = result.items ?? [];
    this.pageNumber = result.pageNumber ?? this.pageNumber;
    this.pageSize = result.pageSize ?? this.pageSize;
    this.totalCount = result.totalCount ?? this.auditLogs.length;
    this.totalPages = Math.max(1, result.totalPages ?? 1);
    this.hasPreviousPage = result.hasPreviousPage ?? this.pageNumber > 1;
    this.hasNextPage = result.hasNextPage ?? this.pageNumber < this.totalPages;
  }

  private getFieldChanges(log: AuditLogItem): AuditFieldChange[] {
    const oldValues = this.parseJsonObject(log.oldValuesJson);
    const newValues = this.parseJsonObject(log.newValuesJson);
    const action = log.action.toLowerCase();

    if (action === 'created') {
      return this.objectToChanges(newValues, 'newValue');
    }

    if (action === 'deleted') {
      return this.objectToChanges(oldValues, 'oldValue');
    }

    if (action === 'updated') {
      const fields = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

      return Array.from(fields)
        .filter((field) => this.formatAuditValue(oldValues[field]) !== this.formatAuditValue(newValues[field]))
        .map((field) => ({
          field,
          oldValue: this.formatAuditValue(oldValues[field]),
          newValue: this.formatAuditValue(newValues[field])
        }));
    }

    return this.objectToChanges(newValues, 'newValue');
  }

  private objectToChanges(
    value: Record<string, unknown>,
    target: 'oldValue' | 'newValue'
  ): AuditFieldChange[] {
    return Object.keys(value).map((field) => ({
      field,
      oldValue: target === 'oldValue' ? this.formatAuditValue(value[field]) : '-',
      newValue: target === 'newValue' ? this.formatAuditValue(value[field]) : '-'
    }));
  }

  private parseJsonObject(value: string | null): Record<string, unknown> {
    if (!value) {
      return {};
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private formatAuditValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private toUtcIso(value: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
