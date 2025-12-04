// src/app/features/audit/audit-log.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService } from '../../core/audit-log.service';
import { AuditLog, AuditPage } from '../../core/models/audit';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, DatePipe],
  templateUrl: './audit-log.component.html',
})
export class AuditLogComponent {

  private auditService = inject(AuditLogService);

  // filtres
  actor = '';
  action = '';
  resourceType = '';
  resourceId = '';
  fromTs = '';
  toTs = '';

  pageIndex = 0;
  pageSize = 20;

  loading = signal(false);
  error = signal<string | null>(null);
  logs = signal<AuditLog[]>([]);
  totalElements = signal(0);

  selectedLog = signal<AuditLog | null>(null);

  ngOnInit() {
    this.loadPage(0);
  }

  loadPage(page: number) {
    this.loading.set(true);
    this.error.set(null);
    this.pageIndex = page;

    this.auditService
      .getLogs({
        actor: this.actor || undefined,
        action: this.action || undefined,
        resourceType: this.resourceType || undefined,
        resourceId: this.resourceId || undefined,
        fromTs: this.fromTs || undefined,
        toTs: this.toTs || undefined,
        page: this.pageIndex,
        size: this.pageSize,
      })
      .subscribe({
        next: (res: AuditPage) => {
          this.logs.set(res.content);
          this.totalElements.set(res.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set("Impossible de charger les logs.");
          this.loading.set(false);
        },
      });
  }

  applyFilters() {
    this.loadPage(0);
  }

  clearFilters() {
    this.actor = '';
    this.action = '';
    this.resourceType = '';
    this.resourceId = '';
    this.fromTs = '';
    this.toTs = '';
    this.loadPage(0);
  }

  openDetails(log: AuditLog) {
    this.selectedLog.set(log);
  }

  closeDetails() {
    this.selectedLog.set(null);
  }

  getDiffKeys(log: AuditLog | null): string[] {
    if (!log || !log.payloadDiff) return [];
    return Object.keys(log.payloadDiff);
  }
}
