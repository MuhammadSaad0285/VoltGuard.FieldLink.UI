import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { PagedResult } from '../../core/models/paged-result.model';
import { ApiUrlService } from '../../core/services/api-url.service';
import {
  AssetDetails,
  AssetListItem,
  AssetRequest,
  AssetSearchParams,
  AssetTestHistoryItem,
  CustomerDropdownItem,
  SiteDropdownItem
} from './asset.models';

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getAssets(params: AssetSearchParams): Observable<PagedResult<AssetListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize)
      .set('includeInactive', params.includeInactive ?? false);

    const searchTerm = params.searchTerm?.trim();
    const customerId = params.customerId?.trim();
    const siteId = params.siteId?.trim();

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

    return this.http
      .get<PagedResult<AssetListItem> | AssetListItem[]>(this.buildUrl('assets'), {
        params: httpParams
      })
      .pipe(map((response) => this.normalizePagedResult(response, params)));
  }

  getAsset(id: string): Observable<AssetDetails> {
    return this.http.get<AssetDetails>(this.buildUrl(`assets/${id}`));
  }

  createAsset(request: AssetRequest): Observable<AssetDetails> {
    return this.http.post<AssetDetails>(this.buildUrl('assets'), request);
  }

  updateAsset(id: string, request: AssetRequest): Observable<AssetDetails | void> {
    return this.http.put<AssetDetails | void>(this.buildUrl(`assets/${id}`), request);
  }

  deleteAsset(id: string): Observable<void> {
    return this.http.delete<void>(this.buildUrl(`assets/${id}`));
  }

  getTestHistory(assetId: string): Observable<AssetTestHistoryItem[]> {
    return this.http
      .get<AssetTestHistoryItem[] | PagedResult<AssetTestHistoryItem>>(
        this.buildUrl(`assets/${assetId}/test-history`)
      )
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          return response.items ?? [];
        })
      );
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
          const sites = Array.isArray(response)
            ? response
            : response.items ?? [];

          return sites.filter((site) => site.isActive !== false);
        })
      );
  }

  private normalizePagedResult(
    response: PagedResult<AssetListItem> | AssetListItem[],
    requestedParams: AssetSearchParams
  ): PagedResult<AssetListItem> {
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

    const raw = response as PagedResult<AssetListItem> & {
      data?: AssetListItem[];
      results?: AssetListItem[];
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