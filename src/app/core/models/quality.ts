export type QualityMetric = 'error_rate' | 'freshness_min' | 'null_rate';

export interface QualitySummary {
  error_rate: number;      // 0..1
  freshness_min: number;   // minutes
  null_rate: number;       // 0..1
  lastUpdated: string;
}

export interface TimePoint {
  t: string;   // ISO date
  v: number;   // value
}

export interface QualitySeries {
  metric: QualityMetric;
  range: '7d' | '30d';
  points: TimePoint[];
}

export interface HeatCell {
  dataset: string;
  check: string; // ex: 'freshness','null_rate','error_rate'
  value: number; // normalized 0..1 or minutes for freshness
}

export interface Heatmap {
  datasets: string[];   // rows
  checks: string[];     // columns
  data: HeatCell[];     // flat
}

export interface ColumnProfile {
  datasetUrn: string;
  column: string;
  type: string;
  min?: number | string;
  max?: number | string;
  nullRate: number;       // 0..1
  distinct: number;
  topK: Array<{ value: string; count: number }>;
  histogram?: Array<{ bin: string; count: number }>;
}

/* ✅ Ajouts pour les règles qualité (Soda/Airflow style) */

export type QualityTestStatus = 'OK' | 'FAILED' | 'WARN';

export type QualityDimension =
  | 'freshness'
  | 'volume'
  | 'nulls'
  | 'validity'
  | 'uniqueness'
  | 'custom';

export interface QualityTestHistoryPoint {
  date: string;   // ISO date string
  value: number;  // ex: 3.2 (% nulls, minutes, etc.)
}

export interface QualityTest {
  id: string;

  // Règle
  name: string;           // "NULL rate < 5%"
  description?: string;   // tooltip éventuel
  dimension: QualityDimension;

  // Scope
  datasetUrn: string;
  column?: string | null; // null => règle dataset-level

  // Résultat courant
  status: QualityTestStatus;
  currentValue?: number | null;  // ex: 3.4 (%)
  threshold?: number | null;     // ex: 5 (%)

  // Historique (7 derniers jours)
  history?: QualityTestHistoryPoint[];
}
