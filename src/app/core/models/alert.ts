import { Sensitivity, LegalTag } from './governance.models';
export type AlertSeverity = 'INFO'|'WARN'|'ERROR'|'CRITICAL';
export interface EtlAlert {
  id: string;
  createdAt: string;         // ISO
  severity: AlertSeverity;
  source: 'SLA'|'RUN'|'SYSTEM';
  runId?: string;
  flowType?: string;
  message: string;
  acknowledged: boolean;
  dataset_urn?: string; // si ton backend/mock renvoie dataset_urn
  dataset?: {
    sensitivity?: Sensitivity;
    legal?: LegalTag[];
  };
}
