// src/app/features/runs/workflow-edges/workflow-edges.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WorkflowEdgesApiService } from '../../../core/api/workflow-edges-api.service';
// ✅ Import du modèle depuis le bon fichier
import { WorkflowEdge } from '../../../core/models/workflow-edge.model';

@Component({
  selector: 'app-workflow-edges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-edges.component.html',
  styleUrls: ['./workflow-edges.component.scss']
  // ❌ plus de styleUrls (fichier manquant) → inline styles
})
export class WorkflowEdgesComponent {

  private api = inject(WorkflowEdgesApiService);

  // 🔹 state
  edges    = signal<WorkflowEdge[]>([]);
  loading  = signal<boolean>(false);
  error    = signal<string | null>(null);
  saving   = signal<boolean>(false);

  // 🔎 search
  q        = signal<string>('');

  // ✏️ edge en cours d’édition
  editing  = signal<WorkflowEdge | null>(null);

  constructor() {
    this.reload();
  }

  // =========================================
  // API
  // =========================================
  reload() {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (res) => {
        this.edges.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('workflow edges load error', err);
        this.error.set('Failed to load workflow dependencies');
        this.loading.set(false);
      }
    });
  }

  filteredEdges(): WorkflowEdge[] {
    const q = this.q().toLowerCase().trim();
    let list = this.edges();

    if (q) {
      list = list.filter(e =>
        e.fromJob.toLowerCase().includes(q) ||
        e.toJob.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) =>
      a.fromJob.localeCompare(b.fromJob) || a.toJob.localeCompare(b.toJob)
    );
  }

  // =========================================
  // CRUD
  // =========================================
  newEdge() {
    this.editing.set({
      id: undefined,
      fromJob: '',
      toJob: '',
      enabled: true,
      onSuccessOnly: true
    });
  }

  edit(edge: WorkflowEdge) {
    // on clone pour ne pas muter directement la liste
    this.editing.set({ ...edge });
  }

  cancel() {
    this.editing.set(null);
  }

  save() {
    const current = this.editing();
    if (!current) return;

    this.saving.set(true);

    const obs = current.id
      ? this.api.update(current.id, current)
      : this.api.create(current);

    obs.subscribe({
      next: (saved) => {
        // maj liste locale
        this.edges.update(list => {
          const idx = list.findIndex(e => e.id === saved.id);
          if (idx >= 0) {
            const copy = [...list];
            copy[idx] = saved;
            return copy;
          }
          return [...list, saved];
        });

        this.saving.set(false);
        this.editing.set(null);
      },
      error: (err) => {
        console.error('save workflow edge error', err);
        this.error.set('Failed to save dependency');
        this.saving.set(false);
      }
    });
  }

  remove(edge: WorkflowEdge) {
    if (!edge.id) return;
    if (!confirm(`Delete dependency: ${edge.fromJob} -> ${edge.toJob} ?`)) {
      return;
    }

    this.api.delete(edge.id).subscribe({
      next: () => {
        this.edges.update(list => list.filter(e => e.id !== edge.id));
        if (this.editing()?.id === edge.id) {
          this.editing.set(null);
        }
      },
      error: (err) => {
        console.error('delete workflow edge error', err);
        this.error.set('Failed to delete dependency');
      }
    });
  }

  toggleEnabled(edge: WorkflowEdge) {
    if (!edge.id) return;
    const updated: WorkflowEdge = { ...edge, enabled: !edge.enabled };

    this.api.update(edge.id, updated).subscribe({
      next: (saved) => {
        this.edges.update(list =>
          list.map(e => (e.id === saved.id ? saved : e))
        );
      },
      error: (err) => {
        console.error('toggle enabled error', err);
        this.error.set('Failed to toggle enabled');
      }
    });
  }

  toggleOnSuccess(edge: WorkflowEdge) {
    if (!edge.id) return;
    const updated: WorkflowEdge = { ...edge, onSuccessOnly: !edge.onSuccessOnly };

    this.api.update(edge.id, updated).subscribe({
      next: (saved) => {
        this.edges.update(list =>
          list.map(e => (e.id === saved.id ? saved : e))
        );
      },
      error: (err) => {
        console.error('toggle onSuccessOnly error', err);
        this.error.set('Failed to toggle onSuccessOnly');
      }
    });
  }

  // =========================================
  // helper pour binder le formulaire (signal editing)
  // =========================================
  onEditingChange<K extends keyof WorkflowEdge>(
    key: K,
    value: WorkflowEdge[K]
  ) {
    const current = this.editing();
    if (!current) return;

    this.editing.set({
      ...current,
      [key]: value
    });
  }
}
