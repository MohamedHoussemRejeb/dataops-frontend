import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { LegalTag } from '../../../core/models/governance.models';

@Component({
  standalone: true,
  selector: 'app-legal-badges',
  imports: [CommonModule, MatChipsModule],
  template: `
    <ng-container *ngFor="let t of (tags || [])">
      <mat-chip [ngClass]="t" selected>{{ label(t) }}</mat-chip>
    </ng-container>
  `,
  styles: [`
    mat-chip { margin-right:6px; font-weight:600; }
    .rgpd  { background:#e3f2fd; color:#0d47a1; }
    .law25 { background:#f3e5f5; color:#4a148c; }
    .hipaa { background:#e0f7fa; color:#006064; }
    .sox   { background:#f1f8e9; color:#33691e; }
    .pci   { background:#fff8e1; color:#ff6f00; }
  `]
})
export class LegalBadgesComponent {
  @Input() tags: LegalTag[] | null = null;
  label(t: LegalTag) {
    const map: Record<LegalTag,string> = {
      rgpd:'RGPD', law25:'Loi 25', hipaa:'HIPAA', sox:'SOX', pci:'PCI DSS'
    };
    return map[t] ?? t;
  }
}
