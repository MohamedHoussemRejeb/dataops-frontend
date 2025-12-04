import { Component, Input, computed } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-trust-badge',
  standalone: true,
  imports: [NgClass, NgIf],
  template: `
    <span class="trust-badge mat-elevation-z2" [ngClass]="levelClass()">
      <ng-container *ngIf="value !== null && value !== undefined">Trust {{ value }}%</ng-container>
      <ng-container *ngIf="value === null || value === undefined">Trust —</ng-container>
    </span>
  `,
  styles: [`
    .trust-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1.6;
      user-select: none;
      white-space: nowrap;
    }
    .ok   { background: #e8f5e9; color: #1b5e20; }   /* vert clair */
    .warn { background: #fff8e1; color: #8d6e00; }   /* jaune clair */
    .bad  { background: #ffebee; color: #b71c1c; }   /* rouge clair */
  `]
})
export class TrustBadgeComponent {
  /** 0..100 */
  @Input() value: number | null = null;

  levelClass() {
    if (this.value === null || this.value === undefined) return 'warn';
    if (this.value >= 90) return 'ok';
    if (this.value >= 70) return 'warn';
    return 'bad';
  }
}
