// src/app/features/audit/audit-timeline/audit-timeline.component.ts

import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuditService } from '../../../core/audit.service';
import { AuditEvent, AuditKind } from '../../../core/models/audit-event';

@Component({
  selector: 'app-audit-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-timeline.component.html',
  styleUrls: ['./audit-timeline.component.scss']
})
export class AuditTimelineComponent {
  private audit = inject(AuditService);

  kinds: AuditKind[] = ['upload','retry','ack','run_start','run_end','error','comment'];

  // filtres
  q    = signal('');
  kind = signal<'all' | AuditKind>('all');
  from = signal<string | undefined>(undefined);
  to   = signal<string | undefined>(undefined);

  /** Helper: accès sûr aux champs dynamiques de meta (évite TS4111) */
  private m<T = any>(ev: AuditEvent | undefined, key: string): T | undefined {
    return (ev?.meta as Record<string, any> | undefined)?.[key] as T | undefined;
  }

  // liste filtrée
  filtered = computed(() => {
    const q = this.q().toLowerCase().trim();
    const k = this.kind();
    const from = this.from() ? new Date(this.from()!).getTime() : undefined;
    const to   = this.to()   ? new Date(this.to()!).getTime()   : undefined;

    return this.audit.events().filter(ev => {
      if (k !== 'all' && ev.kind !== k) return false;

      const t = new Date(ev.at).getTime();
      if (from && t < from) return false;
      if (to && t > (to + 24 * 60 * 60 * 1000 - 1)) return false;

      if (!q) return true;

      const hay = [
        ev.user.name,
        ev.user.email,
        this.m(ev, 'runId'),
        this.m(ev, 'fileName'),
        this.m(ev, 'comment'),
        JSON.stringify(ev.meta || {})
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  });

  // groupement par jour
  groups = computed(() => {
    const map = new Map<string, AuditEvent[]>();

    for (const ev of this.filtered()) {
      const day = new Date(ev.at);
      const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }

    return [...map.entries()]
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([key, items]) => ({
        key,
        items,
        label: new Date(key).toLocaleDateString()
      }));
  });

  labelKind(k: AuditKind) {
    return k === 'upload'    ? 'Upload'
      : k === 'retry'        ? 'Relance'
      : k === 'ack'          ? 'Acquittement'
      : k === 'run_start'    ? 'Début run'
      : k === 'run_end'      ? 'Fin run'
      : k === 'error'        ? 'Erreur'
      :                         'Commentaire';
  }

  desc(ev: AuditEvent) {
    const runId   = this.m<string>(ev, 'runId');
    const status  = this.m<string>(ev, 'status');
    const message = this.m<string>(ev, 'message');
    const file    = this.m<string>(ev, 'fileName');
    const comment = this.m<string>(ev, 'comment');

    if (ev.kind === 'upload'    && file)   return `Fichier: ${file}`;
    if (ev.kind === 'retry'     && runId)  return `Relance du run #${runId}`;
    if (ev.kind === 'ack'       && runId)  return `Ack run #${runId}`;
    if (ev.kind === 'run_start' && runId)  return `Run #${runId} lancé`;
    if (ev.kind === 'run_end'   && runId)  return `Run #${runId} terminé (${status ?? '—'})`;
    if (ev.kind === 'error')              return `${message ?? 'Erreur'}`;
    if (ev.kind === 'comment')            return `${comment ?? ''}`;
    return '';
  }

  exportCsv() {
    const rows = this.filtered().map(e => ({
      id: e.id,
      kind: e.kind,
      at: e.at,
      user_name: e.user.name,
      user_email: e.user.email || '',
      meta: JSON.stringify(e.meta || {})
    }));

    const head = Object.keys(rows[0] || {
      id: '',
      kind: '',
      at: '',
      user_name: '',
      user_email: '',
      meta: ''
    });

    const csv = [
      head.join(','),
      ...rows.map(r => head.map(h => this.csv((r as any)[h])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private csv(v: any) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
}
