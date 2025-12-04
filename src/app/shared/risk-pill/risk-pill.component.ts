import { Component, Input } from '@angular/core';

type Risk = 'OK' | 'RISK' | 'UNKNOWN';

@Component({
  selector: 'app-risk-pill',
  standalone: true,
  template: `
    <span class="risk-pill mat-elevation-z2" [style.background]="bg()" [style.color]="fg()">
      {{ risk }}
    </span>
  `,
  styles: [`
    .risk-pill {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.6;
      user-select: none;
      white-space: nowrap;
    }
  `]
})
export class RiskPillComponent {
  @Input() risk: Risk = 'UNKNOWN';

  bg() {
    switch (this.risk) {
      case 'OK': return '#e8f5e9';       // vert clair
      case 'RISK': return '#ffebee';     // rouge clair
      default: return '#eceff1';         // gris
    }
  }
  fg() {
    switch (this.risk) {
      case 'OK': return '#1b5e20';
      case 'RISK': return '#b71c1c';
      default: return '#37474f';
    }
  }
}
