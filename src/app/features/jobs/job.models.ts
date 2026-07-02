export type JobStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
export type JobPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type JobType = 'Inspection' | 'Maintenance' | 'Repair' | 'Retest' | 'FollowUp';

export interface JobListItem {
  id: string;

  assetId?: string;
  assetName?: string;
  assetTag?: string;

  customerId?: string;
  customerName?: string;
  customerCompanyName?: string;

  siteId?: string;
  siteName?: string;

  testResultId?: string | null;

  title?: string;
  description?: string;
  jobType?: JobType | string;
  priority?: JobPriority | string;
  status?: JobStatus | string;
  assignedToUserId?: string | null;
  assignedUserId?: string | null;
  assignedTo?: string;
  assignedToName?: string;
  assignedToUserName?: string;
  assignedToEmail?: string;

  scheduledDateUtc?: string | null;
  scheduledAtUtc?: string | null;
  dueDateUtc?: string | null;
  dueAtUtc?: string | null;
  completedAtUtc?: string | null;
  cancelledAtUtc?: string | null;

  daysOverdue?: number;
  isOverdue?: boolean;
  notes?: string;
  createdAtUtc?: string;
  updatedAtUtc?: string;
}

export interface JobDetails extends JobListItem {}

export interface JobSearchParams {
  searchTerm?: string;
  customerId?: string;
  siteId?: string;
  assetId?: string;
  status?: string;
  priority?: string;
  jobType?: string;
  overdueOnly?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface JobRequest {
  assetId: string;
  testResultId?: string | null;
  title: string;
  description?: string;
  jobType: JobType;
  priority: JobPriority;
  assignedTo?: string | null;
  scheduledAtUtc?: string | null;
  dueAtUtc?: string | null;
  notes?: string;
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
  isActive?: boolean;
}
