import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  ValidationErrors,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';
import {
  AssetDropdownItem,
  CustomerDropdownItem,
  EngineerDropdownItem,
  SiteDropdownItem,
  TestResultCreateRequest,
  TestResultDetails,
  TestResultDraftNotesRequest,
  TestResultMeasurement,
  TestResultMeasurementRequest
} from '../test-result.models';
import { TestResultsService } from '../test-results.service';

@Component({
  selector: 'app-test-result-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './test-result-form.component.html',
  styleUrls: ['./test-result-form.component.scss']
})
export class TestResultFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly testResultsService = inject(TestResultsService);

  @ViewChildren('measurementInput') private readonly measurementInputs?: QueryList<ElementRef<HTMLInputElement>>;

  testResultId = '';
  isEditMode = false;

  customers: CustomerDropdownItem[] = [];
  sites: SiteDropdownItem[] = [];
  assets: AssetDropdownItem[] = [];
  engineers: EngineerDropdownItem[] = [];

  selectedCustomerId = '';
  selectedSiteId = '';

  loadingCustomers = false;
  loadingSites = false;
  loadingAssets = false;
  loadingEngineers = false;
  loadingDetails = false;
  saving = false;
  submitted = false;

  errorMessage = '';
  successMessage = '';

  calculatedStatus = '';
  calculatedRisk = '';

  generatingAiNotes = false;
  aiDraftOpen = false;
  aiDraftNotes = '';
  aiDraftWarnings: string[] = [];
  aiDraftConfidence: number | null = null;
  aiDraftTyping = false;

  private aiDraftTypingTimer: ReturnType<typeof setInterval> | null = null;

  readonly commonMeasurementNames = [
    'Insulation Resistance',
    'Continuity',
    'Earth Fault Loop Impedance',
    'RCD Trip Time',
    'Touch Voltage',
    'Prospective Fault Current'
  ];

  readonly commonUnits = ['MΩ', 'Ω', 'ms', 'V', 'A', 'kA'];

  readonly testTypeOptions = [
    'Insulation Resistance',
    'Continuity',
    'Earth Fault Loop Impedance',
    'RCD Trip Time',
    'Touch Voltage',
    'Prospective Fault Current'
  ];

  form = this.fb.group({
    assetId: ['', Validators.required],
    testReference: [''],
    testType: ['Insulation Resistance', [Validators.required, Validators.maxLength(120)]],
    testDateUtc: [this.getDefaultLocalDateTime(), Validators.required],
    engineerName: ['', [Validators.required, Validators.maxLength(120)]],
    notes: [''],
    measurements: this.fb.array([])
  });

  ngOnInit(): void {
    this.testResultId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditMode = !!this.testResultId;

    this.addMeasurement();
    this.loadCustomers();
    this.loadAssets();
    this.loadEngineers();

    if (this.isEditMode) {
      this.loadTestResult();
    }
  }

  ngOnDestroy(): void {
    this.stopAiDraftTyping();
  }

  get measurements(): UntypedFormArray {
    return this.form.get('measurements') as UntypedFormArray;
  }

  get selectedAsset(): AssetDropdownItem | null {
    const assetId = this.form.get('assetId')?.value;
    return this.assets.find((asset) => asset.id === assetId) ?? null;
  }

  loadCustomers(): void {
    this.loadingCustomers = true;

    this.testResultsService
      .getCustomersForDropdown()
      .pipe(finalize(() => (this.loadingCustomers = false)))
      .subscribe({
        next: (customers) => {
          this.customers = customers;
        },
        error: () => {
          this.customers = [];
        }
      });
  }

  loadSites(customerId?: string): void {
    this.loadingSites = true;

    this.testResultsService
      .getSitesForDropdown(customerId)
      .pipe(finalize(() => (this.loadingSites = false)))
      .subscribe({
        next: (sites) => {
          this.sites = sites;
        },
        error: () => {
          this.sites = [];
        }
      });
  }

  loadAssets(customerId?: string, siteId?: string, keepSelectedAsset = false): void {
    this.loadingAssets = true;
    const currentAssetId = this.form.get('assetId')?.value;

    this.testResultsService
      .getAssetsForDropdown(customerId, siteId)
      .pipe(finalize(() => (this.loadingAssets = false)))
      .subscribe({
        next: (assets) => {
          this.assets = assets;

          if (!keepSelectedAsset && currentAssetId && !assets.some((asset) => asset.id === currentAssetId)) {
            this.form.patchValue({ assetId: '' });
          }
        },
        error: () => {
          this.assets = [];
        }
      });
  }

  loadEngineers(): void {
    this.loadingEngineers = true;

    this.testResultsService
      .getEngineersForDropdown()
      .pipe(finalize(() => (this.loadingEngineers = false)))
      .subscribe({
        next: (engineers) => {
          this.engineers = engineers;
        },
        error: () => {
          this.engineers = [];
        }
      });
  }

  loadTestResult(): void {
    this.loadingDetails = true;
    this.errorMessage = '';

    this.testResultsService
      .getTestResult(this.testResultId)
      .pipe(finalize(() => (this.loadingDetails = false)))
      .subscribe({
        next: (result) => {
          this.patchForm(result);
        },
        error: () => {
          this.errorMessage = 'Test result could not be loaded for editing.';
        }
      });
  }

  onCustomerFilterChange(customerId: string): void {
    this.selectedCustomerId = customerId;
    this.selectedSiteId = '';
    this.sites = [];
    this.form.patchValue({ assetId: '' });

    if (customerId) {
      this.loadSites(customerId);
    }

    this.loadAssets(customerId);
  }

  onSiteFilterChange(siteId: string): void {
    this.selectedSiteId = siteId;
    this.form.patchValue({ assetId: '' });
    this.loadAssets(this.selectedCustomerId, siteId);
  }

  clearAssetFilters(): void {
    this.selectedCustomerId = '';
    this.selectedSiteId = '';
    this.sites = [];
    this.form.patchValue({ assetId: '' });
    this.loadAssets();
  }

  addMeasurement(measurement?: TestResultMeasurement): void {
    this.measurements.push(this.createMeasurementGroup(measurement));
  }

  addCommonMeasurementRows(): void {
    if (this.measurements.length === 1 && this.isBlankMeasurement(this.measurements.at(0) as UntypedFormGroup)) {
      this.measurements.clear();
    }

    const rows = [
      { measurementName: 'Insulation Resistance', unit: 'MΩ', expectedMin: 1 },
      { measurementName: 'Continuity', unit: 'Ω', expectedMax: 1 },
      { measurementName: 'Earth Fault Loop Impedance', unit: 'Ω', expectedMax: 1 },
      { measurementName: 'RCD Trip Time', unit: 'ms', expectedMax: 300 }
    ];

    rows.forEach((row) => {
      const existingIndex = this.findMeasurementIndex(row.measurementName);

      if (existingIndex >= 0) {
        this.measurements.at(existingIndex).patchValue(row);
        return;
      }

      this.measurements.push(this.createMeasurementGroup(row));
    });
  }

  removeMeasurement(index: number): void {
    if (this.measurements.length === 1) {
      this.measurements.at(0).reset({
        measurementName: '',
        value: null,
        unit: 'MΩ',
        expectedMin: null,
        expectedMax: null,
        notes: ''
      });
      return;
    }

    this.measurements.removeAt(index);
  }

  generateAiNotes(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.measurements.length === 0) {
      this.addMeasurement();
    }

    this.syncMeasurementInputs();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete the required fields before generating AI notes.';
      return;
    }

    const request = this.buildDraftNotesRequest();

    if (request.measurements.length === 0) {
      this.errorMessage = 'Add at least one measurement before generating AI notes.';
      return;
    }

    this.aiDraftOpen = true;
    this.stopAiDraftTyping();
    this.aiDraftNotes = '';
    this.aiDraftWarnings = [];
    this.aiDraftConfidence = null;
    this.generatingAiNotes = true;

    this.testResultsService
      .generateDraftNotes(request)
      .pipe(finalize(() => (this.generatingAiNotes = false)))
      .subscribe({
        next: (draft) => {
          this.startAiDraftTyping(draft.notes ?? '');
          this.aiDraftWarnings = draft.missingDataWarnings ?? [];
          this.aiDraftConfidence = draft.confidence ?? null;
        },
        error: (error) => {
          this.stopAiDraftTyping();
          this.aiDraftOpen = false;
          this.errorMessage = this.getApiErrorMessage(error, 'AI notes could not be generated. Please try again.');
        }
      });
  }

  acceptAiDraft(replaceExisting = true): void {
    this.stopAiDraftTyping();
    const draftNotes = this.clean(this.aiDraftNotes);

    if (!draftNotes) {
      this.errorMessage = 'AI draft note is empty.';
      return;
    }

    const currentNotes = this.clean(this.form.get('notes')?.value);
    const nextNotes = !replaceExisting && currentNotes ? `${currentNotes}\n\n${draftNotes}` : draftNotes;

    this.form.patchValue({ notes: nextNotes });
    this.form.get('notes')?.markAsDirty();
    this.aiDraftOpen = false;
    this.successMessage = 'AI draft note was added to Notes. Review it before saving.';
  }

  discardAiDraft(): void {
    this.stopAiDraftTyping();
    this.aiDraftOpen = false;
    this.aiDraftNotes = '';
    this.aiDraftWarnings = [];
    this.aiDraftConfidence = null;
  }

  onAiDraftInput(value: string): void {
    this.stopAiDraftTyping();
    this.aiDraftNotes = value;
  }

  save(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.measurements.length === 0) {
      this.addMeasurement();
    }

    this.syncMeasurementInputs();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete the required fields before saving.';
      return;
    }

    const request = this.buildRequest();

    if (request.measurements.length === 0) {
      this.errorMessage = 'Add at least one measurement before saving.';
      return;
    }

    this.saving = true;

    const saveRequest = this.isEditMode
      ? this.testResultsService.updateTestResult(this.testResultId, request)
      : this.testResultsService.createTestResult(request);

    saveRequest
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (saved) => {
          const savedResult = saved as TestResultDetails | undefined;
          const id = savedResult?.id ?? savedResult?.testResultId ?? this.testResultId;

          this.successMessage = this.isEditMode
            ? 'Test result was updated. Backend recalculated status and risk.'
            : 'Test result was created. Backend calculated status and risk.';

          if (id) {
            this.router.navigate(['/test-results', id]);
            return;
          }

          this.router.navigate(['/test-results']);
        },
        error: (error) => {
          this.errorMessage = this.getApiErrorMessage(
            error,
            'Test result could not be saved. Please check the highlighted fields and try again.'
          );
        }
      });
  }

  getCustomerName(customer: CustomerDropdownItem): string {
    return customer.name ?? customer.companyName ?? customer.customerName ?? 'Unnamed customer';
  }

  getSiteName(site: SiteDropdownItem): string {
    const code = site.siteCode ?? site.code;
    const name = site.name ?? site.siteName ?? 'Unnamed site';
    return code ? `${name} (${code})` : name;
  }

  getAssetLabel(asset: AssetDropdownItem): string {
    const name = asset.name ?? asset.assetName ?? 'Unnamed asset';
    const tag = asset.assetTag ?? asset.tag;

    return tag ? `${name} - ${tag}` : name;
  }

  getAssetMeta(asset: AssetDropdownItem): string {
    const parts = [
      asset.assetType ?? asset.type,
      asset.serialNumber ? `S/N ${asset.serialNumber}` : '',
      asset.siteName,
      asset.customerName ?? asset.customerCompanyName
    ].filter(Boolean);

    return parts.length ? parts.join(' • ') : 'No extra asset information';
  }

  getTestTypeOptions(): string[] {
    const currentTestType = this.clean(this.form.get('testType')?.value);

    return currentTestType && !this.testTypeOptions.includes(currentTestType)
      ? [currentTestType, ...this.testTypeOptions]
      : this.testTypeOptions;
  }

  getEngineerNameOptions(): string[] {
    const options = this.engineers
      .map((engineer) => this.getEngineerDropdownValue(engineer))
      .filter((engineerName, index, names) => !!engineerName && names.indexOf(engineerName) === index);
    const currentEngineerName = this.clean(this.form.get('engineerName')?.value);

    return currentEngineerName && !options.includes(currentEngineerName)
      ? [currentEngineerName, ...options]
      : options;
  }

  getEngineerDropdownValue(engineer: EngineerDropdownItem): string {
    return this.clean(engineer.fullName ?? engineer.name ?? engineer.userName ?? engineer.email);
  }

  getEngineerDropdownLabel(engineerName: string): string {
    const engineer = this.engineers.find((user) => this.getEngineerDropdownValue(user) === engineerName);
    const email = this.clean(engineer?.email);

    return email && email !== engineerName ? `${engineerName} - ${email}` : engineerName;
  }

  getMeasurementGroup(index: number): UntypedFormGroup {
    return this.measurements.at(index) as UntypedFormGroup;
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty || this.submitted);
  }

  isMeasurementControlInvalid(index: number, controlName: string): boolean {
    const control = this.getMeasurementGroup(index).get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty || this.submitted);
  }

  getMeasurementValueError(index: number): string {
    const control = this.getMeasurementGroup(index).get('value');

    if (!control || !(control.touched || control.dirty || this.submitted)) {
      return '';
    }

    const value = this.toNumberOrNull(control.value);

    if (value !== null) {
      return value < 0 ? 'Cannot be negative' : '';
    }

    if (control.value === null || control.value === undefined || control.value === '') {
      return 'Required';
    }

    return 'Enter a valid number';
  }

  getMeasurementThresholdControlError(index: number, controlName: 'expectedMin' | 'expectedMax'): string {
    const control = this.getMeasurementGroup(index).get(controlName);

    if (!control || !(control.touched || control.dirty || this.submitted)) {
      return '';
    }

    const value = this.toNumberOrNull(control.value);

    if (value !== null) {
      return value < 0 ? 'Cannot be negative' : '';
    }

    return control.value === null || control.value === undefined || control.value === ''
      ? ''
      : 'Enter a valid number';
  }

  hasMeasurementThresholdError(index: number): boolean {
    const group = this.getMeasurementGroup(index);
    return group.hasError('invalidThresholdRange') && (group.touched || group.dirty || this.submitted);
  }

  hasExistingNotes(): boolean {
    return !!this.clean(this.form.get('notes')?.value);
  }

  formatConfidence(confidence: number | null): string {
    if (confidence === null || !Number.isFinite(confidence)) {
      return 'Confidence unavailable';
    }

    return `${Math.round(confidence * 100)}% confidence`;
  }

  trackByCustomer(_: number, customer: CustomerDropdownItem): string {
    return customer.id;
  }

  trackBySite(_: number, site: SiteDropdownItem): string {
    return site.id;
  }

  trackByAsset(_: number, asset: AssetDropdownItem): string {
    return asset.id;
  }

  trackByOption(_: number, value: string): string {
    return value;
  }

  trackByMeasurement(index: number): number {
    return index;
  }

  private createMeasurementGroup(
    measurement?: TestResultMeasurement | Partial<TestResultMeasurementRequest> | Record<string, unknown>
  ): UntypedFormGroup {
    const source = measurement as Record<string, unknown> | undefined;

    const measurementName =
      source?.['measurementName'] ??
      source?.['name'] ??
      source?.['parameter'] ??
      source?.['measurementType'] ??
      '';

    const measuredValue =
      source?.['measuredValue'] ??
      source?.['value'] ??
      source?.['readingValue'] ??
      null;

    const expectedMin =
      source?.['expectedMin'] ??
      source?.['minThreshold'] ??
      source?.['minimumAllowedValue'] ??
      source?.['warningMinimumValue'] ??
      null;

    const expectedMax =
      source?.['expectedMax'] ??
      source?.['maxThreshold'] ??
      source?.['maximumAllowedValue'] ??
      source?.['warningMaximumValue'] ??
      null;

    return this.fb.group({
      measurementName: [measurementName, [Validators.required, Validators.maxLength(120)]],
      value: [this.toNumberOrNull(measuredValue), [Validators.required, Validators.min(0)]],
      unit: [source?.['unit'] ?? 'MΩ', [Validators.required, Validators.maxLength(30)]],
      expectedMin: [this.toNumberOrNull(expectedMin), Validators.min(0)],
      expectedMax: [this.toNumberOrNull(expectedMax), Validators.min(0)],
      notes: [source?.['notes'] ?? '']
    }, { validators: this.thresholdRangeValidator() });
  }

  private patchForm(result: TestResultDetails): void {
    this.calculatedStatus = result.status ?? result.resultStatus ?? result.overallStatus ?? '';
    this.calculatedRisk = result.riskLevel ?? result.assetRiskLevel ?? result.calculatedRiskLevel ?? '';

    this.selectedCustomerId = result.customerId ?? '';
    this.selectedSiteId = result.siteId ?? '';

    if (this.selectedCustomerId) {
      this.loadSites(this.selectedCustomerId);
    }

    this.loadAssets(this.selectedCustomerId, this.selectedSiteId, true);

    this.form.patchValue({
      assetId: result.assetId ?? '',
      testReference: result.testReference ?? result.reference ?? result.reportNumber ?? '',
      testType: result.testType ?? 'Insulation Resistance',
      testDateUtc: this.toLocalDateTimeInput(result.testDateUtc ?? result.testedAtUtc ?? result.createdAtUtc),
      engineerName: result.engineerName ?? result.engineerEmail ?? '',
      notes: result.notes ?? result.comments ?? ''
    });

    this.measurements.clear();

    const measurements = [...(result.measurements ?? [])].sort(
      (left, right) => (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER)
    );

    if (measurements.length) {
      measurements.forEach((measurement) => this.addMeasurement(measurement));
      return;
    }

    this.addMeasurement();
  }

  private buildRequest(): TestResultCreateRequest {
    const raw = this.form.getRawValue();

    const measurements = this.measurements.controls
      .map((control, index) => this.mapMeasurement(control as UntypedFormGroup, index))
      .filter((measurement) => !!measurement.measurementType && measurement.value !== null);

    return {
      assetId: this.clean(raw.assetId),
      testReference: this.clean(raw.testReference) || undefined,
      testType: this.clean(raw.testType),
      testDateUtc: this.toUtcIsoString(raw.testDateUtc),
      engineerName: this.clean(raw.engineerName),
      notes: this.clean(raw.notes) || undefined,
      measurements
    };
  }

  private buildDraftNotesRequest(): TestResultDraftNotesRequest {
    const request = this.buildRequest();

    return {
      assetId: request.assetId,
      testReference: request.testReference,
      testType: request.testType,
      testDateUtc: request.testDateUtc,
      engineerName: request.engineerName,
      notes: request.notes,
      measurements: request.measurements
    };
  }

  private mapMeasurement(group: UntypedFormGroup, index: number): TestResultMeasurementRequest {
    const raw = group.getRawValue();

    const measurementType = this.clean(raw.measurementName);
    const value = this.toNumberOrNull(raw.value);
    const minimumAllowedValue = this.toNumberOrNull(raw.expectedMin);
    const maximumAllowedValue = this.toNumberOrNull(raw.expectedMax);
    const notes = this.clean(raw.notes) || undefined;

    return {
      measurementType,
      value,
      unit: this.clean(raw.unit),
      minimumAllowedValue,
      maximumAllowedValue,
      notes,
      displayOrder: index + 1
    };
  }

  private clean(value: unknown): string {
    return String(value ?? '').trim();
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private syncMeasurementInputs(): void {
    this.measurementInputs?.forEach((inputRef) => {
      const input = inputRef.nativeElement;
      const rowIndex = Number(input.dataset['measurementIndex']);
      const controlName = input.dataset['measurementControl'];
      const group = this.measurements.at(rowIndex) as UntypedFormGroup | undefined;
      const control = controlName ? group?.get(controlName) : null;

      if (!control || control.value === input.value) {
        return;
      }

      const value = input.type === 'number' ? this.toNumberOrNull(input.value) : input.value;
      control.setValue(value);
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }

  private startAiDraftTyping(note: string): void {
    this.stopAiDraftTyping();
    this.aiDraftNotes = '';

    if (!note) {
      return;
    }

    let nextIndex = 0;
    this.aiDraftTyping = true;

    this.aiDraftTypingTimer = setInterval(() => {
      const chunkSize = note[nextIndex] === ' ' || note[nextIndex] === '\n' ? 1 : 2;
      nextIndex = Math.min(nextIndex + chunkSize, note.length);
      this.aiDraftNotes = note.slice(0, nextIndex);

      if (nextIndex >= note.length) {
        this.stopAiDraftTyping();
      }
    }, 18);
  }

  private stopAiDraftTyping(): void {
    if (this.aiDraftTypingTimer) {
      clearInterval(this.aiDraftTypingTimer);
      this.aiDraftTypingTimer = null;
    }

    this.aiDraftTyping = false;
  }

  private isBlankMeasurement(group: UntypedFormGroup): boolean {
    const raw = group.getRawValue();

    return (
      !this.clean(raw.measurementName) &&
      this.toNumberOrNull(raw.value) === null &&
      !this.clean(raw.notes) &&
      this.toNumberOrNull(raw.expectedMin) === null &&
      this.toNumberOrNull(raw.expectedMax) === null
    );
  }

  private findMeasurementIndex(measurementName: string): number {
    const normalisedName = measurementName.trim().toLowerCase();

    return this.measurements.controls.findIndex((control) => {
      const group = control as UntypedFormGroup;
      return this.clean(group.get('measurementName')?.value).toLowerCase() === normalisedName;
    });
  }

  private thresholdRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control as UntypedFormGroup;
      const minimumAllowedValue = this.toNumberOrNull(group.get('expectedMin')?.value);
      const maximumAllowedValue = this.toNumberOrNull(group.get('expectedMax')?.value);

      if (
        minimumAllowedValue !== null &&
        maximumAllowedValue !== null &&
        minimumAllowedValue > maximumAllowedValue
      ) {
        return { invalidThresholdRange: true };
      }

      return null;
    };
  }

  private getApiErrorMessage(error: unknown, fallbackMessage: string): string {
    const apiError = error as {
      error?: {
        message?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
      message?: string;
    };

    const validationMessages = apiError.error?.errors
      ? Object.values(apiError.error.errors).flat().filter(Boolean)
      : [];

    return (
      apiError.error?.message ??
      validationMessages[0] ??
      apiError.error?.title ??
      apiError.message ??
      fallbackMessage
    );
  }

  private getDefaultLocalDateTime(): string {
    return this.toLocalDateTimeInput(new Date().toISOString());
  }

  private toUtcIsoString(value: string): string {
    if (!value) {
      return new Date().toISOString();
    }

    return new Date(value).toISOString();
  }

  private toLocalDateTimeInput(value?: string): string {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return localDate.toISOString().slice(0, 16);
  }
}
