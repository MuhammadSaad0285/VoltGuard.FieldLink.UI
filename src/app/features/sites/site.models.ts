export interface SiteListItem {
  id: string;

  customerId?: string;
  customerName?: string;
  customerCompanyName?: string;

  name?: string;
  siteName?: string;

  siteCode?: string;
  code?: string;

  siteType?: string;
  type?: string;

  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;

  notes?: string;

  isActive?: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;

  assetsCount?: number;
  assetCount?: number;
}

export interface SiteDetails extends SiteListItem {}

export interface SiteRequest {
  customerId: string;
  name: string;
  siteCode: string;
  siteType: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country: string;
  notes?: string;
}

export interface SiteSearchParams {
  searchTerm?: string;
  customerId?: string;
  pageNumber: number;
  pageSize: number;
}

export interface CustomerDropdownItem {
  id: string;
  name?: string;
  companyName?: string;
  contactPerson?: string;
  contactEmail?: string;
  isActive?: boolean;
}
