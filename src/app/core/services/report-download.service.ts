import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ReportDownloadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  downloadTestResultReport(testResultId: string): Observable<Blob> {
    return this.http.get(this.buildUrl(`reports/test-result/${testResultId}`), {
      responseType: 'blob'
    });
  }

  savePdf(blob: Blob, fileName: string): void {
    const pdfBlob = blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });

    const url = window.URL.createObjectURL(pdfBlob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    anchor.click();

    window.URL.revokeObjectURL(url);
  }

  buildTestResultReportFileName(reference: string | null | undefined, id: string): string {
    const cleanReference = this.cleanFileName(reference || id || 'test-result-report');
    return `${cleanReference}.pdf`;
  }

  private cleanFileName(value: string): string {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'test-result-report';
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
