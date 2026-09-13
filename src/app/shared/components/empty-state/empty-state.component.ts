import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <mat-icon class="mb-3 text-5xl text-gray-300" [fontIcon]="icon" />
      <p class="text-base font-medium text-gray-700">{{ title }}</p>
      @if (message) {
        <p class="mt-1 max-w-sm text-sm text-gray-500">{{ message }}</p>
      }
      @if (actionLabel && this.action) {
        <button mat-stroked-button color="primary" class="mt-4" (click)="this.action()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() action: (() => void) | null = null;
}