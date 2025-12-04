export interface SoftwareSource {
  id: string;
  name: string;          // ex: Salesforce
  vendor?: string;       // éditeur
  kind?: 'saas'|'db'|'file'|'api';
  license?: { type?: string; seats?: number; expiresAt?: string };
  owner?: { name: string; email?: string };
  tags?: string[];
  status?: 'OK'|'WARN'|'CRIT';
}
export type SourceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface SourceHealth {
  id: number;
  name: string;
  type: string;
  status: SourceStatus;
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  lastLatencyMs?: number;
  lastMessage?: string;
}