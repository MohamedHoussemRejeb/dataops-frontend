// src/app/core/settings.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AppSettings, CustomFieldDef, SchemaTemplate } from './models/settings';
import { environment } from '../../environments/environment';

// 🔥 Flat DTO qui correspond à ton record UiSettingsDto côté Spring
export interface UiSettingsDto {
  darkMode: boolean;

  maxDurationMin: number;
  errorRateWarn: number;
  errorRateCrit: number;
  freshnessOkMin: number;
  freshnessWarnMin: number;
  nullWarnPct: number;
  nullCritPct: number;

  colorOk: string;
  colorRunning: string;
  colorLate: string;
  colorFailed: string;
  colorUnknown: string;
}

// Default values – used only as *fallback* and to fill missing fields from backend
const DEFAULTS: AppSettings = {
  darkMode: false,
  thresholds: {
    maxDurationMin: 60,
    errorRateWarn: 3,
    errorRateCrit: 10,
    freshnessOkMin: 60,
    freshnessWarnMin: 180,
    nullWarnPct: 5,
    nullCritPct: 20
  },
  colors: {
    OK: '#2fb344',
    RUNNING: '#1c7ed6',
    LATE: '#f59f00',
    FAILED: '#e03131',
    UNKNOWN: '#adb5bd'
  },

  // defaults if backend returns no custom fields/templates
  customFields: [
    { key: 'sla',          label: 'SLA (ex: daily 06:00)', type: 'text',   help: 'Format libre' },
    { key: 'criticality',  label: 'Criticité',              type: 'select', options: ['LOW','MEDIUM','HIGH'], required: true },
    { key: 'refresh_freq', label: 'Fréq. maj (min)',        type: 'number' },
  ],
  templates: [
    {
      id: 'crm', name: 'CRM',
      fields: [
        { key: 'pii_scope',    label: 'Données personnelles', type: 'select', options: ['NONE','PARTIAL','FULL'] },
        { key: 'record_owner', label: 'Propriétaire métier',  type: 'text' }
      ]
    },
    {
      id: 'erp', name: 'ERP',
      fields: [
        { key: 'legal_retention', label: 'Rétention légale (années)', type: 'number' },
        { key: 'criticality',     label: 'Criticité', type: 'select', options: ['LOW','MEDIUM','HIGH'], required: true }
      ]
    },
    {
      id: 'hr', name: 'RH',
      fields: [
        { key: 'pii_scope',    label: 'Données personnelles', type: 'select', options: ['NONE','PARTIAL','FULL'] },
        { key: 'country_scope', label: 'Pays couverts',       type: 'text' }
      ]
    }
  ]
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  /** Base API: ex: http://localhost:8083/api/settings */
  private readonly api = `${environment.apiBaseUrl}/settings`;

  /** In-memory store – source for the whole front */
  settings = signal<AppSettings>(structuredClone(DEFAULTS));

  /** Normalized thresholds (useful for dashboards) */
  readonly thresholds = computed(() => {
    const t = this.settings().thresholds;
    const pctToFrac = (v?: number) => Math.max(0, (v ?? 0) / 100);

    const freshCritMin = Math.max(
      t.freshnessWarnMin * 2,
      t.freshnessWarnMin + Math.max(0, t.freshnessWarnMin - t.freshnessOkMin)
    );

    return {
      errorRateWarn: pctToFrac(t.errorRateWarn),
      errorRateCrit: pctToFrac(t.errorRateCrit),
      nullRateWarn:  pctToFrac(t.nullWarnPct),
      nullRateCrit:  pctToFrac(t.nullCritPct),
      freshWarnMin:  t.freshnessWarnMin,
      freshCritMin:  freshCritMin
    };
  });

  constructor(private http: HttpClient) {
    // Apply default theme immediately
    this.applyToDom(this.settings());

    // Load from backend (ui + customFields + templates)
    this.loadFromServer().subscribe({
      next: () => console.log('[Settings] loaded from backend'),
      error: (err) => console.warn('⚠️ Settings backend unreachable, using defaults only', err)
    });
  }

  // ========= Simple getters =========

  getCustomFields(): CustomFieldDef[] {
    return this.settings().customFields ?? [];
  }

  getTemplates(): SchemaTemplate[] {
    return this.settings().templates ?? [];
  }

  // =========================================
  //   mapping UiSettingsDto ⇄ AppSettings
  // =========================================
  private uiDtoToAppSettings(ui: UiSettingsDto, extra?: Partial<AppSettings>): AppSettings {
    return {
      ...structuredClone(DEFAULTS),
      ...extra,
      darkMode: ui.darkMode ?? DEFAULTS.darkMode,
      thresholds: {
        ...DEFAULTS.thresholds,
        maxDurationMin: ui.maxDurationMin ?? DEFAULTS.thresholds.maxDurationMin,
        errorRateWarn:  ui.errorRateWarn ?? DEFAULTS.thresholds.errorRateWarn,
        errorRateCrit:  ui.errorRateCrit ?? DEFAULTS.thresholds.errorRateCrit,
        freshnessOkMin: ui.freshnessOkMin ?? DEFAULTS.thresholds.freshnessOkMin,
        freshnessWarnMin: ui.freshnessWarnMin ?? DEFAULTS.thresholds.freshnessWarnMin,
        nullWarnPct:    ui.nullWarnPct ?? DEFAULTS.thresholds.nullWarnPct,
        nullCritPct:    ui.nullCritPct ?? DEFAULTS.thresholds.nullCritPct
      },
      colors: {
        ...DEFAULTS.colors,
        OK:      ui.colorOk ?? DEFAULTS.colors.OK,
        RUNNING: ui.colorRunning ?? DEFAULTS.colors.RUNNING,
        LATE:    ui.colorLate ?? DEFAULTS.colors.LATE,
        FAILED:  ui.colorFailed ?? DEFAULTS.colors.FAILED,
        UNKNOWN: ui.colorUnknown ?? DEFAULTS.colors.UNKNOWN
      },
      customFields: extra?.customFields ?? DEFAULTS.customFields,
      templates: extra?.templates ?? DEFAULTS.templates
    };
  }

  private appSettingsToUiDto(s: AppSettings): UiSettingsDto {
    return {
      darkMode: s.darkMode,
      maxDurationMin: s.thresholds.maxDurationMin,
      errorRateWarn:  s.thresholds.errorRateWarn,
      errorRateCrit:  s.thresholds.errorRateCrit,
      freshnessOkMin: s.thresholds.freshnessOkMin,
      freshnessWarnMin: s.thresholds.freshnessWarnMin,
      nullWarnPct:    s.thresholds.nullWarnPct,
      nullCritPct:    s.thresholds.nullCritPct,
      colorOk:      s.colors.OK,
      colorRunning: s.colors.RUNNING,
      colorLate:    s.colors.LATE,
      colorFailed:  s.colors.FAILED,
      colorUnknown: s.colors.UNKNOWN
    };
  }

  // =========================================
  //   🔗 Load full settings from backend
  // =========================================
  /**
   * Backend endpoints:
   *   GET  /api/settings/ui           -> UiSettingsDto (flat)
   *   GET  /api/settings/custom-fields
   *   GET  /api/settings/templates
   */
  loadFromServer() {
    return forkJoin({
      ui: this.http.get<UiSettingsDto>(`${this.api}/ui`),
      customFields: this.http.get<CustomFieldDef[]>(`${this.api}/custom-fields`),
      templates:    this.http.get<SchemaTemplate[]>(`${this.api}/templates`)
    }).pipe(
      tap(({ ui, customFields, templates }) => {
        const merged: AppSettings = this.uiDtoToAppSettings(ui, {
          customFields: (customFields && customFields.length > 0) ? customFields : DEFAULTS.customFields,
          templates:    (templates && templates.length > 0) ? templates : DEFAULTS.templates
        });
        this.applyAndStore(merged);
      })
    );
  }

  /** Manually refresh from backend (used by component) */
  refreshFromBackend() {
    return this.loadFromServer();
  }

  // =========================================
  //   💾 Save UI settings to backend only
  // =========================================
  /**
   * Save darkMode + thresholds + colors to backend (UiSettingsDto flat).
   * Backend endpoint:
   *   PUT /api/settings/ui
   */
  saveToServer(partial?: Partial<AppSettings>) {
    const current = this.settings();
    const next = this.merge(current, partial);

    const payload: UiSettingsDto = this.appSettingsToUiDto(next);

    return this.http.put<UiSettingsDto>(`${this.api}/ui`, payload).pipe(
      tap(() => {
        // On se base sur ce qu'on vient d'envoyer
        this.applyAndStore(next);
      })
    );
  }

  /** Reset thresholds/colors/darkMode to DEFAULTS and persist to backend */
  reset() {
    const current = this.settings();
    const next: AppSettings = {
      ...structuredClone(DEFAULTS),
      customFields: current.customFields,
      templates: current.templates
    };

    // update front immediately
    this.applyAndStore(next);

    // persist to backend using same mapping
    this.saveToServer(next).subscribe({
      next: () => console.log('[Settings] reset saved to backend'),
      error: (err) => console.error('❌ Error saving reset settings', err)
    });
  }

  // =========================
  //  DOM (theme & status colors)
  // =========================
  applyToDom(s: AppSettings = this.settings()) {
    const root = document.documentElement;
    root.classList.toggle('dark', !!s.darkMode);
    root.style.setProperty('--status-ok',      s.colors.OK);
    root.style.setProperty('--status-running', s.colors.RUNNING);
    root.style.setProperty('--status-late',    s.colors.LATE);
    root.style.setProperty('--status-failed',  s.colors.FAILED);
    root.style.setProperty('--status-unknown', s.colors.UNKNOWN);
  }

  // =========================
  //  Classification helpers
  // =========================
  classifyErrorRate(pct: number): 'OK'|'WARN'|'CRIT' {
    const t = this.settings().thresholds;
    if (pct >= t.errorRateCrit) return 'CRIT';
    if (pct >= t.errorRateWarn) return 'WARN';
    return 'OK';
  }

  classifyFreshness(ageMinutes: number): 'OK'|'WARN'|'CRIT' {
    const t = this.settings().thresholds;
    if (ageMinutes > t.freshnessWarnMin) return 'CRIT';
    if (ageMinutes > t.freshnessOkMin)   return 'WARN';
    return 'OK';
  }

  classifyNullRate(pct: number): 'OK'|'WARN'|'CRIT' {
    const t = this.settings().thresholds;
    if (pct >= t.nullCritPct) return 'CRIT';
    if (pct >= t.nullWarnPct) return 'WARN';
    return 'OK';
  }

  // =========================
  //  Internal helpers
  // =========================
  private applyAndStore(next: AppSettings) {
    this.settings.set(next);
    this.applyToDom(next);
  }

  /** Deep-ish merge preserving arrays unless explicitly provided */
  private merge(a: AppSettings, b?: Partial<AppSettings> | AppSettings): AppSettings {
    if (!b) return a;
    const p = b as Partial<AppSettings>;
    return {
      darkMode: p.darkMode ?? a.darkMode,
      thresholds: { ...a.thresholds, ...(p.thresholds || {}) },
      colors: { ...a.colors, ...(p.colors || {}) },
      customFields: p.customFields ?? a.customFields,
      templates: p.templates ?? a.templates
    };
  }

  // =========================
  //  🔧 CRUD – Custom Fields
  // =========================
  addField(f: CustomFieldDef) {
    const s = this.settings();
    const exists = (s.customFields || []).some(x => x.key === f.key);
    if (exists) {
      alert('Cette clé existe déjà.');
      return;
    }

    this.http.post<CustomFieldDef>(`${this.api}/custom-fields`, f)
      .subscribe({
        next: (saved) => {
          const current = this.settings();
          const updated: AppSettings = {
            ...current,
            customFields: [...(current.customFields || []), saved]
          };
          this.applyAndStore(updated);
        },
        error: (err) => {
          console.error('❌ HTTP error addField :', err);
          alert('Erreur côté backend (voir logs Spring).');
        }
      });
  }

  updateField(key: string, patch: Partial<CustomFieldDef>) {
    const s = this.settings();
    const current = (s.customFields || []).find(x => x.key === key);
    if (!current) return;

    const body: CustomFieldDef = { ...current, ...patch };

    // optimistic update
    const localList = (s.customFields || []).map(x => x.key === key ? body : x);
    this.applyAndStore({ ...s, customFields: localList });

    this.http.put<CustomFieldDef>(`${this.api}/custom-fields/${key}`, body)
      .subscribe({
        next: (updatedField) => {
          const latest = this.settings();
          const list = (latest.customFields || []).map(x => x.key === key ? updatedField : x);
          this.applyAndStore({ ...latest, customFields: list });
        },
        error: (err) => {
          console.error('❌ HTTP error updateField :', err);
        }
      });
  }

  removeField(key: string) {
    const s = this.settings();
    const localList = (s.customFields || []).filter(x => x.key !== key);
    this.applyAndStore({ ...s, customFields: localList });

    this.http.delete<void>(`${this.api}/custom-fields/${key}`)
      .subscribe({
        error: (err) => {
          console.error('❌ HTTP error removeField :', err);
        }
      });
  }

  // =========================
  //  📦 CRUD – Templates
  // =========================
  addTemplate(t: SchemaTemplate) {
    const s = this.settings();
    if ((s.templates || []).some(x => x.id === t.id)) {
      throw new Error('Template id exists');
    }

    // optimistic update
    const localUpdated: AppSettings = {
      ...s,
      templates: [...(s.templates || []), t]
    };
    this.applyAndStore(localUpdated);

    this.http.post<SchemaTemplate>(`${this.api}/templates`, t)
      .subscribe({
        next: (saved) => {
          const current = this.settings();
          const list = (current.templates || []).map(x =>
            x.id === t.id ? saved : x
          );
          this.applyAndStore({ ...current, templates: list });
        },
        error: (err) => {
          console.error('❌ HTTP error addTemplate :', err);
        }
      });
  }

  updateTemplate(id: string, patch: Partial<SchemaTemplate>) {
    const s = this.settings();
    const current = (s.templates || []).find(x => x.id === id);
    if (!current) return;

    const body: SchemaTemplate = { ...current, ...patch };

    const localList = (s.templates || []).map(x => x.id === id ? body : x);
    this.applyAndStore({ ...s, templates: localList });

    this.http.post<SchemaTemplate>(`${this.api}/templates`, body)
      .subscribe({
        next: (saved) => {
          const latest = this.settings();
          const list = (latest.templates || []).map(x => x.id === id ? saved : x);
          this.applyAndStore({ ...latest, templates: list });
        },
        error: (err) => {
          console.error('❌ HTTP error updateTemplate :', err);
        }
      });
  }

  removeTemplate(id: string) {
    const s = this.settings();
    const list = (s.templates || []).filter(x => x.id !== id);
    this.applyAndStore({ ...s, templates: list });

    this.http.delete<void>(`${this.api}/templates/${id}`)
      .subscribe({
        error: (err) => {
          console.error('❌ HTTP error removeTemplate :', err);
        }
      });
  }
}

