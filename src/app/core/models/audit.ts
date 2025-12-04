// src/app/core/models/audit.ts
export interface AuditDiffField {
  old: any;
  new: any;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  payloadBefore?: any;
  payloadAfter?: any;
  payloadDiff?: { [key: string]: AuditDiffField };
}

export interface AuditPage {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
