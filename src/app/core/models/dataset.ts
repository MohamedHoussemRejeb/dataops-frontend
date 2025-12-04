import { Sensitivity, LegalTag } from './governance.models';

export type RunStatus = 'OK' | 'LATE' | 'FAILED' | 'RUNNING' | 'UNKNOWN';

export interface SLA {
  frequency: 'hourly' | 'daily' | 'weekly';
  expectedBy: string;      // ex: '06:00'
  maxDelayMin: number;     // ex: 30
}

export interface Owner {
  name: string;
  email: string;
}

export type Risk = 'OK' | 'RISK' | 'UNKNOWN';

export interface Dataset {
  id: string;
  name: string;
  urn?: string;
  description?: string;

  // 👇 can be optional (safer)
  sla?: SLA;

  lastLoad?: {
    endedAt?: string;
    status: RunStatus;
    durationSec?: number;
  };

  dependencies?: string[];
  // 👇 make optional, because older rows or errors might not have owner
  owner?: Owner;

  domain?: string;
  tags?: string[];
  trust?: number;
  risk?: Risk;
  sensitivity?: Sensitivity;
  legal?: LegalTag[];
}
