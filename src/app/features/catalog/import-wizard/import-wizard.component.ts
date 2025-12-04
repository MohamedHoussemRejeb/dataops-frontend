import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  DatasetService,
  BulkDatasetRow,
  BulkImportPayload,
  BulkImportResult
} from '../../../core/dataset.service';

import { StepUploadComponent } from './steps/step-upload.component';   // CSV/XLSX
import { OcrUploadComponent } from '../../ocr/ocr-upload.component';   // PDF OCR

type Mapping = {
  name: string;
  domain?: string;
  description?: string;
  owner_name?: string;
  owner_email?: string;
  tags?: string;
  fields?: string;
};

@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, StepUploadComponent, OcrUploadComponent],
  templateUrl: './import-wizard.component.html',
  styleUrls: ['./import-wizard.component.scss']
})
export class ImportWizardComponent {
  private ds = inject(DatasetService);

  // Étapes: 1=Upload, 2=Mapping, 3=Preview, 4=Commit
  step = signal<1 | 2 | 3 | 4>(1);

  fileName = signal<string>('');
  headers  = signal<string[]>([]);
  rows     = signal<Record<string, string>[]>([]);
  ocrText  = signal<string>('');

  readonly targetKeys: (keyof Mapping)[] = [
    'name','domain','description','owner_name','owner_email','tags','fields'
  ];
  mapping = signal<Record<keyof Mapping, string | undefined>>({
    name: undefined,
    domain: undefined,
    description: undefined,
    owner_name: undefined,
    owner_email: undefined,
    tags: undefined,
    fields: undefined
  });

  // ====== PREVIEW calculé ======
  preview = computed<BulkDatasetRow[]>(() => {
    const rows = this.rows();
    const map  = this.mapping();
    if (!rows.length || !map.name) return [];

    const out: BulkDatasetRow[] = rows.map(r => {
      const row: BulkDatasetRow = { name: pick(r, map.name) };
      if (map.domain)       row.domain       = pick(r, map.domain);
      if (map.description)  row.description  = pick(r, map.description);
      if (map.owner_name)   row.owner_name   = pick(r, map.owner_name);
      if (map.owner_email)  row.owner_email  = pick(r, map.owner_email);

      if (map.tags) {
        const raw = pick(r, map.tags);
        row.tags = raw ? raw.split('|').map(s => s.trim()).filter(Boolean) : [];
      }
      if (map.fields) {
        try {
          const raw = pick(r, map.fields);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              row.fields = parsed
                .map((f: any) => ({
                  name: String(f?.name ?? ''),
                  type: f?.type ? String(f.type) : undefined,
                  description: f?.description ? String(f.description) : undefined
                }))
                .filter(f => f.name);
            }
          }
        } catch {}
      }
      return row;
    });

    return out.filter(r => !!r.name);
  });

  committing = signal(false);
  result     = signal<BulkImportResult | null>(null);
  error      = signal<string | null>(null);

  // ====== Upload CSV/XLSX ======
  onUploadDone(e: { rows?: any[]; schema?: any; fileName?: string }) {
    this.error.set(null);

    const src = Array.isArray(e?.rows) ? e!.rows : [];
    const norm = src.map(anyToStringRecord);

    // ⬅️ UNION des clés sur toutes les lignes
    const hdrs = Array.from(new Set(norm.flatMap(r => Object.keys(r))));

    this.fileName.set(e.fileName || '');
    this.headers.set(hdrs);
    this.rows.set(norm);
    this.mapping.set(this.autoMapFrom(hdrs));
    this.step.set(2);
  }

  // ====== Upload OCR PDF ======
  onOcrExtract(e: { rows?: any[]; text?: string; fileName?: string }) {
    this.error.set(null);
    this.ocrText.set(e?.text || '');
    this.fileName.set(e?.fileName || 'ocr.pdf');

    // 1) Normalise les rows si présentes (backend)
    let norm: Record<string,string>[] =
      Array.isArray(e?.rows) && e!.rows.length ? e!.rows.map(anyToStringRecord) : [];

    // 2) Pivot "vertical → tabulaire"
    if (!norm.length && this.ocrText()) {
      const pivot = this.pivotFromVerticalText(this.ocrText());
      if (pivot.length) norm = pivot;
    }

    // 3) Header horizontal
    if (!norm.length && this.ocrText()) {
      norm = this.extractRowsFromText(this.ocrText());
    }

    // 4) Promotion de la 1re ligne si col1/col2...
    norm = this.promoteHeaderIfNeeded(norm);

    // ⬅️ UNION des clés sur toutes les lignes
    const hdrs = Array.from(new Set(norm.flatMap(r => Object.keys(r))));

    if (!hdrs.length) {
      this.headers.set([]);
      this.rows.set([]);
      this.error.set(
        "Aucune colonne détectée dans le PDF. Ajoute une première ligne d'en-têtes " +
        "(ex: name  domain  owner_email  tags) ou essaie un PDF plus net."
      );
      this.step.set(1);
      return;
    }

    this.headers.set(hdrs);
    this.rows.set(norm);
    this.mapping.set(this.autoMapFrom(hdrs));
    this.step.set(2);
  }

  // ===== Promotion de la 1re ligne comme en-têtes =====
  private promoteHeaderIfNeeded(rows: Record<string,string>[]): Record<string,string>[] {
    if (!rows.length) return rows;

    const keys = Object.keys(rows[0]);
    const looksGeneric = keys.every(k => /^col\d+$/i.test(k));
    if (!looksGeneric) return rows;

    const first = rows[0];
    const headerCandidates = keys.map(k => (first[k] || '').trim());
    const plausible = new Set(['name','domain','owner_name','owner_email','tags','fields','description']);
    const hitCount = headerCandidates.map(h => h.toLowerCase()).filter(h => plausible.has(h)).length;
    if (hitCount < 2) return rows;

    const newHeaders = headerCandidates.map((h, i) => h || `col${i+1}`);
    const remapped = rows.slice(1).map(r => {
      const obj: Record<string,string> = {};
      newHeaders.forEach((h, i) => { obj[h] = r[`col${i+1}`] ?? ''; });
      return obj;
    });
    return remapped;
  }

  // ===== Extraction à partir du texte (header horizontal) =====
  private extractRowsFromText(text: string): Record<string,string>[] {
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const split = (line: string) =>
      line.includes('\t')
        ? line.split('\t').map(s => s.trim()).filter(Boolean)
        : line.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);

    const plausible = new Set(['name','domain','owner_name','owner_email','tags','fields','description']);
    let headerIdx = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
      const parts = split(rawLines[i]);
      if (parts.length >= 2) {
        const hits = parts.map(p => p.toLowerCase()).filter(p => plausible.has(p)).length;
        if (hits >= 2) { headerIdx = i; headers = parts; break; }
      }
    }

    if (headerIdx === -1) {
      for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
        const parts = split(rawLines[i]);
        if (parts.length >= 3) { headerIdx = i; headers = parts; break; }
      }
    }

    if (headerIdx === -1 || !headers.length) return [];

    const out: Record<string,string>[] = [];
    for (let i = headerIdx + 1; i < rawLines.length; i++) {
      const parts = split(rawLines[i]);
      if (!parts.length) continue;
      const row: Record<string,string> = {};
      headers.forEach((h, idx) => { row[h] = parts[idx] ?? ''; });
      const nonEmpty = Object.values(row).some(v => v && v.trim());
      if (nonEmpty) out.push(row);
    }
    return out;
  }

  // ===== Pivot "vertical → tabulaire" =====
  private pivotFromVerticalText(text: string): Array<Record<string, string>> {
    if (!text) return [];

    const normalizeLabel = (s: string) => {
      const k = s.trim().toLowerCase().replace(/\s+/g, '_');
      if (k === 'owner' || k === 'ownername') return 'owner_name';
      if (k === 'owner_email' || k === 'owneremail' || k === 'owner_mail') return 'owner_email';
      return k;
    };

    const rowsByLabel: Record<string, string[]> = {};
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const m = line.match(/^([A-Za-z_ ][A-Za-z0-9_ \-']*)\s+(.+)$/);
      if (!m) continue;

      const label = normalizeLabel(m[1]);
      if (!['name','domain','description','owner_name','owner_email','tags','fields'].includes(label)) continue;

      const parts = line.includes('\t')
        ? m[2].split(/\t+/).map(s => s.trim()).filter(Boolean)
        : m[2].split(/\s{2,}/).map(s => s.trim()).filter(Boolean);

      if (!parts.length) continue;
      rowsByLabel[label] = parts;
    }

    const labels = Object.keys(rowsByLabel);
    if (!labels.length) return [];

    const maxLen = Math.max(...labels.map(k => rowsByLabel[k].length));
    const out: Array<Record<string, string>> = [];
    for (let i = 0; i < maxLen; i++) {
      const r: Record<string, string> = {};
      // ⬅️ on écrit TOUTES les clés, même si la valeur est vide
      for (const k of labels) r[k] = rowsByLabel[k][i] ?? '';
      // au moins une valeur non vide → on garde la ligne
      if (Object.values(r).some(v => v && String(v).trim() !== '')) out.push(r);
    }
    return out;
  }

  // ===== Navigation =====
  setMapping(key: keyof Mapping, header: string | undefined) {
    const cur = { ...this.mapping() };
    cur[key] = header || undefined;
    this.mapping.set(cur);
  }

  next() {
    const s = this.step();
    if (s === 1) {
      if (!this.rows().length) { this.error.set('Importe d’abord un fichier.'); return; }
      this.error.set(null);
      this.step.set(2);
      return;
    }
    if (s === 2) {
      if (!this.mapping().name) { this.error.set('Le champ "name" doit être mappé.'); return; }
      this.error.set(null);
    }
    this.step.set((s + 1) as 1 | 2 | 3 | 4);
  }

  prev() {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as 1 | 2 | 3 | 4);
  }

  // ===== Commit =====
  commit() {
    const payload: BulkImportPayload = {
      rows: this.preview(),
      source: { filename: this.fileName(), rows: this.rows().length }
    };
    this.error.set(null);
    this.result.set(null);
    this.setCommitting(true);

    this.ds.bulkImport(payload).subscribe({
      next: res => { this.setCommitting(false); this.result.set(res); this.step.set(4); },
      error: e => {
        this.setCommitting(false);
        const msg = typeof e?.error === 'string' ? e.error : e?.error?.message || 'Erreur lors de l’import.';
        this.error.set(msg);
      }
    });
  }

  private setCommitting(on: boolean) { this.committing.set(on); }

  fieldsSummary(r: BulkDatasetRow): string {
    const f = r.fields || [];
    if (!f.length) return '—';
    return f.map(x => `${x.name}${x.type ? ':' + x.type : ''}`).join(', ');
  }

  // ===== Helpers =====
  private autoMapFrom(hdrs: string[]) {
    const pick = (cands: string[]) => {
      const lower = new Set(hdrs.map(h => h.toLowerCase()));
      for (const c of cands) {
        const hit = hdrs.find(h => h.toLowerCase() === c.toLowerCase());
        if (hit) return hit;
      }
      return undefined;
    };
    return {
      name:        pick(['name','dataset','nom','titre']),
      domain:      pick(['domain','domaine']),
      description: pick(['description','desc']),
      owner_name:  pick(['owner_name','owner','proprietaire','ownername']),
      owner_email: pick(['owner_email','email','mail','owneremail']),
      tags:        pick(['tags','etiquettes']),
      fields:      pick(['fields','schema','columns'])
    } as Record<keyof Mapping, string | undefined>;
  }
}

function anyToStringRecord(r: any): Record<string,string> {
  const out: Record<string,string> = {};
  for (const k of Object.keys(r || {})) out[k] = r[k] == null ? '' : String(r[k]);
  return out;
}
function pick(row: Record<string,string>, header?: string): string {
  return header ? (row[header] ?? '') : '';
}
