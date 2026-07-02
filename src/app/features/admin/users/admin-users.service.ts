import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { SUPPRESS_API_ERROR_LOG } from '../../../core/interceptors/error.interceptor';
import { PagedResult } from '../../../core/models/paged-result.model';
import { ApiUrlService } from '../../../core/services/api-url.service';
import {
  AdminUserCreateRequest,
  AdminUserDetails,
  AdminUserListItem,
  AdminUserResetPasswordRequest,
  AdminUserSearchParams,
  AdminUserUpdateRequest
} from './admin-user.models';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly allowedRoles = ['Admin', 'Engineer'];

  getUsers(params: AdminUserSearchParams): Observable<PagedResult<AdminUserListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);

    const searchTerm = params.searchTerm?.trim();
    const role = params.role?.trim();

    if (searchTerm) {
      httpParams = httpParams.set('searchTerm', searchTerm);
    }

    if (role) {
      httpParams = httpParams.set('role', role);
    }

    if (params.isActive !== null && params.isActive !== undefined) {
      httpParams = httpParams.set('isActive', params.isActive);
    }

    return this.http
      .get<PagedResult<AdminUserListItem> | AdminUserListItem[]>(this.apiUrl.url('/admin/users'), {
        params: httpParams
      })
      .pipe(map((response) => this.normalizePagedResult(response, params)));
  }

  getUser(id: string): Observable<AdminUserDetails> {
    return this.http
      .get<AdminUserDetails>(this.apiUrl.url(`/admin/users/${id}`))
      .pipe(map((user) => this.normalizeUser(user)));
  }

  createUser(request: AdminUserCreateRequest): Observable<AdminUserDetails> {
    return this.http.post<AdminUserDetails>(this.apiUrl.url('/admin/users'), {
      ...request,
      roles: this.filterAllowedRoles(request.roles)
    });
  }

  updateUser(id: string, request: AdminUserUpdateRequest): Observable<AdminUserDetails | void> {
    return this.http.put<AdminUserDetails | void>(this.apiUrl.url(`/admin/users/${id}`), {
      ...request,
      roles: this.filterAllowedRoles(request.roles)
    });
  }

  activateUser(id: string): Observable<void> {
    return this.http.patch<void>(this.apiUrl.url(`/admin/users/${id}/activate`), {});
  }

  deactivateUser(id: string): Observable<void> {
    return this.http.patch<void>(this.apiUrl.url(`/admin/users/${id}/deactivate`), {});
  }

  resetPassword(id: string, request: AdminUserResetPasswordRequest): Observable<void> {
    return this.http.post<void>(this.apiUrl.url(`/admin/users/${id}/reset-password`), request);
  }

  getRoles(): Observable<string[]> {
    const context = new HttpContext().set(SUPPRESS_API_ERROR_LOG, true);

    return this.http.get<string[]>(this.apiUrl.url('/admin/roles'), { context }).pipe(
      map((roles) => {
        const allowedRoles = this.filterAllowedRoles(roles);
        return allowedRoles.length > 0 ? allowedRoles : this.allowedRoles;
      }),
      catchError(() => of(this.allowedRoles))
    );
  }

  private normalizePagedResult(
    response: PagedResult<AdminUserListItem> | AdminUserListItem[],
    requestedParams: AdminUserSearchParams
  ): PagedResult<AdminUserListItem> {
    if (Array.isArray(response)) {
      return {
        items: response.map((user) => this.normalizeUser(user)),
        pageNumber: requestedParams.pageNumber,
        pageSize: requestedParams.pageSize,
        totalCount: response.length,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false
      };
    }

    const raw = response as PagedResult<AdminUserListItem> & {
      data?: AdminUserListItem[];
      results?: AdminUserListItem[];
      currentPage?: number;
      count?: number;
    };

    const items = (raw.items ?? raw.data ?? raw.results ?? []).map((user) => this.normalizeUser(user));
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

  private filterAllowedRoles(roles: string[] | null | undefined): string[] {
    return (roles ?? [])
      .map((role) => role.trim())
      .filter((role) => this.allowedRoles.includes(role));
  }

  private normalizeUser<T extends AdminUserListItem>(user: T): T {
    return {
      ...user,
      roles: this.filterAllowedRoles(user.roles)
    };
  }
}
