import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AssetsService } from '../assets.service';
import { AssetFormComponent } from './asset-form.component';

describe('AssetFormComponent', () => {
  let fixture: ComponentFixture<AssetFormComponent>;
  let component: AssetFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetFormComponent],
      providers: [
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => null
              }
            }
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        },
        {
          provide: AssetsService,
          useValue: {
            getCustomersForDropdown: () => of([]),
            getSitesForDropdown: () => of([]),
            createAsset: () => of({}),
            updateAsset: () => of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssetFormComponent);
    component = fixture.componentInstance;
  });

  it('serializes asset date-only fields at UTC noon to avoid previous-day timezone shifts', () => {
    component.form.patchValue({
      siteId: 'site-1',
      name: 'Cable',
      assetTag: 'CBL-1',
      assetType: 'Cable',
      installedAtUtc: '2026-07-03',
      lastTestedAtUtc: '2026-07-04',
      nextTestDueAtUtc: '2026-07-05'
    });

    const request = (component as unknown as { buildRequest: () => {
      installedAtUtc: string;
      lastTestedAtUtc: string;
      nextTestDueAtUtc: string;
    } }).buildRequest();

    expect(request.installedAtUtc).toBe('2026-07-03T12:00:00.000Z');
    expect(request.lastTestedAtUtc).toBe('2026-07-04T12:00:00.000Z');
    expect(request.nextTestDueAtUtc).toBe('2026-07-05T12:00:00.000Z');
  });
});
