// core/toast.service.ts
import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success'|'error'|'info'|'warn';
export interface Toast { id:number; kind:ToastKind; msg:string; ttl?:number }

@Injectable({ providedIn:'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  private add(kind: ToastKind, msg: string, ttl = 4000) {
    const t: Toast = { id: Date.now() + Math.random(), kind, msg, ttl };
    this.toasts.update(xs => [t, ...xs]);
    if (ttl > 0) setTimeout(() => this.dismiss(t.id), ttl);
  }
  success(m:string, ttl?:number){ this.add('success', m, ttl); }
  error(m:string, ttl?:number){ this.add('error', m, ttl); }
  info(m:string, ttl?:number){ this.add('info', m, ttl); }
  warn(m:string, ttl?:number){ this.add('warn', m, ttl); }
  dismiss(id:number){ this.toasts.update(xs => xs.filter(t => t.id !== id)); }
}
