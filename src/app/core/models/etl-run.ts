// =========================
//  ETL RUN — FRONT MODEL
// =========================

export type Status =
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING'
  | 'UNKNOWN';

/**
 * FlowType = code fonctionnel de ton flux.
 *
 * On accepte :
 * - les codes métier historiques : 'ARTICLES', 'COMMANDES', ...
 * - les codes liés aux jobs Talend : 'TALEND_ARTICLE', ...
 * - 'UNKNOWN' pour fallback.
 */
export type FlowType =
  | 'ARTICLES'
  | 'COMMANDES'
  | 'EXPEDITIONS'
  | 'ANNULATIONS'
  | 'MOUVEMENTS'
  | 'TALEND_ARTICLE'
  | 'TALEND_COMMANDE'
  | 'TALEND_ANNULATION'
  | 'TALEND_MVT_STOCK'
  | 'UNKNOWN';

export type Trigger =
  | 'MANUAL'
  | 'SCHEDULED'
  | 'RETRY';

// =========================
//  Main ETL Run entity
// =========================
export interface EtlRun {
  id: string;

  // Identité / flow
  flowType: FlowType;
  status: Status;

  // Timing
  startTime: string;
  endTime?: string | null;

  durationMs?: number;

  // Rows
  rowsIn?: number;
  rowsOut?: number;
  rowsError?: number;

  // File input (optionnel)
  sourceFile?: string | null;

  // Tâches / retry
  trigger: Trigger;
  dryRun?: boolean;
  progress?: number | null;
  retryParams?: any;

  // Message simple (SUCCESS | FAILED)
  message?: string;
}

// =========================
//   Run Metadata (advanced)
// =========================
export interface RunMetadata {
  id: number;

  // volumes
  rowCountIn?: number | null;
  rowCountOut?: number | null;

  // qualité
  nullPct?: number | null;
  invalidPct?: number | null;

  // source file info
  fileName?: string | null;
  fileSizeBytes?: number | null;

  // infra
  executionHost?: string | null;
  latencySec?: number | null;
  cpuPct?: number | null;
  ramPct?: number | null;

  createdAt?: string | null;
}
