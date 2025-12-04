import { Component, Inject } from '@angular/core';
import { NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { RetryParams } from '../../../core/models/retry-params';

@Component({
  selector: 'app-retry-dialog',
  standalone: true,
  imports: [
    NgIf, NgForOf, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatCheckboxModule, MatSelectModule, MatDatepickerModule,
    MatNativeDateModule, MatButtonModule
  ],
  template: `
  <h2 mat-dialog-title>Relancer avec paramètres</h2>
  <div mat-dialog-content class="d-flex flex-column gap-3">

    <mat-form-field appearance="outline">
      <mat-label>Reprocess depuis (date)</mat-label>
      <input matInput [matDatepicker]="dp" [(ngModel)]="startDate">
      <mat-datepicker-toggle matSuffix [for]="dp"></mat-datepicker-toggle>
      <mat-datepicker #dp></mat-datepicker>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Priorité</mat-label>
      <mat-select [(ngModel)]="priority">
        <mat-option value="LOW">LOW</mat-option>
        <mat-option value="NORMAL">NORMAL</mat-option>
        <mat-option value="HIGH">HIGH</mat-option>
      </mat-select>
    </mat-form-field>

    <div>
      <div class="mb-2 fw-semibold">Ignorer validations</div>
      <mat-checkbox [(ngModel)]="ign.schema">Schéma</mat-checkbox><br>
      <mat-checkbox [(ngModel)]="ign.duplicates">Doublons</mat-checkbox><br>
      <mat-checkbox [(ngModel)]="ign.ref">Référentiel</mat-checkbox><br>
      <mat-checkbox [(ngModel)]="ign.thresholds">Seuils</mat-checkbox>
    </div>

    <mat-checkbox [(ngModel)]="dryRun">Dry-run (sans écriture)</mat-checkbox>

    <mat-form-field appearance="outline">
      <mat-label>Commentaire</mat-label>
      <textarea matInput rows="3" [(ngModel)]="comment"></textarea>
    </mat-form-field>
  </div>

  <div mat-dialog-actions class="justify-content-end">
    <button mat-button mat-dialog-close>Annuler</button>
    <button mat-flat-button color="primary" (click)="submit()">Relancer</button>
  </div>
  `,
  styles: [``]
})
export class RetryDialogComponent {
  // champs du formulaire
  startDate?: Date | null = null;
  priority: 'LOW'|'NORMAL'|'HIGH' = 'NORMAL';
  dryRun = false;
  comment = '';
  ign = { schema: false, duplicates: false, ref: false, thresholds: false };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: string },
    private ref: MatDialogRef<RetryDialogComponent>
  ) {}

  submit() {
    const ignoreValidations = Object.entries(this.ign)
      .filter(([_, v]) => v)
      .map(([k]) => k.toUpperCase());

    const payload: RetryParams = {
      startFrom: this.startDate ? new Date(this.startDate).toISOString() : undefined,
      priority: this.priority,
      dryRun: this.dryRun,
      comment: this.comment?.trim() || undefined,
      ignoreValidations
    };

    this.ref.close(payload);
  }
}

