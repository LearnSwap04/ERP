import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900">{{ title }}</h1>
      @if (subtitle) {
        <p class="mt-1 text-sm text-gray-500">{{ subtitle }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}