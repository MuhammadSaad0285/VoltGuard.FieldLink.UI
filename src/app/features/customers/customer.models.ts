export interface CustomerListItem {
  id: string;

  name?: string;
  companyName?: string;

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

  sitesCount?: number;
  siteCount?: number;
  assetsCount?: number;
  assetCount?: number;
}

export interface CustomerDetails extends CustomerListItem {}

export interface CustomerRequest {
  name: string;
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

export interface CustomerSearchParams {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}
