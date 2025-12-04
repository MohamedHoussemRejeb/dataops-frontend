// src/app/features/settings/settings.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SettingsService } from '../../core/settings.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  private settings = inject(SettingsService);
  private fb = inject(NonNullableFormBuilder);
  private toast = inject(ToastService);

  form = this.fb.group({
    darkMode: false,
    maxDurationMin: this.fb.control(60, {
      validators: [Validators.required, Validators.min(1), Validators.max(1440)]
    }),
    errorRateWarn: this.fb.control(3, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    errorRateCrit: this.fb.control(10, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    freshnessOkMin: this.fb.control(60, {
      validators: [Validators.required, Validators.min(0), Validators.max(10080)]
    }),
    freshnessWarnMin: this.fb.control(180, {
      validators: [Validators.required, Validators.min(0), Validators.max(10080)]
    }),
    nullWarnPct: this.fb.control(5, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    nullCritPct: this.fb.control(20, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)]
    }),
    colors: this.fb.group({
      OK: '#2fb344',
      RUNNING: '#1c7ed6',
      LATE: '#f59f00',
      FAILED: '#e03131',
      UNKNOWN: '#adb5bd'
    })
  });

  get colorGroup(): FormGroup {
    return this.form.get('colors') as FormGroup;
  }

  get colors() {
    return this.form.getRawValue().colors!;
  }

  // ⭐ Prévisualisation SLA globale (format proche de SlaConfig backend)
  get slaPreview() {
    const v = this.form.getRawValue();
    return {
      maxDurationMin: v.maxDurationMin,
      warningErrorRate: v.errorRateWarn,
      criticalErrorRate: v.errorRateCrit,
      freshness: {
        ok: v.freshnessOkMin,
        warn: v.freshnessWarnMin,
        // tu pourras ajuster plus tard : par ex late = warn + X
        late: v.freshnessWarnMin
      }
    };
  }

  /** Patch form from nested AppSettings object */
  private patchFormFrom(settings: any) {
    this.form.patchValue(
      {
        darkMode: settings.darkMode,
        maxDurationMin: settings.thresholds.maxDurationMin,
        errorRateWarn: settings.thresholds.errorRateWarn,
        errorRateCrit: settings.thresholds.errorRateCrit,
        freshnessOkMin: settings.thresholds.freshnessOkMin ?? 60,
        freshnessWarnMin: settings.thresholds.freshnessWarnMin ?? 180,
        nullWarnPct: settings.thresholds.nullWarnPct ?? 5,
        nullCritPct: settings.thresholds.nullCritPct ?? 20,
        colors: settings.colors
      },
      { emitEvent: false }
    );
  }

  ngOnInit(): void {
    const local = this.settings.settings();
    this.patchFormFrom(local);

    this.settings
      .refreshFromBackend()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const latest = this.settings.settings();
          this.patchFormFrom(latest);
        },
        error: (err: any) => {
          console.error('Erreur chargement paramètres backend', err);
        }
      });

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const v = this.form.getRawValue();
        this.settings.applyToDom({
          darkMode: v.darkMode,
          thresholds: {
            maxDurationMin: v.maxDurationMin,
            errorRateWarn: v.errorRateWarn,
            errorRateCrit: v.errorRateCrit,
            freshnessOkMin: v.freshnessOkMin,
            freshnessWarnMin: v.freshnessWarnMin,
            nullWarnPct: v.nullWarnPct,
            nullCritPct: v.nullCritPct
          } as any,
          colors: v.colors
        });
      });
  }

  ctrl(name: string) {
    return this.form.get(name)!;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Formulaire invalide, corrige les erreurs.');
      return;
    }

    const v = this.form.getRawValue();

    const appSettings: any = {
      darkMode: v.darkMode,
      thresholds: {
        maxDurationMin: v.maxDurationMin,
        errorRateWarn: v.errorRateWarn,
        errorRateCrit: v.errorRateCrit,
        freshnessOkMin: v.freshnessOkMin,
        freshnessWarnMin: v.freshnessWarnMin,
        nullWarnPct: v.nullWarnPct,
        nullCritPct: v.nullCritPct
      } as any,
      colors: v.colors
    };

    this.settings
      .saveToServer(appSettings)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Paramètres enregistrés ✅');
        },
        error: (err: any) => {
          console.error('Erreur lors de l’enregistrement des paramètres (backend)', err);
          this.toast.error('Erreur lors de l’enregistrement des paramètres (backend).');
        }
      });
  }

  reset() {
    this.settings.reset();
    const latest = this.settings.settings();
    this.patchFormFrom(latest);
    this.toast.info('Paramètres réinitialisés');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
