import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { RetryParams } from '../../../core/models/retry-params';

@Component({
  selector: 'app-retry-advanced',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    NgIf, NgFor, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatChipsModule,
    MatIconModule, MatDividerModule, MatDatepickerModule, MatNativeDateModule
  ],
  template: `
  <div class="dlg retry-advanced-dialog">
    <header class="dlg__header">
      <h2>Relancer avec paramètres</h2>
      <div class="dlg__subtitle">Affiner l’exécution pour ce run</div>
    </header>

    <div class="dlg__content">
      <div class="grid">
        <!-- Colonne gauche -->
        <div class="col">
          <mat-form-field appearance="fill" class="w-100">
            <mat-label>Reprocess depuis (date)</mat-label>

            <input matInput
                   [matDatepicker]="dp"
                   [(ngModel)]="startDate"
                   readonly
                   placeholder="jj/mm/aaaa"
                   aria-label="Date de début"
                   (click)="dp.open()"
                   (focus)="dp.open()" />

            <button mat-icon-button matSuffix type="button"
                    aria-label="Ouvrir le calendrier"
                    (click)="dp.open()">
              <mat-icon aria-hidden="true">event</mat-icon>
            </button>

            <mat-datepicker #dp></mat-datepicker>
            <mat-hint>Optionnel — traite uniquement les données ≥ cette date</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="fill" class="w-100">
            <mat-label id="priorityLabel">Priorité</mat-label>
            <mat-select [(ngModel)]="priority" aria-labelledby="priorityLabel">
              <mat-option value="LOW">LOW</mat-option>
              <mat-option value="NORMAL">NORMAL</mat-option>
              <mat-option value="HIGH">HIGH</mat-option>
            </mat-select>
            <mat-hint>Utilisé pour ordonner les relances en file d’attente</mat-hint>
          </mat-form-field>
        </div>

        <!-- Colonne droite -->
        <div class="col">
          <div class="label">Ignorer validations</div>

          <!-- ✅ ARIA correct : options DANS un listbox -->
          <mat-chip-listbox class="chips" multiple aria-label="Ignorer validations">
            <mat-chip-option
              *ngFor="let opt of ignoreOpts"
              [selected]="ignores.has(opt.key)"
              (selectionChange)="toggleIgnore(opt.key, $event.source.selected)"
              [attr.aria-label]="opt.label"
              [attr.title]="opt.label">

              <!-- notre unique icône -->
              <mat-icon class="chip-icon" aria-hidden="true">
                {{ ignores.has(opt.key) ? 'done' : 'radio_button_unchecked' }}
              </mat-icon>
              {{ opt.label }}
            </mat-chip-option>
          </mat-chip-listbox>

          <!-- ✅ Dry-run dans son listbox -->
          <mat-chip-listbox class="chips chips--single" multiple aria-label="Dry-run">
            <mat-chip-option
              [selected]="dryRun"
              (selectionChange)="dryRun = $event.source.selected"
              aria-label="Dry-run (sans écriture)"
              title="Dry-run (sans écriture)">
              <mat-icon class="chip-icon" aria-hidden="true">
                {{ dryRun ? 'done' : 'radio_button_unchecked' }}
              </mat-icon>
              Dry-run (sans écriture)
            </mat-chip-option>
          </mat-chip-listbox>

          <div class="muted small">Idéal pour vérifier le pipeline sans impacter les tables cibles.</div>
        </div>
      </div>

      <mat-divider class="my-3"></mat-divider>

      <mat-form-field appearance="fill" class="w-100">
        <mat-label id="commentLabel">Commentaire</mat-label>
        <textarea matInput rows="3"
                  [(ngModel)]="comment"
                  aria-labelledby="commentLabel"
                  placeholder="Contexte, ticket, raison de la relance…"></textarea>
      </mat-form-field>
    </div>

    <footer class="dlg__actions">
      <button mat-button (click)="ref.close()">Annuler</button>
      <button mat-flat-button color="primary" (click)="submit()">
        <mat-icon class="me-1" aria-hidden="true">refresh</mat-icon> Relancer
      </button>
    </footer>
  </div>
  `,
  styles: [`
    .dlg { min-width: 640px; max-width: 860px; display:flex; flex-direction:column; }
    .dlg__header { padding: 8px 24px 0; }
    .dlg__header h2 { margin: 0; font-weight: 600; }
    .dlg__subtitle { color: var(--cui-gray-600, #6c757d); margin-top: 2px; }
    .dlg__content { padding: 16px 24px 0; }
    .dlg__actions {
      position: sticky; bottom: 0;
      display: flex; gap: 12px; justify-content: flex-end;
      padding: 12px 16px; border-top: 1px solid rgba(0,0,0,.08);
      background: var(--cui-body-bg, #fff);
    }

    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
    .col { display: flex; flex-direction: column; gap: 12px; }

    .w-100 { width: 100%; }
    .my-3 { margin: 16px 0; }
    .me-1 { margin-right: 6px; }
    .small { font-size: .85rem; }
    .muted { color: var(--cui-gray-600, #6c757d); }
    .label { font-weight: 600; margin-bottom: 6px; }

    /* ---- Chips look ---- */
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chips--single { margin-top: 8px; }
    .retry-advanced-dialog mat-chip-option {
      --mdc-chip-container-height: 34px;
      border-radius: 999px !important;
      padding: 0 12px !important;
    }
    /* état sélectionné -> pill bleue + texte blanc */
    .retry-advanced-dialog .mat-mdc-chip.mat-mdc-chip-selected {
      color: #fff !important;
      background: var(--mdc-theme-primary, #3f51b5) !important;
    }
    .chip-icon { margin-right: 6px; }

    /* 🛑 supprime le check/rond automatiques de MDC pour éviter double icône */
    .retry-advanced-dialog .mdc-evolution-chip__checkmark,
    .retry-advanced-dialog .mdc-evolution-chip__primary-graphic,
    .retry-advanced-dialog .mdc-evolution-chip__icon--primary {
      display: none !important;
      background: transparent !important;
      box-shadow: none !important;
      border: 0 !important;
    }
    /* évite la marge réservée au "leading icon" MDC */
    .retry-advanced-dialog .mdc-evolution-chip__action--primary {
      padding-left: 12px !important;
      padding-right: 12px !important;
    }
    
  `]
})
export class RetryAdvancedComponent {
  // Modèle formulaire
  startDate: Date | null = null;
  priority: 'LOW'|'NORMAL'|'HIGH' = 'NORMAL';
  dryRun = false;
  comment = '';

  // État des options "ignorer"
  ignores = new Set<string>();
  ignoreOpts = [
    { key: 'schema',      label: 'Schéma' },
    { key: 'duplicates',  label: 'Doublons' },
    { key: 'ref',         label: 'Référentiel' },
    { key: 'thresholds',  label: 'Seuils' }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: string },
    public ref: MatDialogRef<RetryAdvancedComponent>
  ) {}

  toggleIgnore(key: string, on: boolean) {
    on ? this.ignores.add(key) : this.ignores.delete(key);
  }

  submit() {
    const startFromIso = this.startDate
      ? new Date(
          this.startDate.getFullYear(),
          this.startDate.getMonth(),
          this.startDate.getDate(), 0, 0, 0, 0
        ).toISOString()
      : undefined;

    const payload: RetryParams = {
      startFrom: startFromIso,
      priority: this.priority,
      dryRun: this.dryRun,
      comment: this.comment?.trim() || undefined,
      ignoreValidations: Array.from(this.ignores).map(k => k.toUpperCase())
    };

    this.ref.close(payload);
  }
}
