export type AuditAction = 'Created' | 'Updated' | 'Deleted' | string;

export interface AuditLogItem {
  id: string;
  timestampUtc: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValuesJson: string | null;
  newValuesJson: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

export interface AuditLogSearchParams {
  actorEmail?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromUtc?: string;
  toUtc?: string;
  search?: string;
  pageNumber: number;
  pageSize: number;
}

export interface AuditFieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}
