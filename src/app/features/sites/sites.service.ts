import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { PagedResult } from '../../core/models/paged-result.model';
import { ApiUrlService } from '../../core/services/api-url.service';
import {
  CustomerDropdownItem,
  SiteDetails,
  SiteListItem,
  SiteRequest,
  SiteSearchParams
} from './site.models';

@Injectable({
  providedIn: 'root'
})
export class SitesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getSites(params: SiteSearchParams): Observable<PagedResult<SiteListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);

    const searchTerm = params.searchTerm?.trim();
    const customerId = params.customerId?.trim();

    if (searchTerm) {
      httpParams = httpParams
        .set('searchTerm', searchTerm)
        .set('search', searchTerm);
    }

    if (customerId) {
      httpParams = httpParams.set('customerId', customerId);
    }

    return this.http
      .get<PagedResult<SiteListItem> | SiteListItem[]>(this.buildUrl('sites'), {
        params: httpParams
      })
      .pipe(map((response) => this.normalizePagedResult(response, params)));
  }

  getSite(id: string): Observable<SiteDetails> {
    return this.http.get<SiteDetails>(this.buildUrl(`sites/${id}`));
  }

  createSite(request: SiteRequest): Observable<SiteDetails> {
    return this.http.post<SiteDetails>(this.buildUrl('sites'), request);
  }

  updateSite(id: string, request: SiteRequest): Observable<SiteDetails | void> {
    return this.http.put<SiteDetails | void>(this.buildUrl(`sites/${id}`), request);
  }

  deleteSite(id: string): Observable<void> {
    return this.http.delete<void>(this.buildUrl(`sites/${id}`));
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
          const customers = Array.isArray(response)
            ? response
            : response.items ?? [];

          return customers.filter((customer) => customer.isActive !== false);
        })
      );
  }

  private normalizePagedResult(
    response: PagedResult<SiteListItem> | SiteListItem[],
    requestedParams: SiteSearchParams
  ): PagedResult<SiteListItem> {
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

    const raw = response as PagedResult<SiteListItem> & {
      data?: SiteListItem[];
      results?: SiteListItem[];
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
