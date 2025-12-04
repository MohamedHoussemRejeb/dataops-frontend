// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexFill,
  ApexTooltip,
  ApexYAxis,
  ApexLegend,
  ApexGrid,
  ApexPlotOptions
} from 'ng-apexcharts';
import { DashboardService, DashboardSummary } from '../../core/dashboard.service';

export type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;          // 👈 plus optionnel
  stroke: ApexStroke;        // 👈 plus optionnel
  dataLabels: ApexDataLabels;
  fill?: ApexFill;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  grid: ApexGrid;
};

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;          // 👈 plus optionnel
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  grid: ApexGrid;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, RouterLink, NgApexchartsModule],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardComponent implements OnInit {
  private api = inject(DashboardService);

  summary = signal<DashboardSummary | null>(null);
  loading = signal(true);

  // configs par défaut (toutes les props requises présentes)
  runsChartOptions: LineChartOptions = {
    chart: { type: 'line', height: 260, toolbar: { show: false } },
    series: [],
    xaxis: { categories: [] },
    yaxis: {},
    stroke: {},
    dataLabels: {},
    grid: {},
    tooltip: {},
    legend: { show: true }
  };

  slaChartOptions: BarChartOptions = {
    chart: { type: 'bar', height: 260, toolbar: { show: false } },
    series: [],
    xaxis: { categories: [] },
    yaxis: {},
    plotOptions: {},
    dataLabels: {},
    grid: {},
    tooltip: {},
    legend: { show: true }
  };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getSummary().subscribe({
      next: (s: DashboardSummary) => {
        this.summary.set(s);
        this.setupCharts(s);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  failedPercent = computed(() => {
    const s = this.summary();
    return s ? Math.round(s.failedRate * 100) : 0;
  });

  slaPercent = computed(() => {
    const s = this.summary();
    return s ? Math.round(s.slaRespectRate * 100) : 0;
  });

  riskyCount = computed(() => this.summary()?.topDatasets?.length ?? 0);

  private setupCharts(_s: DashboardSummary) {
    const categories = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    this.runsChartOptions = {
      chart: {
        type: 'line',
        height: 260,
        toolbar: { show: false }
      },
      series: [
        { name: 'Runs', data: [12, 18, 16, 22, 19, 24, 20] },
        { name: 'Failed', data: [1, 2, 1, 3, 2, 4, 1] }
      ],
      xaxis: { categories },
      yaxis: {},                        // 👈 toujours défini
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      grid: { strokeDashArray: 4 },
      tooltip: { shared: true },
      legend: { position: 'top', horizontalAlign: 'right', show: true }
    };

    this.slaChartOptions = {
      chart: {
        type: 'bar',
        height: 260,
        stacked: true,
        toolbar: { show: false }
      },
      series: [
        { name: 'SLA OK', data: [80, 85, 90, 88, 92, 93, 95] },
        { name: 'SLA LATE', data: [10, 8, 5, 7, 5, 4, 3] },
        { name: 'SLA FAILED', data: [10, 7, 5, 5, 3, 3, 2] }
      ],
      xaxis: { categories },
      yaxis: { max: 100, labels: { formatter: (v: number) => v + '%' } },
      plotOptions: {
        bar: { horizontal: false, columnWidth: '45%' }
      },
      dataLabels: { enabled: false },
      grid: { strokeDashArray: 4 },
      tooltip: {
        y: {
          formatter: (v: number) => v + '%'
        }
      },
      legend: { position: 'top', horizontalAlign: 'right', show: true }
    };
  }
}
