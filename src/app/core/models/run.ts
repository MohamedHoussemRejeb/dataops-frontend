export interface RunMetadata {
  id: number;
  rowCountIn?: number | null;
  rowCountOut?: number | null;
  nullPct?: number | null;
  invalidPct?: number | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  executionHost?: string | null;
  latencySec?: number | null;
  cpuPct?: number | null;
  ramMb?: number | null;
  createdAt?: string | null;
}
