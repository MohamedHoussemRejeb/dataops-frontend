// src/app/features/docs/docs-list.component.ts

import { CommonModule, NgIf, NgFor, DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DocsService, PolicyDoc } from '../../../core/docs.service';
import { StateBlockComponent } from '../../../shared/ui/states/state-block.component';

@Component({
  standalone: true,
  selector: 'app-docs-list',
  imports: [
    CommonModule,
    FormsModule,
    NgIf,
    NgFor,
    DatePipe,
    StateBlockComponent,
  ],
  templateUrl: './docs-list.component.html',
  styleUrls: ['./docs-list.component.scss']
})
export class DocsListComponent {
  loading = signal(true);
  error   = signal<string | null>(null);
  rows    = signal<PolicyDoc[]>([]);

  // filtres (signals)
  q    = signal('');
  kind = signal<string | ''>('');   // valeur envoyée au back dans ?type=
  tag  = signal('');

  // --- Zone admin (upload) ---
  // TODO: plus tard, brancher ça sur ton service d'auth (ex: this.auth.isAdmin())
  showAdminUpload = true;

  newTitle = '';
  newType: 'policy' | 'guideline' | 'procedure' | 'other' = 'policy';
  newSummary = '';
  newTagsText = '';
  selectedFile: File | null = null;
  saving = false;
  saveError: string | null = null;
  saveSuccess = false;

  // liste filtrée côté front (en plus des filtres back)
  filtered = computed(() => {
    const t = this.q().toLowerCase();
    const k = this.kind();
    const g = this.tag().toLowerCase();

    return this.rows().filter(d =>
      (!t ||
        d.title.toLowerCase().includes(t) ||
        (d.summary || '').toLowerCase().includes(t)
      ) &&
      (!k || d.type === k) &&
      (!g || (d.tags || []).some(tag => tag.toLowerCase() === g))
    );
  });

  // public pour utiliser svc dans le template (svc.getFileUrl)
  constructor(public svc: DocsService) {
    this.reload();
  }

  reload = () => {
    this.loading.set(true);
    this.error.set(null);

    this.svc.list({
      type: this.kind() || undefined,
      tag:  this.tag()  || undefined,
      q:    this.q()    || undefined,
    })
    .subscribe({
      next: (docs) => {
        this.rows.set(docs);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erreur chargement documents.');
        this.loading.set(false);
      }
    });
  };

  // --------- Admin upload ---------

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.saveSuccess = false;
    this.saveError = null;
  }

  createDoc() {
    if (!this.selectedFile || !this.newTitle || !this.newType) {
      return;
    }

    this.saving = true;
    this.saveError = null;
    this.saveSuccess = false;

    const tags = this.newTagsText
      .split(',')
      .map(t => t.trim())
      .filter(t => !!t);

    this.svc.create(
      {
        title: this.newTitle,
        type: this.newType,
        summary: this.newSummary,
        tags,
      },
      this.selectedFile
    ).subscribe({
      next: () => {
        this.saving = false;
        this.saveSuccess = true;

        // reset formulaire
        this.newTitle = '';
        this.newSummary = '';
        this.newTagsText = '';
        this.selectedFile = null;

        // recharger la liste
        this.reload();
      },
      error: () => {
        this.saving = false;
        this.saveError = 'Erreur lors de l\'import du document.';
      }
    });
  }
}
