// src/app/features/catalog/custom-fields-form.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomFieldDef } from '../../core/models/settings';

@Component({
  standalone: true,
  selector: 'app-custom-fields-form',
  imports: [CommonModule, FormsModule, NgFor, NgIf],
  template: `
    <form (ngSubmit)="onSubmit()">
      <div class="mb-3" *ngFor="let f of fields">
        <label class="form-label">{{ f.label }} <span *ngIf="f.required" class="text-danger">*</span></label>
        <small *ngIf="f.help" class="text-muted d-block mb-1">{{ f.help }}</small>

        <input *ngIf="f.type==='text' || f.type==='number'"
               class="form-control"
               [type]="f.type"
               [(ngModel)]="value[f.key]"
               name="{{f.key}}"
               [required]="!!f.required" />

        <select *ngIf="f.type==='select'"
                class="form-select"
                [(ngModel)]="value[f.key]"
                name="{{f.key}}"
                [required]="!!f.required">
          <option [ngValue]="undefined">—</option>
          <option *ngFor="let o of f.options" [ngValue]="o">{{ o }}</option>
        </select>
      </div>

      <div class="d-flex gap-2">
        <button class="btn btn-primary btn-sm" type="submit">Enregistrer</button>
        <button class="btn btn-outline-secondary btn-sm" type="button" (click)="reset()">Réinitialiser</button>
      </div>
    </form>
  `
})
export class CustomFieldsFormComponent {
  @Input() fields: CustomFieldDef[] = [];
  @Input() value: Record<string, any> = {};
  @Output() save = new EventEmitter<Record<string, any>>();

  onSubmit() { this.save.emit({ ...(this.value || {}) }); }
  reset() { this.value = {}; }
}
