import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Sensitivity, LegalTag } from '../../../core/models/governance.models';

@Component({
  standalone: true,
  selector: 'app-governance-filters',
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <div class="row">
      <mat-form-field appearance="outline">
        <mat-label>Sensibilité</mat-label>
        <mat-select [value]="sensitivity()" (selectionChange)="setSensitivity($event.value)">
          <mat-option value="">(Toutes)</mat-option>
          <mat-option *ngFor="let s of sensitivities" [value]="s">{{ s }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Légal</mat-label>
        <mat-select [value]="legal()" (selectionChange)="setLegal($event.value)">
          <mat-option value="">(Tous)</mat-option>
          <mat-option *ngFor="let l of legalTags" [value]="l">{{ label(l) }}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
  styles: [`.row{display:flex; gap:12px; flex-wrap:wrap}`]
})
export class GovernanceFiltersComponent {
  sensitivities: Sensitivity[] = ['public','internal','confidential','sensitive','pii','phi','secret'];
  legalTags: LegalTag[] = ['rgpd','law25','hipaa','sox','pci'];

  @Input() set value(v: { sensitivity?: Sensitivity | ''; legal?: LegalTag | '' } | null) {
    if (!v) return;
    this._sensitivity.set((v.sensitivity ?? '') as any);
    this._legal.set((v.legal ?? '') as any);
  }
  @Output() change = new EventEmitter<{ sensitivity?: Sensitivity | ''; legal?: LegalTag | '' }>();

  _sensitivity = signal<Sensitivity | ''>('');
  _legal = signal<LegalTag | ''>('');

  sensitivity = computed(() => this._sensitivity());
  legal = computed(() => this._legal());

  setSensitivity(v: Sensitivity | '') { this._sensitivity.set(v); this.emit(); }
  setLegal(v: LegalTag | '') { this._legal.set(v); this.emit(); }

  emit() { this.change.emit({ sensitivity: this._sensitivity(), legal: this._legal() }); }

  label(l: LegalTag) {
    return ({rgpd:'RGPD', law25:'Loi 25', hipaa:'HIPAA', sox:'SOX', pci:'PCI DSS'})[l] ?? l;
  }
}
