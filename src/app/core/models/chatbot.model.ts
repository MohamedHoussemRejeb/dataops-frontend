export interface ChatReportRequest {
  runAId: number;
  runBId: number;
  provider?: string | null;
  model?: string | null;
  extra?: string | null;
}

export interface ChatReportResponse {
  report: string;   // texte ou markdown
  provider?: string | null;
  model?: string | null;
}
