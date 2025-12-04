import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // ✅ needed for [(ngModel)]

import { StateBlockComponent } from '../../../shared/ui/states/state-block.component';
import { SensitivityBadgeComponent } from '../../../shared/ui/badges/sensitivity-badge.component';
import { LegalBadgesComponent } from '../../../shared/ui/badges/legal-badges.component';

import { DatasetService } from '../../../core/dataset.service';
import { SettingsService } from '../../../core/settings.service';
import { CustomFieldsFormComponent } from '../../../features/catalog/custom-fields-form.component';
import { Dataset } from '../../../core/models/dataset';
import { SlaConfig } from '../../../core/models/sla-config';  // ⭐ ajout
import { FlowMapComponent } from '../../lineage/flow-map/flow-map.component'; // adapte le chemin

@Component({
  standalone: true,
  selector: 'app-dataset-detail',
  imports: [
    CommonModule,
    FormsModule, // ✅ requis pour ngModel
    RouterLink, // ✅ liens vers /lineage et /column-profile
    StateBlockComponent,
    SensitivityBadgeComponent,
    LegalBadgesComponent,
    CustomFieldsFormComponent,
    FlowMapComponent
],
  templateUrl: './dataset-detail.component.html',
})
export class DatasetDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);              // ✅ pour navigation dynamique
  private ds = inject(DatasetService);

  // ✅ settings utilisé dans le template
  readonly settings = inject(SettingsService);

  // état dataset
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<(Dataset & { custom?: Record<string, any> }) | null>(null);

  // ✅ valeurs de champs personnalisés (pour le formulaire)
  customVals = signal<Record<string, any>>({});

  // ✅ sélection de template (lié au <select> via [(ngModel)])
  selectedTpl: string | null = null;

  // ===================== SLA JSON (par dataset) =====================

  slaJson = signal<string>('{}');                 // texte JSON affiché/édité
  slaJsonError = signal<string | null>(null);     // erreur de parsing
  slaLoading = signal<boolean>(false);
  slaSaving = signal<boolean>(false);

  constructor() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.error.set(null);

    const id = this.route.snapshot.paramMap.get('id') || '';
    this.ds.getWithCustom(id).subscribe({
      next: (d) => {
        this.data.set(d);
        this.customVals.set(d.custom || this.ds.getCustomValues(d.id) || {});
        this.loading.set(false);

        // 🔁 charge aussi la SLA config backend pour ce dataset
        this.loadSlaConfig(d.id);
      },
      error: () => {
        this.error.set('Impossible de charger le dataset.');
        this.loading.set(false);
      },
    });
  }

  // ================= SLA: calls backend via DatasetService =================

  private loadSlaConfig(datasetId: string) {
    this.slaLoading.set(true);
    this.slaJsonError.set(null);

    this.ds.getSlaConfig(datasetId).subscribe({
      next: (cfg: SlaConfig) => {
        // si backend renvoie un objet vide => l'afficher joli
        this.slaJson.set(JSON.stringify(cfg ?? {}, null, 2));
        this.slaLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement SLA config', err);
        // On ne bloque pas la page si SLA vide/erreur
        this.slaJson.set('{}');
        this.slaLoading.set(false);
      }
    });
  }

  onSlaJsonChange(txt: string) {
    this.slaJson.set(txt);
    try {
      JSON.parse(txt);
      this.slaJsonError.set(null);
    } catch (e: any) {
      this.slaJsonError.set(e?.message ?? 'JSON invalide');
    }
  }

  saveSlaJson() {
    const d = this.data();
    if (!d) return;
    if (this.slaJsonError()) return; // ne pas envoyer si JSON invalide

    let cfg: SlaConfig;
    try {
      cfg = JSON.parse(this.slaJson());
    } catch (e: any) {
      this.slaJsonError.set(e?.message ?? 'JSON invalide');
      return;
    }

    this.slaSaving.set(true);
    this.ds.updateSlaConfig(d.id, cfg).subscribe({
      next: () => {
        this.slaSaving.set(false);
        // tu peux ajouter un toast ici si tu as un service de toast côté dataset-detail
        console.log('SLA config saved');
      },
      error: (err) => {
        console.error('Erreur save SLA config', err);
        this.slaSaving.set(false);
      }
    });
  }

  // =============================== Helpers d’affichage ===============================

  getSensitivity(d: any): any {
    return d?.sensitivity ?? 'public';
  }
  getLegal(d: any): any[] {
    return (d?.legal as any[]) ?? [];
  }

  // =============================== Colonnes (profil) ===============================

  /** Retourne la liste des colonnes, quelle que soit la forme renvoyée par l’API */
  getColumns(d: any) {
    return d?.columns || d?.schema?.columns || [];
  }

  /** trackBy pour le *ngFor* des colonnes (perf) */
  trackCol = (_: number, c: any) => c?.name || _;

  // =============================== Templates & champs fusionnés ===============================

  /** Champs issus du template sélectionné */
  tplFields() {
    const id = this.selectedTpl;
    if (!id) return [];
    const tpl = (this.settings.settings().templates || []).find(t => t.id === id);
    return tpl?.fields || [];
  }

  /** Liste fusionnée: champs globaux + champs du template (sans doublons par key) */
  mergedFields() {
    const base = this.settings.settings().customFields || [];
    const extra = this.tplFields();
    const seen = new Set<string>();
    const out: any[] = [];
    for (const f of [...base, ...extra]) {
      if (!seen.has(f.key)) {
        seen.add(f.key);
        out.push(f);
      }
    }
    return out;
  }

  /** Appliquer un template : pré-remplit uniquement les clés absentes */
  applyTemplate(id: string | null) {
    this.selectedTpl = id;
    if (!id) return;
    const tpl = (this.settings.settings().templates || []).find(t => t.id === id);
    if (!tpl) return;

    const cur = { ...(this.customVals() || {}) };
    for (const f of tpl.fields) {
      if (!(f.key in cur)) cur[f.key] = undefined;
    }
    this.customVals.set(cur);
  }

  /** Réinitialiser la sélection de template */
  clearTemplate() {
    this.selectedTpl = null;
  }

  // =============================== 💾 Sauvegarde champs personnalisés ===============================

  onSaveCustom(values: Record<string, any>) {
    const d = this.data();
    if (!d) return;

    const payload = {
      ...values,
      __templateId: this.selectedTpl ?? null
    };

    this.ds.saveCustomValues(d.id, payload);
    this.customVals.set({ ...(payload || {}) });
  }

  // =============================== 🔗 Navigation Column Admin ===============================

  goToColumnAdmin() {
    const d = this.data();
    if (!d) return;
    // d.id doit matcher le datasetId backend (datasets.id)
    this.router.navigate(['/lineage/columns-admin', d.id]);
  }
}
