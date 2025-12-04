import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DatasetSummary, Person } from '../../../core/models/governance.models';
import { SensitivityBadgeComponent } from '../badges/sensitivity-badge.component';
import { LegalBadgesComponent } from '../badges/legal-badges.component';

@Component({
  standalone: true,
  selector: 'app-dataset-header',
  imports: [CommonModule, MatIconModule, SensitivityBadgeComponent, LegalBadgesComponent],
  template: `
  <div class="header">
    <div class="title">
      <h2>{{ dataset?.name }}</h2>
      <div class="badges">
        <app-sensitivity-badge *ngIf="dataset?.sensitivity" [value]="dataset!.sensitivity!"></app-sensitivity-badge>
        <app-legal-badges *ngIf="dataset?.legal?.length" [tags]="dataset!.legal!"></app-legal-badges>
      </div>
    </div>
    <div class="owner" *ngIf="dataset?.owner as o">
      <div class="avatar">{{ initials(o.name) }}</div>
      <div class="meta">
        <div class="name">{{ o.name }} <small>({{ o.role }})</small></div>
        <a [href]="'mailto:'+o.email">{{ o.email }}</a>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .header { display:flex; align-items:center; justify-content:space-between; gap:16px; }
    .title h2 { margin:0 0 4px 0; }
    .badges { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .owner { display:flex; align-items:center; gap:10px; }
    .avatar {
      width:36px; height:36px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      background:#eceff1; font-weight:700; color:#37474f;
    }
    .meta .name { font-weight:600; }
    a { text-decoration:none; }
  `]
})
export class DatasetHeaderComponent {
  @Input() dataset!: DatasetSummary | null;

  initials(name: string) {
    return (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0,2)
      .map(p => p[0]?.toUpperCase())
      .join('');
  }
}
