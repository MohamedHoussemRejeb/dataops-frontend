// src/app/shared/ui/states/state-block.component.ts
import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-state-block',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="state" role="status" [attr.aria-live]="live">
      <div class="ico" aria-hidden="true">{{ icon }}</div>
      <h4 class="ttl">{{ title }}</h4>
      <p class="msg" *ngIf="message">{{ message }}</p>
      <button *ngIf="actionLabel" class="btn btn-primary"
              type="button" (click)="action?.()">
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [`
    .state{ text-align:center; padding:24px; border:1px solid #eee; border-radius:12px; background:#fff; }
    .ico{ font-size:40px; margin-bottom:8px; opacity:.7 }
    .ttl{ margin:.25rem 0 }
    .msg{ color:#6c757d; margin:.25rem 0 1rem }
    .btn{ cursor:pointer }
    @media (prefers-color-scheme: dark){ .state{ border-color:#333; background:#111 } }
  `]
})
export class StateBlockComponent {
  @Input() icon = 'ℹ️';
  @Input() title = '';
  @Input() message?: string;
  @Input() actionLabel?: string;
  @Input() action?: () => void;
  @Input() live: 'polite'|'assertive'|'off' = 'polite';
}
