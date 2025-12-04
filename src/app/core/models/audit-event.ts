// src/app/core/models/audit-event.ts
export type AuditKind = 'upload' | 'retry' | 'ack' | 'run_start' | 'run_end' | 'error' | 'comment';

export interface AuditUser {
  name: string;
  email?: string;
}

export interface AuditEvent {
  id: number;
  kind: AuditKind;
  at: string;            // ISO string from backend
  user: AuditUser;
  meta: any;
}
