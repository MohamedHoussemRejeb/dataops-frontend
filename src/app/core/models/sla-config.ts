export interface SlaConfig {
  maxDurationMin?: number;
  warningErrorRate?: number;
  criticalErrorRate?: number;

  freshness?: {
    ok?: number;
    warn?: number;
    late?: number;
  };

  rules?: Array<{
    ifDatasetNameEquals?: string;
    overrides?: { [key: string]: any };
  }>;
}
