import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import type { GradeCard } from '../../../core/models';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    BaseChartDirective,
    PageHeaderComponent,
    StatCardComponent,
  ],
  templateUrl: './grades.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly gradeCard = signal<GradeCard | null>(null);
  readonly loading = signal(true);

  readonly trendData = signal<ChartData<'line'>>({ labels: [], datasets: [{ data: [] }] });
  readonly trendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { min: 0, max: 10, ticks: { stepSize: 1 } } },
  };

  ngOnInit(): void {
    this.api.get<GradeCard>('/grades/my').subscribe({
      next: (d) => {
        this.gradeCard.set(d);
        this.loading.set(false);
        this.trendData.set({
          labels: d.trend.map((t) => `Sem ${t.semester}`),
          datasets: [
            {
              data: d.trend.map((t) => t.sgpa),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.15)',
              fill: true,
              tension: 0.3,
              pointRadius: 5,
            },
          ],
        });
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load grades.');
      },
    });
  }
}