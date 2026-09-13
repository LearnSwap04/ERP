import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/**
 * *appHasRole="['STUDENT']" — shows the element only when the current user's role
 * is in the list. This keeps role logic out of templates: templates only say *appHasRole,
 * the directive owns the decision.
 */
@Directive({ selector: '[appHasRole]' })
export class HasRoleDirective {
  private readonly view = inject(ViewContainerRef);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly auth = inject(AuthService);

  private readonly allowed = signal<string[]>([]);
  private readonly created = signal(false);

  @Input()
  set appHasRole(roles: string[]) {
    this.allowed.set(roles);
  }

  constructor() {
    effect(() => {
      const role = this.auth.role();
      const ok = role != null && this.allowed().includes(role);
      if (ok && !this.created()) {
        this.view.createEmbeddedView(this.template);
        this.created.set(true);
      } else if (!ok && this.created()) {
        this.view.clear();
        this.created.set(false);
      }
    });
  }
}