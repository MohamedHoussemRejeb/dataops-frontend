// src/app/features/lineage/column-admin/column-admin.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ColumnAdminApi, DatasetColumn, ColumnEdge } from '../../../core/api/column-admin-api.service';

@Component({
  standalone: true,
  selector: 'app-column-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './column-admin.component.html',
  styleUrls: ['./column-admin.component.scss']
})
export class ColumnAdminComponent implements OnInit {

  private api = inject(ColumnAdminApi);
  private route = inject(ActivatedRoute);

  datasetId!: number;

  // colonnes
  columns: DatasetColumn[] = [];
  editColumn: DatasetColumn = { name: '', type: '', sensitivity: '' };
  isEditingColumn = false;   // false = création, true = update

  // edges
  edges: ColumnEdge[] = [];
  editEdge: ColumnEdge = { fromColumnId: 0, toColumnId: 0, kind: 'copy' };
  isEditingEdge = false;

  loading = false;
  errorMsg = '';

  ngOnInit() {
    // on récupère l'id du dataset depuis l'URL : /lineage/columns-admin/:id
    this.datasetId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.datasetId) {
      this.errorMsg = 'Dataset ID manquant dans l’URL.';
      return;
    }
    this.reloadAll();
  }

  reloadAll() {
    this.loadColumns();
    this.loadEdges();
  }

  // --------- COLUMNS ---------

  loadColumns() {
    this.api.listColumns(this.datasetId).subscribe({
      next: cols => this.columns = cols,
      error: err => {
        console.error(err);
        this.errorMsg = 'Erreur lors du chargement des colonnes.';
      }
    });
  }

  startCreateColumn() {
    this.isEditingColumn = false;
    this.editColumn = { name: '', type: '', sensitivity: '' };
  }

  startEditColumn(col: DatasetColumn) {
    this.isEditingColumn = true;
    this.editColumn = { ...col };
  }

  saveColumn() {
    if (!this.editColumn.name?.trim()) return;

    const payload: DatasetColumn = {
      id: this.editColumn.id,
      name: this.editColumn.name.trim(),
      type: this.editColumn.type?.trim(),
      sensitivity: this.editColumn.sensitivity?.trim()
    };

    const obs = this.isEditingColumn
      ? this.api.updateColumn(this.datasetId, payload)
      : this.api.createColumn(this.datasetId, payload);

    obs.subscribe({
      next: () => {
        this.startCreateColumn();
        this.loadColumns();
      },
      error: err => {
        console.error(err);
        this.errorMsg = 'Erreur lors de l’enregistrement de la colonne.';
      }
    });
  }

  deleteColumn(col: DatasetColumn) {
    if (!col.id) return;
    if (!confirm(`Supprimer la colonne "${col.name}" ?`)) return;

    this.api.deleteColumn(this.datasetId, col.id).subscribe({
      next: () => {
        this.loadColumns();
        this.loadEdges(); // au cas où des edges pointent vers cette colonne
      },
      error: err => {
        console.error(err);
        this.errorMsg = 'Erreur lors de la suppression de la colonne.';
      }
    });
  }

  // --------- EDGES ---------

  loadEdges() {
    this.api.listEdges(this.datasetId).subscribe({
      next: edges => this.edges = edges,
      error: err => {
        console.error(err);
        this.errorMsg = 'Erreur lors du chargement des liens.';
      }
    });
  }

  startCreateEdge() {
    this.isEditingEdge = false;
    this.editEdge = {
      id: undefined,
      fromColumnId: 0,
      toColumnId: 0,
      kind: 'copy'
    };
  }

  startEditEdge(edge: ColumnEdge) {
    this.isEditingEdge = true;
    this.editEdge = { ...edge };
  }

  saveEdge() {
    if (!this.editEdge.fromColumnId || !this.editEdge.toColumnId) return;
    if (this.editEdge.fromColumnId === this.editEdge.toColumnId) return;

    const payload: ColumnEdge = {
      id: this.editEdge.id,
      fromColumnId: this.editEdge.fromColumnId,
      toColumnId: this.editEdge.toColumnId,
      kind: this.editEdge.kind?.trim() || 'copy'
    };

    const obs = this.isEditingEdge
      ? this.api.updateEdge(payload)
      : this.api.createEdge(payload);

    obs.subscribe({
      next: () => {
        this.startCreateEdge();
        this.loadEdges();
      },
      error: err => {
        console.error(err);
        this.errorMsg = 'Erreur lors de l’enregistrement du lien.';
      }
    });
  }

  deleteEdge(edge: ColumnEdge) {
    if (!edge.id) return;
    if (!confirm('Supprimer ce lien de colonnes ?')) return;

    this.api.deleteEdge(edge.id).subscribe({
      next: () => this.loadEdges(),
      error: err => {
        console.error(err);
        this.errorMsg = 'Erreur lors de la suppression du lien.';
      }
    });
  }

  // helpers pour le template
  columnLabel(id: number | undefined): string {
    const c = this.columns.find(col => col.id === id);
    return c ? c.name : '(?)';
  }
}
