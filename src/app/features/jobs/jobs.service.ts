import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { SUPPRESS_API_ERROR_LOG } from '../../core/interceptors/error.interceptor';
import { PagedResult } from '../../core/models/paged-result.model';
import { ApiUrlService } from '../../core/services/api-url.service';
import {
  AssetDropdownItem,
  CustomerDropdownItem,
  EngineerDropdownItem,
  JobDetails,
  JobListItem,
  JobRequest,
  JobSearchParams,
  SiteDropdownItem
} from './job.models';

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getJobs(params: JobSearchParams): Observable<PagedResult<JobListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);

    const searchTerm = params.searchTerm?.trim();
    const customerId = params.customerId?.trim();
    const siteId = params.siteId?.trim();
    const assetId = params.assetId?.trim();
    const status = params.status?.trim();
    const priority = params.priority?.trim();
    const jobType = params.jobType?.trim();

    if (searchTerm) {
      httpParams = httpParams
        .set('searchTerm', searchTerm)
        .set('search', searchTerm);
    }

    if (customerId) {
      httpParams = httpParams.set('customerId', customerId);
    }

    if (siteId) {
      httpParams = httpParams.set('siteId', siteId);
    }

    if (assetId) {
      httpParams = httpParams.set('assetId', assetId);
    }

    if (status) {
      httpParams = httpParams.set('status', status);
    }

    if (priority) {
      httpParams = httpParams.set('priority', priority);
    }

    if (jobType) {
      httpParams = httpParams.set('jobType', jobType);
    }

    if (params.overdueOnly) {
      httpParams = httpParams
        .set('overdueOnly', true)
        .set('isOverdue', true);
    }

    return this.http
      .get<PagedResult<JobListItem> | JobListItem[]>(this.buildUrl('jobs'), {
        params: httpParams
      })
      .pipe(map((response) => this.normalizePagedResult(response, params)));
  }

  getJob(id: string): Observable<JobDetails> {
    return this.http.get<JobDetails>(this.buildUrl(`jobs/${id}`));
  }

  createJob(request: JobRequest): Observable<JobDetails> {
    return this.http.post<JobDetails>(this.buildUrl('jobs'), request);
  }

  updateJob(id: string, request: JobRequest): Observable<JobDetails | void> {
    return this.http.put<JobDetails | void>(this.buildUrl(`jobs/${id}`), request);
  }

  startJob(id: string): Observable<JobDetails | void> {
    return this.http.post<JobDetails | void>(this.buildUrl(`jobs/${id}/start`), {});
  }

  completeJob(id: string): Observable<JobDetails | void> {
    return this.http.post<JobDetails | void>(this.buildUrl(`jobs/${id}/complete`), {});
  }

  cancelJob(id: string): Observable<JobDetails | void> {
    return this.http.post<JobDetails | void>(this.buildUrl(`jobs/${id}/cancel`), {});
  }

  deleteJob(id: string): Observable<void> {
    return this.http.delete<void>(this.buildUrl(`jobs/${id}`));
  }

  getCustomersForDropdown(): Observable<CustomerDropdownItem[]> {
    const params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 1000);

    return this.http
      .get<PagedResult<CustomerDropdownItem> | CustomerDropdownItem[]>(this.buildUrl('customers'), {
        params
      })
      .pipe(
        map((response) => {
          const customers = Array.isArray(response) ? response : response.items ?? [];
          return customers.filter((customer) => customer.isActive !== false);
        })
      );
  }

  getSitesForDropdown(customerId?: string): Observable<SiteDropdownItem[]> {
    let params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 1000);

    const cleanCustomerId = customerId?.trim();

    if (cleanCustomerId) {
      params = params.set('customerId', cleanCustomerId);
    }

    return this.http
      .get<PagedResult<SiteDropdownItem> | SiteDropdownItem[]>(this.buildUrl('sites'), {
        params
      })
      .pipe(
        map((response) => {
          const sites = Array.isArray(response) ? response : response.items ?? [];
          return sites.filter((site) => site.isActive !== false);
        })
      );
  }

  getAssetsForDropdown(customerId?: string, siteId?: string): Observable<AssetDropdownItem[]> {
    let params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 1000)
      .set('includeInactive', false);

    const cleanCustomerId = customerId?.trim();
    const cleanSiteId = siteId?.trim();

    if (cleanCustomerId) {
      params = params.set('customerId', cleanCustomerId);
    }

    if (cleanSiteId) {
      params = params.set('siteId', cleanSiteId);
    }

    return this.http
      .get<PagedResult<AssetDropdownItem> | AssetDropdownItem[]>(this.buildUrl('assets'), {
        params
      })
      .pipe(
        map((response) => {
          const assets = Array.isArray(response) ? response : response.items ?? [];
          return assets.filter((asset) => asset.isActive !== false);
        })
      );
  }

  getEngineersForDropdown(): Observable<EngineerDropdownItem[]> {
    const params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 1000)
      .set('role', 'Engineer')
      .set('isActive', true);
    const context = new HttpContext().set(SUPPRESS_API_ERROR_LOG, true);

    return this.http
      .get<PagedResult<EngineerDropdownItem> | EngineerDropdownItem[]>(this.buildUrl('admin/users'), {
        context,
        params
      })
      .pipe(
        catchError(() =>
          this.http.get<PagedResult<EngineerDropdownItem> | EngineerDropdownItem[]>(
            this.buildUrl('users'),
            { context, params }
          )
        ),
        map((response) => {
          const users = this.normalizeEngineerResponse(response);

          return users.filter((user) => this.isEngineerUser(user));
        }),
        catchError(() => of([]))
      );
  }

  private normalizeEngineerResponse(
    response: PagedResult<EngineerDropdownItem> | EngineerDropdownItem[] | EngineerDropdownItem
  ): EngineerDropdownItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    const pagedResponse = response as PagedResult<EngineerDropdownItem>;

    if (Array.isArray(pagedResponse.items)) {
      return pagedResponse.items;
    }

    const singleUser = response as EngineerDropdownItem;

    return singleUser.id || singleUser.email || singleUser.fullName || singleUser.userName
      ? [singleUser]
      : [];
  }

  private isEngineerUser(user: EngineerDropdownItem): boolean {
    const roles = user.roles ?? [];

    if (user.isActive === false) {
      return false;
    }

    return roles.length === 0 || roles.some((role) => role.toLowerCase() === 'engineer');
  }

  private normalizePagedResult(
    response: PagedResult<JobListItem> | JobListItem[],
    requestedParams: JobSearchParams
  ): PagedResult<JobListItem> {
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

    const raw = response as PagedResult<JobListItem> & {
      data?: JobListItem[];
      results?: JobListItem[];
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

  private buildUrl(path: string): string {
    const api = this.apiUrl as unknown as {
      build?: (path: string) => string;
      url?: (path: string) => string;
      getUrl?: (path: string) => string;
      baseUrl?: string;
      apiBaseUrl?: string;
    };

    if (typeof api.build === 'function') {
      return api.build(path);
    }

    if (typeof api.url === 'function') {
      return api.url(path);
    }

    if (typeof api.getUrl === 'function') {
      return api.getUrl(path);
    }

    const baseUrl = api.baseUrl ?? api.apiBaseUrl ?? 'https://localhost:7190/api';

    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}
