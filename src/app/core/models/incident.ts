export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'OPEN' | 'ACK' | 'RESOLVED';

export interface Incident {
  id: string;
  title: string;
  message?: string;
  datasetId?: string;
  severity: Severity;
  status: IncidentStatus;
  createdAt: string;   // ISO
  lastSeenAt?: string; // ISO
}
