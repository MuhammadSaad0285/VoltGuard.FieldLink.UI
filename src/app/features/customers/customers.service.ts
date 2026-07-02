import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { PagedResult } from '../../core/models/paged-result.model';
import { ApiUrlService } from '../../core/services/api-url.service';
import { CustomerDetails, CustomerListItem, CustomerRequest, CustomerSearchParams } from './customer.models';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getCustomers(params: CustomerSearchParams): Observable<PagedResult<CustomerListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);

    const searchTerm = params.searchTerm?.trim();

    if (searchTerm) {
      httpParams = httpParams
        .set('searchTerm', searchTerm)
        .set('search', searchTerm);
    }

    return this.http
      .get<PagedResult<CustomerListItem> | CustomerListItem[]>(this.buildUrl('customers'), {
        params: httpParams
      })
      .pipe(map((response) => this.normalizePagedResult(response, params)));
  }

  getCustomer(id: string): Observable<CustomerDetails> {
    return this.http.get<CustomerDetails>(this.buildUrl(`customers/${id}`));
  }

  createCustomer(request: CustomerRequest): Observable<CustomerDetails> {
    return this.http.post<CustomerDetails>(this.buildUrl('customers'), request);
  }

  updateCustomer(id: string, request: CustomerRequest): Observable<CustomerDetails | void> {
    return this.http.put<CustomerDetails | void>(this.buildUrl(`customers/${id}`), request);
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(this.buildUrl(`customers/${id}`));
  }

  private normalizePagedResult(
    response: PagedResult<CustomerListItem> | CustomerListItem[],
    requestedParams: CustomerSearchParams
  ): PagedResult<CustomerListItem> {
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

    const raw = response as PagedResult<CustomerListItem> & {
      data?: CustomerListItem[];
      results?: CustomerListItem[];
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
