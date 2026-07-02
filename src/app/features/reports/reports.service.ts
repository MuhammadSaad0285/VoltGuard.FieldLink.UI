import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiUrlService } from '../../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService
  ) {}

  downloadTestResultReport(testResultId: string): Observable<Blob> {
    return this.http.get(this.apiUrl.url(`reports/test-result/${testResultId}`), {
      responseType: 'blob'
    });
  }
}
