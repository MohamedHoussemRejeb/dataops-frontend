import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgScrollbar } from 'ngx-scrollbar';
import {
  ContainerComponent,
  ShadowOnScrollDirective,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarFooterComponent,
  SidebarHeaderComponent,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerDirective,
  INavData
} from '@coreui/angular';

import { IconDirective, IconSetService } from '@coreui/icons-angular';
import { freeSet } from '@coreui/icons';  // 👈 même pack que dans CoreUIIconsComponent

import { DefaultFooterComponent, DefaultHeaderComponent } from './';
import { Router } from '@angular/router';
import { AuthService, Role } from '../../core/auth.service';
import { navItems as RAW_NAV } from './_nav';
import { filterNavByRole, NavWithRoles } from './nav-roles';
import { ChatbotWidgetComponent } from '../../views/chatbot/chatbot-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  providers: [IconSetService],                 // 👈 IMPORTANT : on fournit IconSetService ici
  imports: [
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarBrandComponent,
    SidebarNavComponent,
    SidebarFooterComponent,
    SidebarToggleDirective,
    SidebarTogglerDirective,
    ContainerComponent,
    DefaultFooterComponent,
    DefaultHeaderComponent,
    IconDirective,
    NgScrollbar,
    RouterOutlet,
    RouterLink,
    ShadowOnScrollDirective,
    ChatbotWidgetComponent
  ]
})
export class DefaultLayoutComponent {

  private auth = inject(AuthService);
  private iconSet = inject(IconSetService);    // 👈 on injecte le service d’icônes
  router = inject(Router);

  role: Role = 'viewer';
  navItems: INavData[] = [];

  constructor() {
    // 👉 on enregistre toutes les icônes "cil-..." du pack freeSet
    this.iconSet.icons = { ...freeSet };

    this.role = this.auth.role;
    this.updateNav(this.role);

    this.auth.user$.subscribe(u => {
      this.role = u?.role ?? 'viewer';
      this.updateNav(this.role);
    });
  }

  private updateNav(role: Role) {
    this.navItems = filterNavByRole(RAW_NAV as NavWithRoles[], role);
    console.log('[NAV] role=', role, 'menu=', this.navItems);
  }
}
