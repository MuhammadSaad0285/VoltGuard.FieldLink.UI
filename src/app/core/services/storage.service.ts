import { Injectable } from '@angular/core';
import { UserSession } from '../models/user-session.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly sessionKey = 'voltguard_user_session';

  setSession(session: UserSession): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  getSession(): UserSession | null {
    const raw = localStorage.getItem(this.sessionKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      this.clearSession();
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  clearSession(): void {
    localStorage.removeItem(this.sessionKey);
  }
}
