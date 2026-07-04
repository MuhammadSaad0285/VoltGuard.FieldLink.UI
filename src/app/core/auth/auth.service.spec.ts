import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { StorageService } from '../services/storage.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let storage: StorageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        }
      ]
    });

    service = TestBed.inject(AuthService);
    storage = TestBed.inject(StorageService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('reuses a recently validated session without calling /auth/me again', () => {
    storage.setSession({
      accessToken: makeJwt(Date.now() + 60_000),
      email: 'admin@voltguard.local',
      fullName: 'Admin',
      roles: ['Admin']
    });

    let firstSessionEmail = '';
    service.refreshSession().subscribe((session) => {
      firstSessionEmail = session?.email ?? '';
    });

    const request = httpMock.expectOne('https://localhost:7190/api/auth/me');
    request.flush({
      email: 'admin@voltguard.local',
      fullName: 'Admin User',
      roles: ['Admin']
    });

    let secondSessionEmail = '';
    service.refreshSession().subscribe((session) => {
      secondSessionEmail = session?.email ?? '';
    });

    httpMock.expectNone('https://localhost:7190/api/auth/me');
    expect(firstSessionEmail).toBe('admin@voltguard.local');
    expect(secondSessionEmail).toBe('admin@voltguard.local');
  });

  it('clears expired sessions without validating them remotely', () => {
    storage.setSession({
      accessToken: makeJwt(Date.now() - 60_000),
      email: 'admin@voltguard.local',
      fullName: 'Admin',
      roles: ['Admin']
    });

    let sessionExists = true;
    service.refreshSession().subscribe((session) => {
      sessionExists = !!session;
    });

    httpMock.expectNone('https://localhost:7190/api/auth/me');
    expect(sessionExists).toBeFalse();
    expect(storage.getSession()).toBeNull();
  });

  function makeJwt(expiresAtMs: number): string {
    const payload = { exp: Math.floor(expiresAtMs / 1000) };
    return [
      encodeBase64Url({ alg: 'none', typ: 'JWT' }),
      encodeBase64Url(payload),
      'signature'
    ].join('.');
  }

  function encodeBase64Url(value: unknown): string {
    return btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
});
