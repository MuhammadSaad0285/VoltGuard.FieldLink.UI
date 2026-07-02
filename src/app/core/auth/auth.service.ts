import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  UserSession
} from '../models/user-session.model';
import { ApiUrlService } from '../services/api-url.service';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  login(request: LoginRequest): Observable<UserSession> {
    return this.http.post<LoginResponse>(this.apiUrl.url('/auth/login'), request).pipe(
      map(response => this.createSessionFromLoginResponse(response)),
      tap(session => this.storage.setSession(session))
    );
  }

  me(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(this.apiUrl.url('/auth/me'));
  }

  refreshSession(): Observable<UserSession | null> {
    const existingSession = this.storage.getSession();

    if (!existingSession?.accessToken) {
      return of(null);
    }

    return this.me().pipe(
      map(currentUser => {
        const updatedSession = this.createSessionFromCurrentUser(existingSession, currentUser);
        this.storage.setSession(updatedSession);
        return updatedSession;
      }),
      catchError(() => {
        this.storage.clearSession();
        return of(null);
      })
    );
  }

  logout(redirectToLogin = true): void {
    this.storage.clearSession();

    if (redirectToLogin) {
      this.router.navigate(['/login']);
    }
  }

  getSession(): UserSession | null {
    return this.storage.getSession();
  }

  getAccessToken(): string | null {
    return this.storage.getAccessToken();
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  hasRole(role: string): boolean {
    const session = this.getSession();
    const expectedRole = role.toLowerCase();

    return session?.roles?.some(userRole => userRole.toLowerCase() === expectedRole) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  get canView(): boolean {
    return this.hasAnyRole(['Admin', 'Engineer']);
  }

  get canCreate(): boolean {
    return this.hasAnyRole(['Admin', 'Engineer']);
  }

  get canEdit(): boolean {
    return this.hasAnyRole(['Admin', 'Engineer']);
  }

  get canDelete(): boolean {
    return this.hasRole('Admin');
  }

  get canViewAdmin(): boolean {
    return this.hasRole('Admin');
  }

  private createSessionFromLoginResponse(response: LoginResponse): UserSession {
    const token =
      response.accessToken ??
      response.token ??
      response.jwtToken ??
      response.access_token ??
      '';

    if (!token) {
      throw new Error('Login succeeded but no access token was returned by the backend.');
    }

    const responseRoles =
      response.roles ??
      response.user?.roles ??
      response.role ??
      response.user?.role ??
      [];

    const roles = this.normaliseRoles(responseRoles).length > 0
      ? this.normaliseRoles(responseRoles)
      : this.getRolesFromJwt(token);

    const email =
      response.email ??
      response.user?.email ??
      this.readJwtStringClaim(token, 'email') ??
      this.readJwtStringClaim(token, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ??
      '';

    const fullName =
      response.fullName ??
      response.name ??
      response.user?.fullName ??
      response.user?.name ??
      this.readJwtStringClaim(token, 'name') ??
      email;

    return {
      accessToken: token,
      email,
      fullName,
      roles,
      expiresAtUtc: response.expiresAtUtc ?? response.expiresAt
    };
  }

  private createSessionFromCurrentUser(
    existingSession: UserSession,
    currentUser: CurrentUserResponse
  ): UserSession {
    const userRoles = currentUser.roles ?? currentUser.role ?? existingSession.roles;
    const roles = this.normaliseRoles(userRoles);

    return {
      ...existingSession,
      email: currentUser.email ?? existingSession.email,
      fullName:
        currentUser.fullName ??
        currentUser.name ??
        existingSession.fullName ??
        currentUser.email ??
        existingSession.email,
      roles: roles.length > 0 ? roles : existingSession.roles
    };
  }

  private normaliseRoles(value: string | string[] | undefined | null): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map(role => String(role)).filter(role => role.trim().length > 0);
    }

    return [String(value)].filter(role => role.trim().length > 0);
  }

  private getRolesFromJwt(token: string): string[] {
    const payload = this.decodeJwtPayload(token);

    if (!payload) {
      return [];
    }

    const roleClaim =
      payload['role'] ??
      payload['roles'] ??
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

    if (Array.isArray(roleClaim)) {
      return roleClaim.map(role => String(role));
    }

    if (typeof roleClaim === 'string') {
      return [roleClaim];
    }

    return [];
  }

  private readJwtStringClaim(token: string, claimName: string): string | null {
    const payload = this.decodeJwtPayload(token);
    const value = payload?.[claimName];

    return typeof value === 'string' ? value : null;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payloadPart = token.split('.')[1];

      if (!payloadPart) {
        return null;
      }

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

      return JSON.parse(atob(paddedBase64)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
