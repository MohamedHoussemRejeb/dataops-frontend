export interface PolicyDoc {
  id: string;
  title: string;
  kind: 'policy'|'procedure'|'regulation';
  tags?: string[];  // rgpd, loi25…
  url?: string;     // lien externe
  updatedAt?: string;
  summary?: string;
}