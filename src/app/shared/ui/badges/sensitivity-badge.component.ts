import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { Sensitivity } from '../../../core/models/governance.models';

@Component({
  standalone: true,
  selector: 'app-sensitivity-badge',
  imports: [CommonModule, MatChipsModule],
  template: `
    <mat-chip [ngClass]="classFor(value)" selected>{{ labelFor(value) }}</mat-chip>
  `,
  styles: [`
    mat-chip { font-weight: 600; }
    .public       { background:#e8f5e9; color:#1b5e20; }
    .internal     { background:#e3f2fd; color:#0d47a1; }
    .confidential { background:#fff3e0; color:#e65100; }
    .sensitive    { background:#ffebee; color:#b71c1c; }
    .pii          { background:#fde7f3; color:#880e4f; }
    .phi          { background:#ede7f6; color:#4a148c; }
    .secret       { background:#efebe9; color:#3e2723; }
  `]
})
export class SensitivityBadgeComponent {
  @Input() value: Sensitivity = 'internal';
  labelFor(v: Sensitivity) {
    const m: Record<Sensitivity,string> = {
      public:'Public', internal:'Interne', confidential:'Confidentiel',
      sensitive:'Sensible', pii:'Données personnelles (PII)',
      phi:'Données de santé (PHI)', secret:'Secret'
    };
    return m[v] ?? v;
  }
  classFor(v: Sensitivity) { return v; }
}
