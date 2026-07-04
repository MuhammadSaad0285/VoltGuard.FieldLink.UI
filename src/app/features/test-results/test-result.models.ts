export interface TestResultListItem {
  id?: string;
  testResultId?: string;

  testReference?: string;
  reference?: string;
  reportNumber?: string;

  customerId?: string;
  customerName?: string;
  customerCompanyName?: string;

  siteId?: string;
  siteName?: string;

  assetId?: string;
  assetName?: string;
  assetTag?: string;

  testType?: string;
  testDateUtc?: string;
  testedAtUtc?: string;
  createdAtUtc?: string;

  engineerName?: string;
  engineerEmail?: string;

  status?: string;
  resultStatus?: string;
  overallStatus?: string;

  riskLevel?: string;
  calculatedRiskLevel?: string;

  measurementsCount?: number;
  measurementCount?: number;
}

export interface TestResultDetails extends TestResultListItem {
  serialNumber?: string;
  assetType?: string;
  manufacturer?: string;
  model?: string;
  locationDescription?: string;
  location?: string;

  notes?: string;
  comments?: string;
  recommendation?: string;
  recommendations?: string;

  updatedAtUtc?: string;
  nextTestDueUtc?: string;
  nextRetestDueUtc?: string;

  measurements?: TestResultMeasurement[];
}

export interface TestResultMeasurement {
  id?: string;

  name?: string;
  measurementName?: string;
  parameter?: string;
  measurementType?: string;

  value?: number | string | null;
  measuredValue?: number | string | null;
  readingValue?: number | string | null;

  unit?: string;
  expectedValue?: string;
  expectedMin?: number | string | null;
  expectedMax?: number | string | null;
  minimumAllowedValue?: number | string | null;
  maximumAllowedValue?: number | string | null;
  warningMinimumValue?: number | string | null;
  warningMaximumValue?: number | string | null;
  minThreshold?: number | string | null;
  maxThreshold?: number | string | null;
  thresholdDescription?: string;
  displayOrder?: number | null;

  status?: string;
  resultStatus?: string;
  evaluationStatus?: string;

  notes?: string;
}

export interface TestResultSearchParams {
  searchTerm?: string;
  customerId?: string;
  siteId?: string;
  assetId?: string;
  status?: string;
  riskLevel?: string;
  dateFrom?: string;
  dateTo?: string;
  pageNumber: number;
  pageSize: number;
}

export interface CustomerDropdownItem {
  id: string;
  name?: string;
  companyName?: string;
  customerName?: string;
  contactEmail?: string;
  isActive?: boolean;
}

export interface SiteDropdownItem {
  id: string;
  customerId?: string;
  name?: string;
  siteName?: string;
  siteCode?: string;
  code?: string;
  city?: string;
  postcode?: string;
  isActive?: boolean;
}

export interface AssetDropdownItem {
  id: string;
  customerId?: string;
  customerName?: string;
  customerCompanyName?: string;

  siteId?: string;
  siteName?: string;

  name?: string;
  assetName?: string;
  assetTag?: string;
  tag?: string;

  serialNumber?: string;
  assetType?: string;
  type?: string;
  locationDescription?: string;
  location?: string;

  riskLevel?: string;

  isActive?: boolean;
}

export interface EngineerDropdownItem {
  id: string;
  fullName?: string;
  name?: string;
  userName?: string;
  email?: string;
  roles?: string[];
  isActive?: boolean;
}

export interface TestResultMeasurementRequest {
  measurementType: string;
  phase?: string;

  value: number | null;
  unit: string;

  minimumAllowedValue?: number | null;
  maximumAllowedValue?: number | null;
  warningMinimumValue?: number | null;
  warningMaximumValue?: number | null;

  notes?: string;
  displayOrder: number;
}

export interface TestResultCreateRequest {
  assetId: string;
  testReference?: string;
  testType: string;
  testDateUtc: string;
  engineerName: string;
  notes?: string;
  measurements: TestResultMeasurementRequest[];
}

export interface TestResultUpdateRequest extends TestResultCreateRequest {}

export interface TestResultDraftNotesRequest {
  assetId: string;
  testReference?: string;
  testType: string;
  testDateUtc: string;
  engineerName: string;
  notes?: string;
  measurements: TestResultMeasurementRequest[];
}

export interface TestResultDraftNotesResponse {
  notes: string;
  missingDataWarnings?: string[];
  confidence?: number | null;
}


