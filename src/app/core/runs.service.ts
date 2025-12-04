import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  of,
  map,
  tap,
  interval,
  catchError
} from 'rxjs';
import { EtlRun, FlowType, Status, Trigger } from './models/etl-run';
import { RetryParams } from './models/retry-params';

// Logs live simulés côté front
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export interface LiveLog {
  ts: Date;
  level: LogLevel;
  msg: string;
}

@Injectable({ providedIn: 'root' })
export class RunsService {

  // adapte si besoin : port/chemin de ton Spring
  private baseUrl = 'http://localhost:8083/api/etl/runs';

  // cache courant (toujours au format FRONT EtlRun)
  private runs$ = new BehaviorSubject<EtlRun[]>([]);

  // logs simulés par run
  private logsMap = new Map<string, BehaviorSubject<LiveLog[]>>();

  constructor(private http: HttpClient) {
    // animation locale des RUNNING (progress bar, logs)
    interval(2000)
      .pipe(tap(() => this.tickRunningOnce()))
      .subscribe();
  }

  // -------------------------------------------------
  // utils: logs live simulés
  // -------------------------------------------------
  private ensureLogsSub(id: string) {
    if (!this.logsMap.has(id)) {
      this.logsMap.set(id, new BehaviorSubject<LiveLog[]>([]));
    }
  }

  private pushLog(id: string, l: LiveLog) {
    this.ensureLogsSub(id);
    const subj = this.logsMap.get(id)!;
    subj.next([...subj.value, l]);
  }

  logs$(id: string): Observable<LiveLog[]> {
    this.ensureLogsSub(id);
    return this.logsMap.get(id)!.asObservable();
  }

  // -------------------------------------------------
  // Adaptation BACKEND -> FRONT (robuste)
  // -------------------------------------------------

  private adaptStatus(rawStatus: any): Status {
    if (!rawStatus) return 'PENDING';
    const upper = String(rawStatus).toUpperCase();
    if (upper === 'RUNNING') return 'RUNNING';
    if (upper === 'FAILED') return 'FAILED';
    if (upper === 'SUCCESS' || upper === 'OK' || upper === 'DONE') return 'SUCCESS';
    return 'PENDING';
  }

  private adaptRun(b: any): EtlRun {
    // ID
    const id =
      b.id ??
      b.runId ??
      b.executionId ??
      crypto.randomUUID();

    // Type de flux / job
    const rawFlow =
      b.flowType ??
      b.jobName ??
      b.flow ??
      b.job ??
      'UNKNOWN';

    // Timestamps
    const startTs =
      b.startTime ??
      b.startedAt ??
      b.createdAt ??
      b.start_date ??
      b.started_at ??
      new Date().toISOString();

    const endTs =
      b.endTime ??
      b.finishedAt ??
      b.end_date ??
      b.finished_at ??
      undefined;

    // Durée
    const durationMs =
      b.durationMs ??
      b.duration_ms ??
      b.duration ??
      undefined;

    // Lignes
    const rowsIn  = b.rowsIn  ?? b.rows_in  ?? b.inputRows  ?? b.nbInput  ?? 0;
    const rowsOut = b.rowsOut ?? b.rows_out ?? b.outputRows ?? b.nbOutput ?? 0;
    const rowsError =
      b.rowsError ??
      b.rows_error ??
      b.errorRows ??
      (this.adaptStatus(b.status) === 'FAILED' ? 1 : 0);

    // Message
    const message =
      b.message ??
      b.errorMessage ??
      (this.adaptStatus(b.status) === 'FAILED' ? 'Erreur' : 'OK');

    // Déclencheur
    const triggerGuess =
      b.trigger ??
      b.launchType ??
      (b.manual ? 'MANUAL' : 'SCHEDULED');

    // Progress
    const computedProgress = (() => {
      if (b.progress !== undefined) return b.progress;
      const st = this.adaptStatus(b.status);
      if (st === 'RUNNING') return 30;
      if (st === 'PENDING') return 0;
      return 100;
    })();

    return {
      id: String(id),

      flowType: String(rawFlow).toUpperCase() as FlowType,

      status: this.adaptStatus(b.status),

      startTime: String(startTs),
      endTime: endTs ? String(endTs) : undefined,

      rowsIn,
      rowsOut,
      rowsError,
      durationMs,

      sourceFile: b.sourceFile ?? b.fileName ?? b.file ?? undefined,
      message,
      trigger: String(triggerGuess || 'SCHEDULED').toUpperCase() as Trigger,

      progress: computedProgress,

      dryRun: !!b.dryRun,
      retryParams: undefined
    };
  }

  // -------------------------------------------------
  // Récupération backend + mise en cache
  // -------------------------------------------------
  /**
   * Va chercher les runs depuis le backend,
   * peu importe le format (array direct ou Page Spring).
   */
  private refreshFromBackend(): Observable<EtlRun[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map(resp => {
        // 1) Log brut pour debug
        console.log('[runs.service] backend resp =', resp);

        // 2) Récupérer la liste d'items quelle que soit la forme
        let list: any[] = [];

        // Forme Page Spring Boot classique: { content: [...] }
        if (resp && Array.isArray(resp.content)) {
            list = resp.content;
        }
        // Forme tableau brut: [ {...}, {...} ]
        else if (Array.isArray(resp)) {
            list = resp;
        }
        // Forme genre { items: [...] }
        else if (resp && Array.isArray(resp.items)) {
            list = resp.items;
        }
        // Sinon, on tente fallback: un seul objet
        else if (resp && typeof resp === 'object') {
            list = [resp];
        }

        // 3) Adapter chaque élément vers EtlRun
        const adapted: EtlRun[] = list.map(b => this.adaptRun(b));

        return adapted;
      }),
      tap(adapted => {
        // 4) on pousse dans le cache interne
        this.runs$.next(adapted);
        console.log('[runs.service] adapted runs =', adapted);
      }),
      catchError(err => {
        console.error('[runs.service] ERROR calling backend', err);
        // on NE vide PAS le cache en cas d'erreur -> on renvoie l'existant
        return of(this.runs$.value);
      })
    );
  }

  private setCache(list: EtlRun[]) {
    this.runs$.next(list);
  }

  // -------------------------------------------------
  // Animation locale des RUNNING
  // -------------------------------------------------
  private tickRunningOnce() {
    const updated: EtlRun[] = this.runs$.value.map((r): EtlRun => {
      if (r.status !== 'RUNNING') return r;

      // incrémente progress
      const inc = 5 + Math.floor(Math.random() * 8); // +5..+12
      const nextProgress = Math.min(100, (r.progress ?? 0) + inc);

      // log simulé
      this.ensureLogsSub(r.id);
      const stepMsg = nextProgress >= 100
        ? (r.dryRun ? 'Dry-run terminé' : 'Traitement terminé')
        : [
            'Lecture source',
            'Transformation',
            'Écriture cible',
            'Validation'
          ][Math.floor(Math.random() * 4)];

      this.pushLog(r.id, {
        ts: new Date(),
        level: 'INFO',
        msg: stepMsg
      });

      if (nextProgress >= 100) {
        const end = new Date();
        const durationMs = end.getTime() - new Date(r.startTime).getTime();

        return {
          ...r,
          status: 'SUCCESS',
          endTime: end.toISOString(),
          durationMs,
          message: r.dryRun
            ? 'DRY-RUN terminé (aucune écriture)'
            : 'OK',
          progress: 100
        } as EtlRun;
      }

      return {
        ...r,
        progress: nextProgress
      } as EtlRun;
    });

    this.setCache(updated);
  }

  // -------------------------------------------------
  // Méthodes publiques (appelées par tes composants)
  // -------------------------------------------------

  list(params?: {
    flowType?: string;
    status?: string;
    q?: string;
  }): Observable<EtlRun[]> {
    return this.refreshFromBackend().pipe(
      map(all => {
        const q = params?.q?.toLowerCase() ?? '';
        return all.filter(r => {
          const okType   = params?.flowType ? r.flowType === params.flowType : true;
          const okStatus = params?.status   ? r.status   === params.status   : true;
          const okQ = q
            ? (
                (r.message?.toLowerCase().includes(q) ||
                 r.sourceFile?.toLowerCase().includes(q)) ?? false
              )
            : true;
          return okType && okStatus && okQ;
        });
      })
    );
  }

  liveRunning(): Observable<EtlRun[]> {
    return this.runs$.pipe(
      map(list => list.filter(r => r.status === 'RUNNING'))
    );
  }

  get(id: string): Observable<EtlRun | undefined> {
    return this.refreshFromBackend().pipe(
      map(list => list.find(r => r.id === id))
    );
  }

  retry(id: string): Observable<EtlRun | undefined> {
    const copy: EtlRun[] = [...this.runs$.value];
    const idx = copy.findIndex(r => r.id === id);
    if (idx === -1) return of(undefined);

    const nowIso = new Date().toISOString();
    const rerun: EtlRun = {
      ...copy[idx],
      status: 'RUNNING',
      message: 'Relancé manuellement',
      startTime: nowIso,
      endTime: undefined,
      rowsError: 0,
      durationMs: undefined,
      progress: 0
    } as EtlRun;

    this.ensureLogsSub(rerun.id);
    this.pushLog(rerun.id, {
      ts: new Date(),
      level: 'INFO',
      msg: 'Relance du run'
    });

    copy[idx] = rerun;
    this.setCache(copy);
    return of(rerun);
  }

  retryAdvanced(id: string, params: RetryParams): Observable<EtlRun | undefined> {
    const copy: EtlRun[] = [...this.runs$.value];
    const idx = copy.findIndex(r => r.id === id);
    if (idx === -1) return of(undefined);

    const nowIso = new Date().toISOString();
    const rerun: EtlRun = {
      ...copy[idx],
      status: 'RUNNING',
      message: params.dryRun ? 'Dry-run en cours' : 'Relancé (avancé)',
      startTime: nowIso,
      endTime: undefined,
      durationMs: undefined,
      rowsError: 0,
      progress: 0,
      dryRun: !!params.dryRun,
      retryParams: params
    } as EtlRun;

    this.ensureLogsSub(rerun.id);
    this.pushLog(rerun.id, { ts: new Date(), level: 'INFO', msg: 'Relance avancée' });

    if (params.startFrom) {
      this.pushLog(rerun.id, {
        ts: new Date(),
        level: 'INFO',
        msg: `startFrom=${params.startFrom}`
      });
    }
    if (params.ignoreValidations?.length) {
      this.pushLog(rerun.id, {
        ts: new Date(),
        level: 'WARN',
        msg: `ignore=[${params.ignoreValidations.join(',')}]`
      });
    }
    if (params.priority) {
      this.pushLog(rerun.id, {
        ts: new Date(),
        level: 'INFO',
        msg: `priority=${params.priority}`
      });
    }
    if (params.comment) {
      this.pushLog(rerun.id, {
        ts: new Date(),
        level: 'INFO',
        msg: `comment="${params.comment}"`
      });
    }

    copy[idx] = rerun;
    this.setCache(copy);
    return of(rerun);
  }

  upload(flowType: string, fileName: string): Observable<EtlRun> {
    const newRun: EtlRun = {
      id: crypto.randomUUID(),
      flowType: flowType as FlowType,
      status: 'RUNNING',
      startTime: new Date().toISOString(),
      sourceFile: fileName,
      message: 'Upload manuel',
      trigger: 'MANUAL' as Trigger,
      progress: 0
    } as EtlRun;

    this.ensureLogsSub(newRun.id);
    this.pushLog(newRun.id, {
      ts: new Date(),
      level: 'INFO',
      msg: `Upload de ${fileName}`
    });

    this.setCache([newRun, ...this.runs$.value]);
    return of(newRun);
  }

  simulateRandomRun(): Observable<EtlRun> {
    const flows: FlowType[] = [
      'ARTICLES',
      'COMMANDES',
      'EXPEDITIONS',
      'ANNULATIONS',
      'MOUVEMENTS'
    ];
    const flowType = flows[Math.floor(Math.random() * flows.length)];

    const newRun: EtlRun = {
      id: crypto.randomUUID(),
      flowType,
      status: 'RUNNING',
      startTime: new Date().toISOString(),
      sourceFile: `s3://landing/${flowType.toLowerCase()}_${Date.now()}.csv`,
      message: 'Simulation',
      trigger: (Math.random() < 0.5 ? 'SCHEDULED' : 'MANUAL') as Trigger,
      progress: 0
    } as EtlRun;

    this.ensureLogsSub(newRun.id);
    this.pushLog(newRun.id, {
      ts: new Date(),
      level: 'INFO',
      msg: 'Démarrage simulation'
    });

    this.setCache([newRun, ...this.runs$.value]);
    return of(newRun);
  }

  stats() {
    const runs = this.runs$.value;
    const total = runs.length;

    const byStatus = runs.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byFlow = runs.reduce((acc, r) => {
      acc[r.flowType] = (acc[r.flowType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const durs = runs
      .map(r => r.durationMs ?? 0)
      .filter(ms => ms > 0);
    const avgDurMs = durs.length
      ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length)
      : 0;

    return { total, byStatus, byFlow, avgDurMs };
  }

  clearAll(): Observable<EtlRun[]> {
    return this.refreshFromBackend();
  }
}
