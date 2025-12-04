export interface RetryParams {
  startFrom?: string;                 // ISO string (date de reprise)
  ignoreValidations?: string[];       // codes validations à ignorer
  priority?: 'LOW'|'NORMAL'|'HIGH';
  dryRun?: boolean;                   // exécuter sans écrire
  comment?: string;                   // note opérateur
}