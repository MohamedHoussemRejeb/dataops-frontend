import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-ocr-upload',
  imports: [CommonModule],
  templateUrl: './ocr-upload.component.html'
})
export class OcrUploadComponent {
  @Output() extracted = new EventEmitter<{ text: string; rows?: any[]; fileName?: string }>();

  loading = signal(false);
  error = signal<string | null>(null);
  previewText = signal<string>('');
  previewTable = signal<any[]>([]);

  get tableKeys() {
    const r = this.previewTable()[0];
    return r ? Object.keys(r) : [];
  }

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
    this.loading.set(true);
    this.error.set(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/ocr/extract', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); // { text: string, rows?: any[] }

      this.previewText.set(data?.text || '');
      this.previewTable.set(Array.isArray(data?.rows) ? data.rows : []);

      // remonte au parent pour intégration dans le wizard
      this.extracted.emit({ text: data?.text || '', rows: data?.rows || [], fileName: file.name });
    } catch (e: any) {
      this.error.set(e?.message || 'Erreur OCR');
    } finally {
      this.loading.set(false);
    }
  }
}
