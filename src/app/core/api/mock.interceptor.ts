// src/app/core/api/mock.interceptor.ts
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock) return next(req);

  const u = new URL(req.url, location.origin);
  const path = u.pathname;
  const q = u.searchParams;

  // =========================
  // BYPASS -> OCR (vrai backend)
  // =========================
  if (path.startsWith('/api/ocr/')) {
    return next(req);
  }
  // (Option) laisser aussi passer la preview serveur :
  // if (req.method === 'POST' && path.endsWith('/api/import/preview')) return next(req);

  // ---------------------------------------------------------------------------
  // Simuler erreurs quand demandé: ?__err=401|403|500
  // ---------------------------------------------------------------------------
  const err = q.get('__err');
  if (err) {
    const status = Number(err);
    return throwError(() => ({ status, message: 'Simulated error' }));
  }

  // ---------------------------------------------------------------------------
  // ✅ GET /api/access/matrix — MOCK pour AccessMatrixComponent
  //   Filtres : q, role(owner|steward|viewer), sensitivity, legal,
  //   page (default 1), size (default 200)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET' && /\/api\/access\/matrix\/?$/.test(path)) {
    const people = [
      { id: 'u1', name: 'Data Eng',    email: 'eng@datacorp.com',    role: 'owner'   as const },
      { id: 'u2', name: 'CRM Team',    email: 'crm@datacorp.com',    role: 'steward' as const },
      { id: 'u3', name: 'Viewer Joe',  email: 'viewer@datacorp.com', role: 'viewer'  as const },
    ];
    const dsets = [
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,public.orders,PROD)',
        name: 'public.orders',
        sensitivity: 'pii',
        legal: ['rgpd'],
        owner: { ...people[0] }
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,public.customers,PROD)',
        name: 'public.customers',
        sensitivity: 'sensitive',
        legal: ['rgpd', 'law25'],
        owner: { ...people[1] }
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,dl.fact_sales,PROD)',
        name: 'dl.fact_sales',
        sensitivity: 'internal',
        legal: [],
        owner: { ...people[0] }
      },
    ];
    const entries = [
      { person: people[0], dataset: dsets[0], access: 'admin', inherited: false },
      { person: people[0], dataset: dsets[1], access: 'write', inherited: false },
      { person: people[1], dataset: dsets[1], access: 'admin', inherited: false },
      { person: people[2], dataset: dsets[0], access: 'read',  inherited: true  },
      { person: people[2], dataset: dsets[2], access: 'read',  inherited: false },
    ];

    const fq     = (q.get('q') || '').toLowerCase().trim();
    const frole  = (q.get('role') || 'any').toLowerCase();
    const fsens  = (q.get('sensitivity') || 'any').toLowerCase();
    const flegal = (q.get('legal') || 'any').toLowerCase();
    const page   = Math.max(1, Number(q.get('page') || 1) || 1);
    const size   = Math.max(1, Number(q.get('size') || 200) || 200);

    // 1) tri stable
    const sorted = entries.slice().sort((a, b) =>
      a.person.name.localeCompare(b.person.name) ||
      a.dataset.name.localeCompare(b.dataset.name)
    );

    // 2) filtres
    const filtered = sorted.filter((e) => {
      const qok = !fq
        || e.person.name.toLowerCase().includes(fq)
        || e.person.email.toLowerCase().includes(fq)
        || e.dataset.name.toLowerCase().includes(fq)
        || e.dataset.urn.toLowerCase().includes(fq);

      const rok = frole === 'any' || e.person.role === frole;
      const sok = fsens === 'any' || String(e.dataset.sensitivity).toLowerCase() === fsens;
      const lok = flegal === 'any' || (e.dataset.legal || [])
        .map(s => String(s).toLowerCase())
        .includes(flegal);

      return qok && rok && sok && lok;
    });

    // 3) pagination
    const start = (page - 1) * size;
    const body = { total: filtered.length, items: filtered.slice(start, start + size) };

    return of(new HttpResponse({ status: 200, body })).pipe(delay(250));
  }

  // ---------------------------------------------------------------------------
  // ✅ Column Lineage – SEARCH
  // GET /api/lineage/columns/search?q=
  // ---------------------------------------------------------------------------
  if (req.method === 'GET' && path === '/api/lineage/columns/search') {
    const fq = (q.get('q') || '').toLowerCase().trim();

    const results = [
      { urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,public.customers,PROD)#email',
        dataset: 'public.customers', column: 'email', type: 'string', sensitivity: 'pii' },
      { urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,crm.leads,PROD)#email',
        dataset: 'crm.leads', column: 'email', type: 'string', sensitivity: 'pii' },
      { urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,dl.fact_sales,PROD)#customer_id',
        dataset: 'dl.fact_sales', column: 'customer_id', type: 'int', sensitivity: 'internal' },
    ].filter(r =>
      !fq ||
      r.column.toLowerCase().includes(fq) ||
      r.dataset.toLowerCase().includes(fq)
    );

    const body = { items: results };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(120));
  }

  // ---------------------------------------------------------------------------
  // ✅ Column Lineage – MINI GRAPH
  // GET /api/lineage/columns/:datasetUrn/:column
  // ---------------------------------------------------------------------------
  if (req.method === 'GET' && /^\/api\/lineage\/columns\/[^/]+\/[^/]+$/.test(path)) {
    // (Option) tu peux parser si besoin :
    // const [, , , , dsUrnEncoded, colEncoded] = path.split('/');
    // const datasetUrn = decodeURIComponent(dsUrnEncoded);
    // const column = decodeURIComponent(colEncoded);

    const body = {
      nodes: [
        { id: 'col_customers_email', label: 'customers.email', type: 'column' },
        { id: 'job_norm_email',      label: 'normalize_email', type: 'job'    },
        { id: 'col_crm_email',       label: 'crm.leads.email', type: 'column' },
      ],
      edges: [
        { from: 'col_customers_email', to: 'job_norm_email', kind: 'transform' },
        { from: 'job_norm_email',      to: 'col_crm_email',  kind: 'transform' },
      ]
    };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(120));
  }

  // ---------------------------------------------------------------------------
  // GET /catalog?page=&pageSize=&q=&tags=&risk=&sensitivity=&legal
  // ---------------------------------------------------------------------------
  if (req.method === 'GET' && path.endsWith('/catalog')) {
    const allItems = [
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,public.orders,PROD)',
        name: 'public.orders',
        owner: { name: 'Data Eng', email: 'eng@datacorp.com' },
        tags: ['pii', 'critical'],
        trust: 92,
        risk: 'OK',
        sensitivity: 'pii',
        legal: ['rgpd'],
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,public.customers,PROD)',
        name: 'public.customers',
        owner: { name: 'CRM Team', email: 'crm@datacorp.com' },
        tags: ['gold', 'sensitive'],
        trust: 65,
        risk: 'RISK',
        sensitivity: 'sensitive',
        legal: ['rgpd', 'law25'],
      },
      {
        urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,public.products,PROD)',
        name: 'public.products',
        owner: { name: 'Data Ops', email: 'ops@datacorp.com' },
        tags: ['public', 'marketing'],
        trust: 80,
        risk: 'OK',
        sensitivity: 'public',
        legal: [],
      },
    ];

    const page = Number(q.get('page') ?? 1);
    const pageSize = Number(q.get('pageSize') ?? 10);
    const filterQ = (q.get('q') ?? '').toLowerCase();
    const tag = q.get('tags') ?? '';
    const risk = q.get('risk') ?? '';
    const sens = q.get('sensitivity') ?? '';
    const legal = q.get('legal') ?? '';

    const filtered = allItems.filter(i =>
      (!filterQ || i.name.toLowerCase().includes(filterQ)) &&
      (!tag || i.tags.includes(tag)) &&
      (!risk || i.risk === risk) &&
      (!sens || i.sensitivity === sens) &&
      (!legal || (i.legal || []).includes(legal))
    );

    const start = (page - 1) * pageSize;
    const body = { total: filtered.length, items: filtered.slice(start, start + pageSize) };

    return of(new HttpResponse({ status: 200, body })).pipe(delay(300));
  }

  // ---------------------------------------------------------------------------
  // POST /catalog/bulk
  // ---------------------------------------------------------------------------
  if (req.method === 'POST' && path.endsWith('/catalog/bulk')) {
    const body = req.body as any;
    const rows = (body?.rows || []) as any[];

    const txId = 'tx_' + Math.random().toString(36).slice(2, 8);
    const wantError = q.get('__err') === '500' || rows.some(r => r.name?.includes('FAIL'));

    const errors: Array<{ row: number; message: string }> = [];
    rows.forEach((r, i) => {
      if (!r?.name) errors.push({ row: i + 1, message: 'name manquant' });
      if (r?.owner_email && !String(r.owner_email).includes('@')) {
        errors.push({ row: i + 1, message: 'owner_email invalide' });
      }
    });

    if (errors.length) {
      return of(new HttpResponse({
        status: 400,
        body: { ok: false, created: 0, failed: rows.length, errors, txId }
      })).pipe(delay(250));
    }

    if (wantError) {
      return of(new HttpResponse({
        status: 500,
        body: {
          ok: false,
          created: 0,
          failed: rows.length,
          errors: [{ row: 0, message: 'Erreur serveur simulée' }],
          txId,
          rolledBack: true
        }
      })).pipe(delay(350));
    }

    const created = rows.length;
    return of(new HttpResponse({
      status: 200,
      body: { ok: true, created, failed: 0, txId }
    })).pipe(delay(300));
  }

  // ---------------------------------------------------------------------------
  // GET /datasets/:urn (détail)
  // ---------------------------------------------------------------------------
  if (
    req.method === 'GET' &&
    path.includes('/datasets/') &&
    !path.endsWith('/lineage') &&
    !/\/columns\/.+\/profile$/.test(path) &&
    !path.endsWith('/incidents')
  ) {
    const urn = decodeURIComponent(path.split('/datasets/')[1] ?? '');
    const namePart = urn.split(',')[1] || 'dataset';

    const gov = namePart.includes('customers')
      ? { sensitivity: 'sensitive', legal: ['rgpd', 'law25'] }
      : namePart.includes('orders')
      ? { sensitivity: 'pii', legal: ['rgpd'] }
      : { sensitivity: 'public', legal: [] };

    const body = {
      urn,
      name: namePart,
      description: 'Mocked dataset description',
      trust: 90,
      risk: 'OK',
      owner: { name: 'Owner', email: 'owner@datacorp.com' },
      tags: ['demo'],
      metrics: { freshness_min: 42, null_rate: 0.01 },
      lastRun: new Date().toISOString(),
      ...gov
    };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(250));
  }

  // ---------------------------------------------------------------------------
  // GET /datasets/:urn/lineage
  // ---------------------------------------------------------------------------
  if (req.method === 'GET' && path.endsWith('/lineage')) {
    const body = {
      nodes: [
        { id: 'orders', label: 'orders', type: 'dataset' },
        { id: 'transform_job', label: 'transform', type: 'job' },
        { id: 'customers', label: 'customers', type: 'dataset' },
      ],
      edges: [
        { from: 'orders', to: 'transform_job', kind: 'execution' },
        { from: 'transform_job', to: 'customers', kind: 'execution' },
      ],
    };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(200));
  }

  // ---------------------------------------------------------------------------
  // GET /incidents
  // ---------------------------------------------------------------------------
  if (req.method === 'GET' && path.endsWith('/incidents')) {
    const body = [
      {
        id: 1,
        dataset_urn: 'urn:li:dataset:(urn:li:dataPlatform:postgres,public.orders,PROD)',
        run_id: 'run_2025_09_21_01',
        severity: 'high',
        kind: 'freshness',
        title: 'Orders freshness exceeded WARN threshold',
        created_at: new Date().toISOString(),
        status: 'open',
        dataset: { sensitivity: 'pii', legal: ['rgpd'] }
      },
    ];
    return of(new HttpResponse({ status: 200, body })).pipe(delay(180));
  }

  // --- SOURCES (logiciels) ---
  if (req.method === 'GET' && path.endsWith('/sources')) {
    const body = [
      { id:'src_salesforce', name:'Salesforce', vendor:'Salesforce', kind:'saas',
        license:{ type:'Enterprise', seats:50, expiresAt:new Date(Date.now()+120*864e5).toISOString() },
        owner:{ name:'DSI', email:'it@datacorp.com' }, tags:['crm','pii'], status:'OK' },
      { id:'src_pg_erp', name:'ERP Postgres', vendor:'PostgreSQL', kind:'db',
        license:{ type:'OpenSource' }, owner:{ name:'Finance' }, tags:['finance'], status:'WARN' },
    ];
    return of(new HttpResponse({ status:200, body })).pipe(delay(180));
  }
  if (req.method === 'GET' && /\/api\/sources\/[^/]+$/.test(path)) {
    const id = decodeURIComponent(path.split('/api/sources/')[1]);
    const body = { id, name: id, vendor:'VendorX', kind:'api', owner:{name:'Ops'}, tags:['etl'], status:'OK' };
    return of(new HttpResponse({ status:200, body })).pipe(delay(150));
  }

  // --- DOCS & POLITIQUES ---
  if (req.method==='GET' && path.endsWith('/docs')) {
    const body = [
      { id:'rgpd', title:'RGPD – Guide interne', kind:'regulation', tags:['rgpd'], updatedAt:new Date().toISOString(), summary:'Règles de traitement des données personnelles.' },
      { id:'law25', title:'Loi 25 – Référentiel', kind:'regulation', tags:['law25'], updatedAt:new Date().toISOString() },
      { id:'policy_naming', title:'Politique de nommage', kind:'policy', tags:['quality'], updatedAt:new Date().toISOString() },
    ];
    return of(new HttpResponse({status:200, body })).pipe(delay(160));
  }

  // ====== Qualité & Profiling ======
  if (req.method === 'GET' && path.endsWith('/quality/summary')) {
    const body = {
      error_rate: 0.072,
      freshness_min: 210,
      null_rate: 0.013,
      lastUpdated: new Date().toISOString()
    };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(200));
  }

  if (req.method === 'GET' && path.includes('/quality/series')) {
    const metric = (q.get('metric') || 'error_rate') as 'error_rate'|'freshness_min'|'null_rate';
    const range = (q.get('range') || '7d') as '7d'|'30d';
    const n = range === '7d' ? 7 : 30;

    const mk = (base: number, noise = 0.015, amp = 0.02) =>
      Array.from({ length: n }).map((_, i) => ({
        t: new Date(Date.now() - (n - 1 - i) * 86400000).toISOString(),
        v: Math.max(0, base + Math.sin(i / 2) * amp + (Math.random() - 0.5) * noise)
      }));

    let base = 0.05;
    if (metric === 'null_rate') base = 0.01;
    if (metric === 'freshness_min') base = 180;

    const points = mk(base);
    const body = { metric, range, points };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(200));
  }

  if (req.method === 'GET' && path.includes('/quality/heatmap')) {
    const datasets = ['public.orders', 'public.customers', 'dl.fact_sales', 'crm.leads', 'hr.employees'];
    const checks = ['freshness', 'null_rate', 'error_rate'];
    const data: Array<{ dataset: string; check: string; value: number }> = [];
    for (const d of datasets) {
      for (const c of checks) {
        const v = Math.random();
        data.push({ dataset: d, check: c, value: Number(v.toFixed(2)) });
      }
    }
    const body = { datasets, checks, data };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(220));
  }

  if (req.method === 'GET' && /\/api\/datasets\/.+\/columns\/.+\/profile$/.test(path)) {
    const parts = path.split('/api/datasets/')[1].split('/columns/');
    const urn = decodeURIComponent(parts[0]);
    const col = decodeURIComponent(parts[1].replace('/profile', ''));
    const body = {
      datasetUrn: urn,
      column: col,
      type: 'number',
      min: 1, max: 999,
      nullRate: 0.023,
      distinct: 134,
      topK: [
        { value: '1', count: 120 },
        { value: '2', count: 90 },
        { value: '0', count: 45 },
      ],
      histogram: [
        { bin: '[0,100)', count: 30 },
        { bin: '[100,300)', count: 80 },
        { bin: '[300,600)', count: 50 },
        { bin: '[600,1000]', count: 20 },
      ]
    };
    return of(new HttpResponse({ status: 200, body })).pipe(delay(180));
  }

  if (req.method === 'GET' && /\/api\/datasets\/.+\/incidents$/.test(path)) {
    const urn = decodeURIComponent(path.split('/api/datasets/')[1].replace('/incidents',''));
    const now = Date.now();
    const body = [
      {
        id: 'inc_' + Math.random().toString(36).slice(2, 7),
        dataset_urn: urn,
        severity: 'high',
        kind: 'error_rate',
        title: 'Error rate exceeded 10%',
        created_at: new Date(now - 3600_000).toISOString(),
        status: 'open'
      },
      {
        id: 'inc_' + Math.random().toString(36).slice(2, 7),
        dataset_urn: urn,
        severity: 'medium',
        kind: 'freshness',
        title: 'Freshness > 3h',
        created_at: new Date(now - 7200_000).toISOString(),
        status: 'open'
      }
    ];
    return of(new HttpResponse({ status: 200, body })).pipe(delay(160));
  }
// --- FLOW MAP (downstream/upstream) ---
// GET /api/lineage/flow?from=<urn>&depth=2&type=downstream
if (req.method === 'GET' && path.endsWith('/api/lineage/flow')) {
  const depth = Number(q.get('depth') || 2);
  const type  = (q.get('type') || 'downstream').toLowerCase(); // pour plus tard si tu gères 'upstream'

  // points de départ (tu peux lire q.get('from') si tu veux différencier les jeux)
  const nodesAll = [
    { id:'ds_orders',     label:'public.orders',     type:'dataset', level:0 },
    { id:'job_t1',        label:'transform_orders',  type:'job',     level:1 },
    { id:'ds_customers',  label:'public.customers',  type:'dataset', level:2 },
    { id:'rep_sales',     label:'Sales Dashboard',   type:'report',  level:3 },
  ];
  const edgesAll = [
    { from:'ds_orders',    to:'job_t1',       kind:'exec'    },
    { from:'job_t1',       to:'ds_customers', kind:'write'   },
    { from:'ds_customers', to:'rep_sales',    kind:'consume' },
  ];

  const nodes = nodesAll.filter(n => n.level <= depth);
  const edges = edgesAll.filter(e => nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to));

  return of(new HttpResponse({ status: 200, body: { nodes, edges } })).pipe(delay(120));
}
// mock.interceptor.ts — historique de profiling colonne
if (req.method === 'GET' && /\/api\/profiling\/columns\/.+\/[^/]+\/history$/.test(path)) {
  const days = Number(q.get('days') || 30);
  const now = Date.now();
  const points = Array.from({ length: days }).map((_, i) => ({
    t: new Date(now - (days - 1 - i) * 86400000).toISOString(),
    nullRate: Math.max(0, 0.02 + Math.sin(i / 4) * 0.005 + (Math.random() - 0.5) * 0.002),
    distinct: 120 + Math.round(Math.sin(i / 6) * 10 + (Math.random() - 0.5) * 6)
  }));
  const body = { points };
  return of(new HttpResponse({ status: 200, body })).pipe(delay(160));
}


  // ---------------------------------------------------------------------------
  // Pas de correspondance → passer au backend réel
  // ---------------------------------------------------------------------------
  return next(req);
};
