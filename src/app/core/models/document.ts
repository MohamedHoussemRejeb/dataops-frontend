
export interface DocumentDto {
  id?: number;
  title: string;
  type: 'policy' | 'guideline' | 'procedure' | 'other';
  tags: string[];
  summary?: string;
  contentUrl?: string;
  updatedAt?: string;
}
