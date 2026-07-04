export interface AssetListItem {
  id: string;

  siteId?: string;
  siteName?: string;

  customerId?: string;
  customerName?: string;
  customerCompanyName?: string;

  name?: string;
  assetName?: string;

  assetTag?: string;
  tag?: string;

  serialNumber?: string;
  assetType?: string;
  type?: string;

  manufacturer?: string;
  model?: string;

  locationDescription?: string;
  location?: string;

  ratedVoltage?: number | null;
  ratedCurrent?: number | null;

  installedAtUtc?: string | null;
  installDateUtc?: string | null;

  lastTestedAtUtc?: string | null;
  lastTestDateUtc?: string | null;
  latestTestDateUtc?: string | null;

  nextTestDueAtUtc?: string | null;
  nextTestDueUtc?: string | null;
  nextTestDueDateUtc?: string | null;
  nextRetestDueUtc?: string | null;

  riskLevel?: string;

  isActive?: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;

  notes?: string;
}

export interface AssetDetails extends AssetListItem {
  latestTestResultId?: string;
  latestTestReference?: string;
  latestResultStatus?: string;
  latestOverallStatus?: string;

  testHistory?: AssetTestHistoryItem[];
}

export interface AssetRequest {
  siteId: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  assetType: string;
  manufacturer?: string;
  model?: string;
  locationDescription?: string;
  ratedVoltage?: number | null;
  ratedCurrent?: number | null;
  installedAtUtc?: string | null;
  lastTestedAtUtc?: string | null;
  nextTestDueAtUtc?: string | null;
  notes?: string;
  isActive?: boolean;
}

export interface AssetSearchParams {
  searchTerm?: string;
  customerId?: string;
  siteId?: string;
  includeInactive?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface CustomerDropdownItem {
  id: string;
  name?: string;
  companyName?: string;
  contactEmail?: string;
  isActive?: boolean;
}

export interface SiteDropdownItem {
  id: string;
  customerId?: string;
  customerName?: string;

  name?: string;
  siteName?: string;

  siteCode?: string;
  code?: string;

  city?: string;
  postcode?: string;

  isActive?: boolean;
}

export interface AssetTestHistoryItem {
  id?: string;
  testResultId?: string;

  assetId?: string;
  assetName?: string;
  assetTag?: string;

  testReference?: string;
  reference?: string;
  reportNumber?: string;

  testType?: string;

  testDateUtc?: string;
  testedAtUtc?: string;
  createdAtUtc?: string;

  status?: string;
  resultStatus?: string;
  overallStatus?: string;

  riskLevel?: string;
  calculatedRiskLevel?: string;

  engineerName?: string;
  engineerEmail?: string;

  measurementsCount?: number;
  measurementCount?: number;

  nextTestDueUtc?: string | null;
  nextRetestDueUtc?: string | null;
}
