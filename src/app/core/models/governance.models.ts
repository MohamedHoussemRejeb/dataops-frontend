export type StewardRole = 'owner' | 'steward' | 'viewer';

export interface Person {
  id: string;
  name: string;
  email: string;
  role: StewardRole;
  avatarUrl?: string;
}

export type Sensitivity =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'sensitive'
  | 'pii'
  | 'phi'
  | 'secret';

export type LegalTag = 'rgpd' | 'law25' | 'hipaa' | 'sox' | 'pci';

export interface DatasetSummary {
  urn: string;
  name: string;
  owner?: Person;
  stewards?: Person[];
  sensitivity?: Sensitivity;
  legal?: LegalTag[];
  tags?: string[];
  trust?: number;      // 0..100
  risk?: 'OK' | 'RISK' | 'CRITICAL';
}

export interface AccessEntry {
  person: Person;
  dataset: DatasetSummary;
  access: 'read' | 'write' | 'admin';
  inherited?: boolean;
}

export interface AccessMatrixQuery {
  q?: string;
  role?: StewardRole | 'any';
  sensitivity?: Sensitivity | 'any';
  legal?: LegalTag | 'any';
  // ✅ pagination optionnelle pour éviter les erreurs TS
  page?: number;
  size?: number;
}
