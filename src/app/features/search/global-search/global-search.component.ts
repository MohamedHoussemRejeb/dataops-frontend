import { Component, HostListener, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchService, SearchItem, SearchKind } from '../../../core/search.service';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HighlightPipe],
  template: `
  <div class="gs" *ngIf="open()">
    <div class="backdrop" (click)="close()"></div>
    <div class="panel" role="dialog" aria-modal="true">
      <div class="head">
        <input
          #inp
          type="search"
          class="input"
          placeholder="Rechercher runs, datasets, erreurs… (⌘/Ctrl K)"
          [ngModel]="q()" (ngModelChange)="q.set($event)"
          (keydown.arrowdown)="move(+1)" (keydown.arrowup)="move(-1)"
          (keydown.enter)="go()" (keydown.escape)="close()" />
      </div>

      <div class="body" *ngIf="groups().length; else empty">
        <div class="group" *ngFor="let g of groups(); let gi = index">
          <div class="group__title">{{ label(g.kind) }}</div>
          <div class="item"
               *ngFor="let it of g.items; let i = index"
               [class.active]="flatIndex(gi,i) === cursor()"
               (click)="go(flatIndex(gi,i))">
            <div class="icon" [class]="g.kind"></div>
            <div class="meta">
              <div class="title" [innerHTML]="it.title | hl:q()"></div>
              <div class="sub" [innerHTML]="(it.subtitle || '') | hl:q()"></div>
            </div>
            <div class="hint">↩︎</div>
          </div>
        </div>
      </div>

      <ng-template #empty>
        <div class="empty">Aucun résultat. Tape au moins 2 lettres.</div>
      </ng-template>
    </div>
  </div>
  `,
  styles: [`
    .gs { position: fixed; inset: 0; z-index: 1400; }
    .backdrop { position:absolute; inset:0; background: rgba(0,0,0,.3); }
    .panel { position: absolute; left:50%; transform: translateX(-50%); top: 12vh;
             width: min(860px, 92vw); background:#fff; border-radius:14px;
             box-shadow: 0 24px 72px rgba(0,0,0,.25); overflow:hidden; }
    .head { padding: 10px; border-bottom:1px solid rgba(0,0,0,.06); }
    .input { width:100%; padding:12px 14px; font-size:1rem; border:1px solid rgba(0,0,0,.12); border-radius:10px; }
    .body { max-height: 60vh; overflow:auto; padding:8px 0; }
    .group { padding: 6px 8px; }
    .group__title { font-size:.8rem; color:#6c757d; margin: 6px 8px; }
    .item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; cursor:pointer; }
    .item:hover, .item.active { background:#f1f3f5; }
    .icon { width:22px; height:22px; border-radius:6px; background:#adb5bd; }
    .icon.run { background:#228be6; } .icon.dataset { background:#6741d9; } .icon.error { background:#e03131; }
    .meta{ min-width:0; flex:1; }
    .title { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .sub { color:#6c757d; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    mark { background: #ffec99; padding:0 2px; border-radius:3px; }
    .hint { color:#adb5bd; font-size:.9rem; }
    .empty { padding:18px; color:#6c757d; text-align:center; }
  `]
})
export class GlobalSearchComponent {
  private svc = inject(SearchService);
  private router = inject(Router);

  open = signal(false);
  q = signal('');
  cursor = signal(0);

  groups = computed(() => {
    const term = this.q().trim();
    if (term.length < 2) return [];
    return this.svc.query(term);
  });

  // aplatit (gi,i) -> index linéaire pour la navigation
  flatIndex = (gi: number, i: number) =>
    this.groups().slice(0, gi).reduce((acc,g)=>acc+g.items.length, 0) + i;

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const cmdk = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    if (cmdk) { e.preventDefault(); this.toggle(); }
  }

  toggle(){ this.open.set(!this.open()); if (this.open()) { this.q.set(''); this.cursor.set(0); } }
  close(){ this.open.set(false); }

  move(delta: number) {
    const total = this.groups().reduce((n,g)=>n+g.items.length,0);
    if (!total) return;
    const next = ( (this.cursor() + delta) % total + total ) % total;
    this.cursor.set(next);
  }

  go(forceIndex?: number) {
    const idx = forceIndex ?? this.cursor();
    let acc = 0;
    for (const g of this.groups()) {
      if (idx < acc + g.items.length) {
        const it = g.items[idx - acc];
        this.close();
        this.router.navigateByUrl(it.route);
        return;
      }
      acc += g.items.length;
    }
  }

  label(k: SearchKind){
    return k==='run' ? 'Runs' : k==='dataset' ? 'Datasets' : 'Erreurs';
  }
}
