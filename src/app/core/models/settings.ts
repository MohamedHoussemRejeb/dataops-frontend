export interface CustomFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required?: boolean;   // ✅ Add this
  help?: string; 
}
// --- Gabarits (templates) par famille de datasets ---
export interface SchemaTemplate {
  id: string;                 // ex: "crm"
  name: string;               // ex: "CRM"
  fields: CustomFieldDef[];   // champs proposés par défaut
}
export interface AppSettings {
  darkMode: boolean;
  thresholds: {
    maxDurationMin: number;
    errorRateWarn: number;
    errorRateCrit: number;
    freshnessOkMin: number;
    freshnessWarnMin: number;
    nullWarnPct: number;
    nullCritPct: number;
  };
  colors: {
    OK: string; RUNNING: string; LATE: string; FAILED: string; UNKNOWN: string;
  };
  /** Champs personnalisés visibles/éditables sur la fiche dataset */
  customFields?: CustomFieldDef[];
  templates?: SchemaTemplate[];
}