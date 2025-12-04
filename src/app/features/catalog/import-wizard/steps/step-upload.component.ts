import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Si tu utilises le service Excel:
import { ExcelParserService } from '../../../../core/excel-parser.service';

@Component({
  standalone: true,
  selector: 'app-step-upload',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="card p-3">
    <label class="form-label">Importer un fichier</label>
    <div class="border rounded p-4 text-center"
         (drop)="onDrop($event)"
         (dragover)="$event.preventDefault()">
      Glissez un fichier CSV / Excel / PDF ici
      <div class="mt-2">
        <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf"
               (change)="onPick($event)" />
      </div>
    </div>

    <div class="mt-3" *ngIf="fileName()">
      <strong>Fichier :</strong> {{ fileName() }}
      <div class="small text-muted">Aperçu des {{ previewRows().length }} premières lignes</div>
    </div>

    <div class="table-responsive mt-2" *ngIf="previewRows().length">
      <table class="table table-sm">
        <thead>
          <tr>
            <th *ngFor="let k of previewKeys()">{{ k }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of previewRows()">
            <td *ngFor="let k of previewKeys()">{{ r[k] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 d-flex gap-2">
      <button class="btn btn-primary btn-sm" [disabled]="!rows().length" (click)="next()">Continuer</button>
      <button class="btn btn-outline-secondary btn-sm" *ngIf="rows().length" (click)="reset()">Réinitialiser</button>
    </div>
  </div>
  `
})
export class StepUploadComponent {
  @Output() done = new EventEmitter<{ rows: any[], schema: any }>();

  fileName = signal<string>('');
  rows = signal<any[]>([]);
  previewRows = signal<any[]>([]);
  previewKeys = () => (this.previewRows()[0] ? Object.keys(this.previewRows()[0]) : []);

  constructor(private excel: ExcelParserService) {}

  onPick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.process(f);
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) this.process(f);
  }

  async process(file: File) {
    this.reset(false);
    this.fileName.set(file.name);
    const ext = file.name.toLowerCase().split('.').pop();

    if (ext === 'csv') {
      const text = await file.text();
      const rows = this.parseCsv(text);
      this.rows.set(rows);
      this.previewRows.set(rows.slice(0, 200));
    } else if (ext === 'xlsx' || ext === 'xls') {
      const { rows } = await this.excel.parse(file);
      this.rows.set(rows);
      this.previewRows.set(rows.slice(0, 200));
    } else if (ext === 'pdf') {
      // Appel backend OCR (à implémenter côté serveur)
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/ocr/extract', { method: 'POST', body: form });
      const data = await res.json(); // { text: string, rows?: any[] }
      const rows = data.rows || [];
      this.rows.set(rows);
      this.previewRows.set(rows.slice(0, 200));
    } else {
      alert('Format non supporté');
      return;
    }
  }

  next() {
    const rows = this.rows();
    const schema = this.inferSchema(rows);
    this.done.emit({ rows, schema });
  }

  reset(clearName = true) {
    if (clearName) this.fileName.set('');
    this.rows.set([]);
    this.previewRows.set([]);
  }

  // Helpers
  private parseCsv(text: string): any[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(s => s.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(s => s.trim());
      const obj: any = {};
      headers.forEach((h, i) => obj[h] = vals[i] ?? null);
      return obj;
    });
  }

  private inferSchema(rows: any[]) {
    const sample = rows.slice(0, 200);
    const cols = Object.keys(sample[0] || {});
    return cols.map(c => {
      const vals = sample.map(r => r?.[c]);
      return {
        name: c,
        type: this.guessType(vals),
        nullable: vals.some(v => v == null || v === '')
      };
    });
  }
  private guessType(vals: any[]) {
    const asStr = (v: any) => String(v ?? '');
    const num = vals.filter(v => /^-?\d+(\.\d+)?$/.test(asStr(v))).length;
    const date = vals.filter(v => !isNaN(Date.parse(asStr(v)))).length;
    if (date > num && date > vals.length * 0.3) return 'date';
    if (num > vals.length * 0.5) return 'number';
    if (new Set(vals.filter(Boolean)).size < vals.length * 0.3) return 'categorical';
    return 'string';
  }
}
