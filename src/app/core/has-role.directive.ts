import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy, inject } from '@angular/core';
import { AuthService, Role } from './auth.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective implements OnDestroy {
  private auth = inject(AuthService);
  private tpl = inject(TemplateRef<any>);
  private vcr = inject(ViewContainerRef);

  private sub?: Subscription;
  private wanted: Role[] = [];

  @Input()
  set appHasRole(roleOrRoles: Role | Role[]) {
    this.wanted = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    this.bind();
  }

  private bind() {
    this.sub?.unsubscribe();
    this.sub = this.auth.user$.subscribe(() => this.update());
    this.update();
  }

  private update() {
    const userRole = this.auth.role; // 'admin' | 'steward' | 'viewer'
    const ok = this.wanted.length === 0 || this.wanted.includes(userRole as Role);
    this.vcr.clear();
    if (ok) this.vcr.createEmbeddedView(this.tpl);
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
