import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgIf, NgForOf, NgClass, DatePipe } from '@angular/common';
import { QualityService } from '../../../core/quality.service';
import { QualityTest } from '../../../core/models/quality';

@Component({
  selector: 'app-quality-tests',
  standalone: true,
  imports: [NgIf, NgForOf, NgClass, DatePipe],
  templateUrl: './quality-tests.component.html',
  styleUrls: ['./quality-tests.component.scss'],
})
export class QualityTestsComponent implements OnChanges {
  @Input() urn!: string; // dataset URN or ID

  loading = false;
  error: string | null = null;
  tests: QualityTest[] = [];

  constructor(private quality: QualityService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['urn'] && this.urn) {
      this.load();
    }
  }

  private load(): void {
    this.loading = true;
    this.error = null;
    this.tests = [];

    this.quality.getTests(this.urn).subscribe({
      next: (list) => {
        this.tests = list ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement quality tests', err);
        this.error = 'Impossible de charger les règles qualité.';
        this.loading = false;
      },
    });
  }

  // Top 3 columns with the most FAILED rules
  get topProblemColumns(): { column: string; failedCount: number }[] {
    const counts = new Map<string, number>();

    for (const t of this.tests) {
      if (t.status !== 'FAILED') continue;
      const col = t.column || '_DATASET_';
      counts.set(col, (counts.get(col) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .filter(([col]) => col !== '_DATASET_')
      .map(([column, failedCount]) => ({ column, failedCount }))
      .sort((a, b) => b.failedCount - a.failedCount)
      .slice(0, 3);
  }

  badgeClass(t: QualityTest): string {
    return t.status === 'OK'
      ? 'badge bg-success-subtle text-success'
      : t.status === 'FAILED'
      ? 'badge bg-danger-subtle text-danger'
      : 'badge bg-warning-subtle text-warning';
  }
}
