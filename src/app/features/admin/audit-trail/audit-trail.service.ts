import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result.model';
import { ApiUrlService } from '../../../core/services/api-url.service';
import { AuditLogItem, AuditLogSearchParams } from './audit-trail.models';

@Injectable({
  providedIn: 'root'
})
export class AuditTrailService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getAuditLogs(params: AuditLogSearchParams): Observable<PagedResult<AuditLogItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);

    const actorEmail = params.actorEmail?.trim();
    const action = params.action?.trim();
    const entityType = params.entityType?.trim();
    const entityId = params.entityId?.trim();
    const fromUtc = params.fromUtc?.trim();
    const toUtc = params.toUtc?.trim();
    const search = params.search?.trim();

    if (actorEmail) {
      httpParams = httpParams.set('actorEmail', actorEmail);
    }

    if (action) {
      httpParams = httpParams.set('action', action);
    }

    if (entityType) {
      httpParams = httpParams.set('entityType', entityType);
    }

    if (entityId) {
      httpParams = httpParams.set('entityId', entityId);
    }

    if (fromUtc) {
      httpParams = httpParams.set('fromUtc', fromUtc);
    }

    if (toUtc) {
      httpParams = httpParams.set('toUtc', toUtc);
    }

    if (search) {
      httpParams = httpParams.set('search', search);
    }

    return this.http
      .get<PagedResult<AuditLogItem> | AuditLogItem[]>(this.apiUrl.url('/audit-logs'), {
        params: httpParams
      })
      .pipe(map((response) => this.normalizePagedResult(response, params)));
  }

  private normalizePagedResult(
    response: PagedResult<AuditLogItem> | AuditLogItem[],
    requestedParams: AuditLogSearchParams
  ): PagedResult<AuditLogItem> {
    if (Array.isArray(response)) {
      return {
        items: response,
        pageNumber: requestedParams.pageNumber,
        pageSize: requestedParams.pageSize,
        totalCount: response.length,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false
      };
    }

    const raw = response as PagedResult<AuditLogItem> & {
      data?: AuditLogItem[];
      results?: AuditLogItem[];
      currentPage?: number;
      count?: number;
    };

    const items = raw.items ?? raw.data ?? raw.results ?? [];
    const pageNumber = raw.pageNumber ?? raw.currentPage ?? requestedParams.pageNumber;
    const pageSize = raw.pageSize ?? requestedParams.pageSize;
    const totalCount = raw.totalCount ?? raw.count ?? items.length;
    const totalPages = raw.totalPages ?? Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));

    return {
      items,
      pageNumber,
      pageSize,
      totalCount,
      totalPages,
      hasPreviousPage: raw.hasPreviousPage ?? pageNumber > 1,
      hasNextPage: raw.hasNextPage ?? pageNumber < totalPages
    };
  }
}
