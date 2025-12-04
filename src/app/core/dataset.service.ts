// src/app/core/dataset.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';

import { LineageGraph, Layer } from './models/lineage';
import { Dataset, Owner, RunStatus, SLA } from './models/dataset';
import { SlaConfig } from './models/sla-config'; // ⭐ AJOUT

/* ---------- Types BACKEND (Spring) ---------- */
interface BackendDatasetDto {
  id: string;
  urn?: string;
  name: string;
  description?: string;
  domain?: string;

  owner?: {
    name: string;
    email?: string;
  };

  tags?: string[];
  dependencies?: string[];

  sensitivity?: string;
  legal?: string[];

  trust?: number;
  risk?: string;

  lastStatus?: string;
  lastEndedAt?: string;
  lastDurationSec?: number;

  slaFrequency?: string;
  slaExpectedBy?: string;
  slaMaxDelayMin?: number;
}

/* ---------- Enrichissement côté front ---------- */
const extrasById: Record<string, Partial<Dataset>> = {
  ARTICLES: {
    domain: 'Sales',
    owner: { name: 'Alice Martin', email: 'alice.martin@example.com' },
    tags: ['public'],
    sla: { frequency: 'daily', expectedBy: '06:00', maxDelayMin: 30 },
    lastLoad: undefined,
    dependencies: ['src_articles_raw', 'stg_articles'],
    trust: 75,
    risk: 'OK'
  },
  COMMANDES: {
    domain: 'Sales',
    owner: { name: 'Karim Dupont', email: 'karim.dupont@example.com' },
    tags: ['critical'],
    sla: { frequency: 'daily', expectedBy: '07:00', maxDelayMin: 45 },
    lastLoad: { endedAt: new Date().toISOString(), status: 'OK', durationSec: 182 },
    dependencies: ['src_shopify_orders', 'src_pos_sales', 'stg_orders'],
    trust: 92,
    risk: 'OK'
  },
  EXPEDITIONS: {
    domain: 'Logistique',
    owner: { name: 'Zoé Tran', email: 'zoe.tran@example.com' },
    tags: ['warning'],
    sla: { frequency: 'daily', expectedBy: '07:30', maxDelayMin: 60 },
    lastLoad: undefined,
    dependencies: ['src_wms_shipments', 'stg_shipments'],
    trust: 68,
    risk: 'RISK'
  },
  ANNULATIONS: {
    domain: 'CRM',
    owner: { name: 'Ana Costa', email: 'ana.costa@example.com' },
    tags: ['pii'],
    sla: { frequency: 'daily', expectedBy: '06:30', maxDelayMin: 30 },
    lastLoad: undefined,
    dependencies: ['src_crm_cancel', 'stg_cancellations'],
    trust: 55,
    risk: 'RISK'
  },
  MOUVEMENTS: {
    domain: 'Supply',
    owner: { name: 'Marc Dubois', email: 'marc.dubois@example.com' },
    tags: [],
    sla: { frequency: 'hourly', expectedBy: '00:10', maxDelayMin: 15 },
    lastLoad: undefined,
    dependencies: ['src_erp_mov', 'stg_stock_movements'],
    trust: 70,
    risk: 'OK'
  }
};

function normalizeSensitivity(s?: string): Dataset['sensitivity'] {
  const v = (s || '').toLowerCase();
  if (['public', 'pii', 'sensitive'].includes(v)) return v as any;
  return 'internal';
}
function normalizeLegal(list?: string[]): Dataset['legal'] {
  return (list ?? []).map(x => x.toLowerCase()) as any;
}

/* ---------- Interfaces d’import (bulk) ---------- */
export interface BulkDatasetRow {
  name: string;
  domain?: string;
  description?: string;
  tags?: string[];
  owner_name?: string;
  owner_email?: string;
  fields?: Array<{
    name: string;
    type?: string;
    description?: string;
  }>;
}

export interface BulkImportPayload {
  rows: BulkDatasetRow[];
  source?: { filename?: string; rows?: number };
}

export interface BulkImportResult {
  ok: boolean;
  created: number;
  failed: number;
  errors?: Array<{ row: number; message: string }>;
  txId?: string;
}

/* ========================= Service ========================= */
@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly baseUrl = 'http://localhost:8083/api/catalog/datasets';

  constructor(private http: HttpClient) {}

  /* ======= Persistance custom ======= */
  getCustomValues(datasetId: string): Record<string, any> {
    try {
      const raw = localStorage.getItem(`ds.custom.${datasetId}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  saveCustomValues(datasetId: string, values: Record<string, any>) {
    localStorage.setItem(`ds.custom.${datasetId}`, JSON.stringify(values || {}));
  }

  private withCustom(d: Dataset): Dataset & { custom?: Record<string, any> } {
    const custom = this.getCustomValues(d.id);
    return custom && Object.keys(custom).length ? { ...d, custom } : d;
  }

  /* ====== Adapt backend dataset -> front dataset ====== */
  private adapt(b: BackendDatasetDto): Dataset {
    const sensitivity = normalizeSensitivity(b.sensitivity);
    const legal = normalizeLegal(b.legal);

    const owner: Owner = {
      name: b.owner?.name ?? '',
      email: b.owner?.email ?? ''
    };

    const status: RunStatus = (b.lastStatus as RunStatus) || 'UNKNOWN';

    const lastLoad = (b.lastStatus || b.lastEndedAt || b.lastDurationSec)
      ? {
          status,
          endedAt: b.lastEndedAt,
          durationSec: b.lastDurationSec ?? 0
        }
      : undefined;

    const frequency: SLA['frequency'] =
      (b.slaFrequency ? b.slaFrequency.toLowerCase() : 'daily') as SLA['frequency'];

    const sla: SLA = {
      frequency,
      expectedBy: b.slaExpectedBy ?? '',
      maxDelayMin: b.slaMaxDelayMin ?? 0
    };

    return {
      id: b.id,
      urn: b.urn ?? `urn:talend:${b.id}`,
      name: b.name,
      description: b.description,
      domain: b.domain,

      owner,
      tags: b.tags ?? [],
      dependencies: b.dependencies ?? [],

      sensitivity,
      legal,

      trust: b.trust ?? undefined,
      risk: (b.risk as Dataset['risk']) ?? 'UNKNOWN',

      lastLoad,
      sla
    };
  }

  // ⭐️ mapping front -> backend DTO pour CRUD
  private toBackendPayload(d: Partial<Dataset>): Partial<BackendDatasetDto> {
    return {
      id: d.id!,
      urn: d.urn,
      name: d.name!,
      description: d.description,
      domain: d.domain,

      owner: d.owner
        ? { name: d.owner.name, email: d.owner.email }
        : undefined,

      tags: d.tags,
      dependencies: d.dependencies,

      sensitivity: d.sensitivity,
      legal: d.legal,

      trust: d.trust,
      risk: d.risk,

      slaFrequency: d.sla?.frequency,
      slaExpectedBy: d.sla?.expectedBy,
      slaMaxDelayMin: d.sla?.maxDelayMin
      // lastStatus / lastEndedAt / lastDurationSec gérés côté backend (monitoring)
    };
  }

  /* ======= API ======= */

  getDatasets(): Observable<Dataset[]> {
    return this.http
      .get<BackendDatasetDto[]>(this.baseUrl)
      .pipe(
        map(rows =>
          rows.map(r => {
            const base = this.adapt(r);
            const extra = extrasById[base.id];
            return extra ? { ...base, ...extra } : base;
          })
        ),
        delay(0)
      );
  }

  listWithCustom(): Observable<Array<Dataset & { custom?: Record<string, any> }>> {
    return this.getDatasets().pipe(map(list => list.map(d => this.withCustom(d))));
  }

  get(id: string): Observable<Dataset> {
    return this.getDatasets().pipe(
      map(list => {
        const d = list.find(x => x.id === id);
        if (!d) throw new Error('Dataset not found: ' + id);
        return d;
      })
    );
  }

  getWithCustom(id: string): Observable<Dataset & { custom?: Record<string, any> }> {
    return this.get(id).pipe(map(d => this.withCustom(d)));
  }

  // =========================
  // ⭐⭐⭐ CRUD DATASETS
  // =========================

  /** Création d'un dataset (métadonnées seulement) */
  createDataset(payload: Partial<Dataset> & { name: string }): Observable<Dataset> {
    const body: Partial<BackendDatasetDto> = this.toBackendPayload(payload);
    // on laisse le backend générer l'id si non fourni
    delete (body as any).id;

    return this.http.post<BackendDatasetDto>(this.baseUrl, body).pipe(
      map(dto => {
        const base = this.adapt(dto);
        const extra = extrasById[base.id];
        return extra ? { ...base, ...extra } : base;
      })
    );
  }

  /** Mise à jour partielle des métadonnées dataset */
  updateDataset(id: string, patch: Partial<Dataset>): Observable<Dataset> {
    const body: Partial<BackendDatasetDto> = this.toBackendPayload({
      ...patch,
      id
    });

    return this.http.put<BackendDatasetDto>(`${this.baseUrl}/${id}`, body).pipe(
      map(dto => {
        const base = this.adapt(dto);
        const extra = extrasById[base.id];
        return extra ? { ...base, ...extra } : base;
      })
    );
  }

  /** Suppression d'un dataset */
  deleteDataset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /* ======= Lineage ======= */
  lineage(id: string, depth = 2): Observable<LineageGraph> {
    return this.getDatasets().pipe(
      map(list => {
        const d = list.find(x => x.id === id);
        if (!d) {
          return { nodes: [], edges: [] } as LineageGraph;
        }

        const nodes: LineageGraph['nodes'] = [];
        const edges: LineageGraph['edges'] = [];

        const sinkId = `ds.${d.id}`;
        nodes.push({
          id: sinkId,
          label: d.name || d.id,
          layer: 'dw',
          domain: d.domain,
          owner: d.owner?.name,
          lastStatus: d.lastLoad?.status,
          lastEndedAt: d.lastLoad?.endedAt
        });

        const deps = d.dependencies ?? [];

        const ensureNode = (id: string, label: string, layer: Layer) => {
          if (!nodes.some(n => n.id === id)) {
            nodes.push({ id, label, layer });
          }
        };

        const labelFromName = (name: string) =>
          name.replace(/^src_/i, '')
              .replace(/^stg_/i, '')
              .replace(/_/g, ' ')
              .replace(/ raw$/i, '');

        const srcDeps = deps.filter(n => n.toLowerCase().startsWith('src_'));
        const stgDeps = deps.filter(n => n.toLowerCase().startsWith('stg_'));

        const bases = new Set<string>();
        srcDeps.forEach(n => bases.add(n.replace(/^src_/i, '').replace(/_raw$/, '')));
        stgDeps.forEach(n => bases.add(n.replace(/^stg_/i, '').replace(/_raw$/, '')));

        bases.forEach(base => {
          const srcName = srcDeps.find(n => n.includes(base)) ?? null;
          const stgName = stgDeps.find(n => n.includes(base)) ?? null;

          let srcId: string | null = null;
          let stgId: string | null = null;

          if (srcName) {
            srcId = `src.${srcName}`;
            ensureNode(srcId, labelFromName(srcName) + ' source', 'source');
          }

          if (stgName) {
            stgId = `stg.${stgName}`;
            ensureNode(stgId, labelFromName(stgName), 'staging');
          }

          if (srcId && stgId) {
            edges.push({ from: srcId, to: stgId, type: 'transform' });
            edges.push({ from: stgId, to: sinkId, type: 'transform' });
          } else if (srcId) {
            edges.push({ from: srcId, to: sinkId, type: 'transform' });
          } else if (stgId) {
            edges.push({ from: stgId, to: sinkId, type: 'transform' });
          }
        });

        const otherDeps = deps.filter(
          n => !n.toLowerCase().startsWith('src_') && !n.toLowerCase().startsWith('stg_')
        );
        for (const dep of otherDeps) {
          const idOther = `tbl.${dep}`;
          ensureNode(idOther, dep, 'staging');
          edges.push({ from: idOther, to: sinkId, type: 'transform' });
        }

        return { nodes, edges } as LineageGraph;
      })
    );
  }

  /* ======= Bulk import ======= */
  bulkImport(payload: BulkImportPayload): Observable<BulkImportResult> {
    return this.http.post<BulkImportResult>('http://localhost:8083/api/catalog/bulk', payload);
  }

  // ============================================================
  // ⭐⭐⭐  SLA CONFIG (BACKEND JSON CONFIG)
  // ============================================================

  getSlaConfig(datasetId: string): Observable<SlaConfig> {
    return this.http.get<SlaConfig>(
      `http://localhost:8083/api/catalog/datasets/${datasetId}/sla-config`
    );
  }

  updateSlaConfig(datasetId: string, cfg: SlaConfig): Observable<SlaConfig> {
    return this.http.put<SlaConfig>(
      `http://localhost:8083/api/catalog/datasets/${datasetId}/sla-config`,
      cfg
    );
  }
  
}
