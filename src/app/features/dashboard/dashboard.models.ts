export interface DashboardSummary {
  totalCustomers: number;
  totalSites: number;
  totalAssets: number;
  totalTestResults: number;

  passedTestsCount?: number;
  warningTestsCount: number;
  failedTestsCount: number;

  lowRiskAssetsCount?: number;
  mediumRiskAssetsCount?: number;
  highRiskAssetsCount: number;
  criticalRiskAssetsCount: number;
  unknownRiskAssetsCount?: number;
  notEvaluatedAssetsCount?: number;

  assetsDueForRetestCount: number;

  openJobsCount?: number;
  overdueJobsCount?: number;
  completedJobsLast30DaysCount?: number;

  recentFailedTests: RecentFailedTest[];
  assetsDueForRetest: AssetDueForRetest[];
  priorityJobs?: PriorityJob[];
}

export interface RecentFailedTest {
  id?: string;
  testResultId?: string;
  reference?: string;
  testReference?: string;

  assetId?: string;
  assetName?: string;
  assetTag?: string;

  customerName?: string;
  siteName?: string;

  testType?: string;
  status?: string;
  resultStatus?: string;
  overallStatus?: string;

  riskLevel?: string;
  assetRiskLevel?: string;

  engineerName?: string;
  testDateUtc?: string;
  testedAtUtc?: string;
  createdAtUtc?: string;
  reportNumber?: string;
}

export interface AssetDueForRetest {
  id?: string;
  assetId?: string;

  assetName?: string;
  name?: string;
  assetTag?: string;

  customerName?: string;
  siteName?: string;

  riskLevel?: string;
  assetRiskLevel?: string;

  lastTestDateUtc?: string;
  lastTestedAtUtc?: string;

  nextTestDueUtc?: string;
  nextRetestDueUtc?: string;
  retestDueUtc?: string;
  dueDateUtc?: string;

  daysOverdue?: number;
  daysUntilDue?: number;
}

export interface PriorityJob {
  id?: string;
  jobId?: string;

  assetId?: string;
  assetName?: string;
  assetTag?: string;

  customerName?: string;
  siteName?: string;

  title?: string;
  priority?: string;
  status?: string;
  dueDateUtc?: string | null;
  dueAtUtc?: string | null;
  daysOverdue?: number;
}
