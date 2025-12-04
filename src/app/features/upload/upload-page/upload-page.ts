import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { RunsService } from '../../../core/runs.service';
import { FlowType } from '../../../core/models/etl-run';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './upload-page.html',
  styleUrls: ['./upload-page.scss']
})
export class UploadPage {
  flowTypes: FlowType[] = ['ARTICLES','COMMANDES','EXPEDITIONS','ANNULATIONS','MOUVEMENTS'];
  flowType: FlowType | '' = '';
  file?: File;
  busy = false;
  msg = '';

  constructor(private runs: RunsService, private router: Router) {}

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.file = input.files?.[0] || undefined;
  }

  async submit() {
    if (!this.flowType || !this.file) { this.msg = 'Choisis un flux et un fichier.'; return; }
    this.busy = true; this.msg = '';
    this.runs.upload(this.flowType, this.file.name).subscribe(run => {
      this.busy = false;
      this.msg = 'Upload simulé — run créé.';
      // rediriger vers le détail du run créé si tu veux :
      this.router.navigate(['/runs', run.id]);
    });
  }
}
