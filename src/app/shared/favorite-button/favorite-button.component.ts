import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionsService } from '../../core/subscriptions.service';

@Component({
  selector: 'app-fav-btn',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
  <button class="fav" type="button"
          [class.on]="svc.is(id)"
          (click)="svc.toggle(id)"
          [attr.aria-pressed]="svc.is(id)">
    <span class="star">★</span>
    <span class="lbl">{{ svc.is(id) ? 'Abonné' : 'S’abonner' }}</span>
  </button>
  `,
  styles: [`
    .fav{ display:inline-flex; align-items:center; gap:6px; padding:4px 10px;
          border-radius:999px; border:1px solid rgba(0,0,0,.12); background:#fff; cursor:pointer; }
    .fav.on{ background:#f5f0ff; border-color:#7048e8; color:#7048e8; }
    .star{ font-size:14px; line-height:1; }
    .lbl{ font-weight:600; }
  `]
})
export class FavoriteButtonComponent {
  @Input({ required: true }) id!: string;
  svc = inject(SubscriptionsService);
}
