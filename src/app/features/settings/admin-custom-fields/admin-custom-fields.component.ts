import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/settings.service';
import { CustomFieldDef, SchemaTemplate } from '../../../core/models/settings';

@Component({
  standalone: true,
  selector: 'app-admin-custom-fields',
  imports: [CommonModule, FormsModule, NgFor, NgIf],
  templateUrl: './admin-custom-fields.component.html',
  styleUrls: ['./admin-custom-fields.component.scss']
})
export class AdminCustomFieldsComponent {
  private settings = inject(SettingsService);

  // champs globaux
  fields = computed(() => this.settings.settings().customFields || []);
  fld: CustomFieldDef = { key: '', label: '', type: 'text' };
  opts = '';
  editMode = signal(false);

  // templates
  templates = computed(() => this.settings.settings().templates || []);
  tpl: Partial<SchemaTemplate> = { id: '', name: '', fields: [] };
  tf: CustomFieldDef = { key: '', label: '', type: 'text' };
  tOpts = '';

  editField(f: CustomFieldDef) {
    this.fld = { ...f };
    this.opts = (f.options || []).join('|');
    this.editMode.set(true);
  }

  saveField() {
    const data: CustomFieldDef = {
      ...this.fld,
      options: this.fld.type === 'select'
        ? (this.opts || '').split('|').map(s => s.trim()).filter(Boolean)
        : undefined
    };
    if (this.editMode()) {
      this.settings.updateField(this.fld.key, data);
    } else {
      this.settings.addField(data);
    }
    this.fld = { key: '', label: '', type: 'text' };
    this.opts = '';
    this.editMode.set(false);
  }

  removeField(key: string) {
    this.settings.removeField(key);
  }

  addTemplate() {
    if (!this.tpl.id || !this.tpl.name) return;
    this.settings.addTemplate({ id: this.tpl.id, name: this.tpl.name, fields: [] });
    this.tpl = { id: '', name: '', fields: [] };
  }

  removeTemplate(id: string) {
    this.settings.removeTemplate(id);
  }

  addTemplateField(tid: string) {
    const t = (this.settings.settings().templates || []).find(x => x.id === tid);
    if (!t) return;
    const field: CustomFieldDef = {
      ...this.tf,
      options: this.tf.type === 'select'
        ? (this.tOpts || '').split('|').map(s => s.trim()).filter(Boolean)
        : undefined
    };
    const updated: SchemaTemplate = { ...t, fields: [...t.fields, field] };
    this.settings.updateTemplate(tid, updated);
    this.tf = { key: '', label: '', type: 'text' };
    this.tOpts = '';
  }

  removeTemplateField(tid: string, key: string) {
    const t = (this.settings.settings().templates || []).find(x => x.id === tid);
    if (!t) return;
    const updated: SchemaTemplate = { ...t, fields: t.fields.filter(f => f.key !== key) };
    this.settings.updateTemplate(tid, updated);
  }
}
