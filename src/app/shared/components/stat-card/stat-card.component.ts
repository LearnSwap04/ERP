import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type StatTone = 'primary' | 'success' | 'warn' | 'accent';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass, MatIconModule],
  template: `
    <div class="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p class="text-sm font-medium text-gray-500">{{ label }}</p>
        <p class="mt-1 text-2xl font-semibold text-gray-900">{{ value }}</p>
      </div>
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg"
        [ngClass]="{
          'bg-blue-100 text-blue-700': tone === 'primary',
          'bg-emerald-100 text-emerald-700': tone === 'success',
          'bg-amber-100 text-amber-700': tone === 'warn',
          'bg-violet-100 text-violet-700': tone === 'accent',
        }"
        aria-hidden="true"
      >
        <mat-icon>{{ icon }}</mat-icon>
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() icon = 'info';
  @Input() tone: StatTone = 'primary';
}