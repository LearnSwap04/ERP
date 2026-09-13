import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import type { AttendanceSummary, BunkRow, SubjectAttendance } from '../../../core/models';

export interface AttendanceRecordRow {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  subject?: { id: string; code: string; name: string };
}

interface MyAttendance {
  overall: AttendanceSummary;
  subjects: SubjectAttendance[];
  records: AttendanceRecordRow[];
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    BaseChartDirective,
    PageHeaderComponent,
    StatCardComponent,
  ],
  templateUrl: './attendance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  my: MyAttendance | null = null;
  bunk: { threshold: number; rows: BunkRow[] } | null = null;
  loading = true;

  attendanceData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [] }] };
  attendanceOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false };

  ngOnInit(): void {
    this.api.get<MyAttendance>('/attendance/my').subscribe({
      next: (d) => {
        this.my = d;
        this.loading = false;
        const o = d.overall;
        this.attendanceData = {
          labels: ['Present', 'Absent', 'Leave'],
          datasets: [
            {
              data: [o.present, o.absent, o.leave],
              backgroundColor: ['#10b981', '#f87171', '#fbbf24'],
            },
          ],
        };
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load attendance.');
      },
    });
    this.api.get<{ threshold: number; rows: BunkRow[] }>('/attendance/bunk').subscribe({
      next: (d) => (this.bunk = d),
      error: () => void 0,
    });
  }

  absolutePct(summary: AttendanceSummary): number {
    return Math.min(summary.percentage, 100);
  }
}