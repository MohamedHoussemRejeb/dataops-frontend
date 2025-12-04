import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { StateBlockComponent } from '../../../shared/ui/states/state-block.component';

// Modèle enrichi avec la santé de la source
interface SourceHealth {
  id: number;
  name: string;
  vendor?: string;
  type?: 'saas' | 'db' | 'file' | 'api' | string;
  licence?: string;
  owner?: string;
  tags?: string[];
  // status = ONLINE / OFFLINE / UNKNOWN (vient du backend)
  status?: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | string;

  lastCheckedAt?: string;
  lastSuccessAt?: string;
  lastLatencyMs?: number;
  lastMessage?: string;

  // optionnel : URL de connexion (DB, FTP, etc.)
  connectionUrl?: string;
}

@Component({
  standalone: true,
  selector: 'app-sources-list',
  imports: [CommonModule, FormsModule, NgIf, NgFor, HttpClientModule, StateBlockComponent],
  templateUrl: './sources-list.component.html',
  styleUrls: ['./sources-list.component.scss']
})
export class SourcesListComponent implements OnInit {

  private http = inject(HttpClient);

  // ⚠ adapte si besoin (variable d'env, proxy, etc.)
  private baseUrl = 'http://localhost:8083/api/source-health';
  private importUrl = 'http://localhost:8083/api/sources/import-context'; // endpoint à créer côté backend

  loading    = signal(true);
  error      = signal<string | null>(null);
  rows       = signal<SourceHealth[]>([]);

  // Filtres
  q          = signal<string>('');   // '' = pas de filtre texte
  kind       = signal<string>('');   // '' = tous les types

  // État pour tests de connexion
  testingAll = signal(false);
  testingId  = signal<number | null>(null);

  // État pour import de fichier de contexte
  importing  = signal(false);

  // Données filtrées (computed = perf + lisibilité)
  filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const k = this.kind();
    return this.rows().filter(s => {
      const okQ =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.vendor?.toLowerCase().includes(q);
      const okK = !k || s.type === k;
      return okQ && okK;
    });
  });

  hasData = computed(() => this.filtered().length > 0);

  ngOnInit(): void {
    this.reload();
  }

  // 🔄 Rechargement des sources + santé
  reload = () => {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {};
    const q = this.q().trim();
    const kind = this.kind();

    if (q) params.q = q;          // ?q=...
    if (kind) params.type = kind; // ?type=saas / db / file / api...

    this.http
      .get<SourceHealth[]>(this.baseUrl, { params })
      .subscribe({
        next: (data) => {
          this.rows.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Erreur lors du chargement des sources.');
          this.loading.set(false);
        }
      });
  };

  // ⚙️ Test de connexion pour TOUTES les sources
  testAll = () => {
    this.testingAll.set(true);
    this.error.set(null);

    this.http
      .post<SourceHealth[]>(`${this.baseUrl}/test-all`, {})
      .subscribe({
        next: (data) => {
          this.rows.set(data);
          this.testingAll.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Erreur lors du test des connexions.');
          this.testingAll.set(false);
        }
      });
  };

  // ⚙️ Test de connexion pour UNE seule source
  testOne = (s: SourceHealth) => {
    if (!s.id && s.id !== 0) return;

    this.testingId.set(s.id);
    this.error.set(null);

    this.http
      .post<SourceHealth>(`${this.baseUrl}/${s.id}/test-connection`, {})
      .subscribe({
        next: (updated) => {
          this.rows.update(list =>
            list.map(row => row.id === updated.id ? updated : row)
          );
          this.testingId.set(null);
        },
        error: (err) => {
          console.error(err);
          this.error.set(`Erreur lors du test de la connexion pour ${s.name}.`);
          this.testingId.set(null);
        }
      });
  };

  // ⏱ Affichage "il y a 4 min" en FR
  timeAgo(value?: string | null): string {
    if (!value) return 'Jamais';
    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'À l’instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;

    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH} h`;

    const diffD = Math.floor(diffH / 24);
    return `Il y a ${diffD} j`;
  }

  // Optionnel: trackBy
  trackByName = (_: number, s: SourceHealth) => s.name;

  // 📁 Import d’un fichier de contexte (Talend, CSV, etc.)
  // Appelé sur (change) de l’input type="file"
  importContext = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    this.importing.set(true);
    this.error.set(null);

    this.http.post<void>(this.importUrl, formData).subscribe({
      next: () => {
        // après import, on recharge la liste
        this.importing.set(false);
        // IMPORTANT : vider le fichier pour pouvoir ré-importer le même si besoin
        input.value = '';
        this.reload();
      },
      error: (err) => {
        console.error(err);
        this.error.set('Erreur lors de l’import du fichier de contexte.');
        this.importing.set(false);
        input.value = '';
      }
    });
  };
}
