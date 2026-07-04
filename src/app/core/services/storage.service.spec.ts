import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores sessions in session storage instead of local storage', () => {
    service.setSession({
      accessToken: 'token',
      email: 'admin@voltguard.local',
      fullName: 'Admin',
      roles: ['Admin']
    });

    expect(sessionStorage.getItem('voltguard_user_session')).toBeTruthy();
    expect(localStorage.getItem('voltguard_user_session')).toBeNull();
  });

  it('clears expired sessions before returning them', () => {
    service.setSession({
      accessToken: 'token',
      email: 'admin@voltguard.local',
      fullName: 'Admin',
      roles: ['Admin'],
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString()
    });

    expect(service.getSession()).toBeNull();
    expect(sessionStorage.getItem('voltguard_user_session')).toBeNull();
  });
});
