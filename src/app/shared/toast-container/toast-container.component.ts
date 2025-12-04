// shared/toast-container/toast-container.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="toast-wrap" role="region" aria-label="Notifications">
    <div class="toast"
         *ngFor="let t of toast.toasts()"
         [attr.data-kind]="t.kind"
         role="status" aria-live="polite">
      <span class="msg">{{ t.msg }}</span>
      <button class="close" (click)="toast.dismiss(t.id)" aria-label="Dismiss">×</button>
    </div>
  </div>
  `,
  styles: [`
    .toast-wrap{ position:fixed; right:16px; bottom:16px; display:flex; flex-direction:column; gap:8px; z-index:9999; }
    .toast{ min-width:240px; max-width:420px; border-radius:12px; padding:10px 12px; box-shadow:0 8px 24px rgba(0,0,0,.2); display:flex; align-items:center; gap:12px; }
    .toast[data-kind="success"]{ background:#e8f9ef; border:1px solid #22c55e55; }
    .toast[data-kind="error"]  { background:#fde8e8; border:1px solid #ef444455; }
    .toast[data-kind="info"]   { background:#eef6ff; border:1px solid #3b82f655; }
    .toast[data-kind="warn"]   { background:#fff7e6; border:1px solid #f59e0b55; }
    .msg{ flex:1; }
    .close{ background:transparent; border:0; font-size:18px; line-height:1; cursor:pointer; }
  `]
})
export class ToastContainerComponent {
  toast = inject(ToastService);
}
