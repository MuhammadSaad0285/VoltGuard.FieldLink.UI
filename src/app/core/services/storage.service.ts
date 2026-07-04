import { Injectable } from '@angular/core';
import { UserSession } from '../models/user-session.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly sessionKey = 'voltguard_user_session';

  setSession(session: UserSession): void {
    sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
    localStorage.removeItem(this.sessionKey);
  }

  getSession(): UserSession | null {
    const raw = sessionStorage.getItem(this.sessionKey) ?? localStorage.getItem(this.sessionKey);

    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as UserSession;

      if (this.isExpired(session)) {
        this.clearSession();
        return null;
      }

      if (!sessionStorage.getItem(this.sessionKey)) {
        sessionStorage.setItem(this.sessionKey, raw);
        localStorage.removeItem(this.sessionKey);
      }

      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  clearSession(): void {
    sessionStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.sessionKey);
  }

  private isExpired(session: UserSession): boolean {
    const expiresAtUtc = session.expiresAtUtc ?? this.readJwtExpiry(session.accessToken);

    if (!expiresAtUtc) {
      return false;
    }

    const expiresAt = new Date(expiresAtUtc).getTime();
    return Number.isFinite(expiresAt) && expiresAt <= Date.now();
  }

  private readJwtExpiry(token: string | null | undefined): string | null {
    try {
      const payloadPart = token?.split('.')[1];

      if (!payloadPart) {
        return null;
      }

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedBase64)) as { exp?: unknown };

      return typeof payload.exp === 'number'
        ? new Date(payload.exp * 1000).toISOString()
        : null;
    } catch {
      return null;
    }
  }
}
