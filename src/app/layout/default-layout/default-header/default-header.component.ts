// src/app/layout/default-layout/default-header/default-header.component.ts

import {
  NgIf,
  NgTemplateOutlet,
  AsyncPipe,
  NgClass,
  DatePipe,
  NgForOf,
  SlicePipe           // 👈 AJOUT ICI
} from '@angular/common';
import { Component, computed, inject, input, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { RealtimeEventsService } from '../../../core/realtime-events.service';

import {
  AvatarComponent,
  BadgeComponent,
  BreadcrumbRouterComponent,
  ColorModeService,
  ContainerComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  NavItemComponent,
  NavLinkDirective,
  SidebarToggleDirective
} from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';

import { AuthService } from '../../../core/auth.service';
import { NotificationService, Notification } from '../../../core/notification.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-default-header',
  standalone: true,
  templateUrl: './default-header.component.html',
  imports: [
    NgIf,
    NgTemplateOutlet,
    AsyncPipe,
    NgClass,
    DatePipe,
    NgForOf,                    // 👈 AJOUT DANS LES IMPORTS
    ContainerComponent,
    HeaderTogglerDirective,
    SidebarToggleDirective,
    IconDirective,
    HeaderNavComponent,
    NavItemComponent,
    NavLinkDirective,
    RouterLink,
    RouterLinkActive,
    BreadcrumbRouterComponent,
    DropdownComponent,
    DropdownToggleDirective,
    AvatarComponent,
    DropdownMenuDirective,
    DropdownHeaderDirective,
    DropdownItemDirective,
    BadgeComponent,
    DropdownDividerDirective,
    SlicePipe
  ]
})
export class DefaultHeaderComponent extends HeaderComponent implements OnInit {

  private colorService = inject(ColorModeService);
  readonly colorMode = this.colorService.colorMode;

  readonly colorModes = [
    { name: 'light', text: 'Light', icon: 'cilSun' },
    { name: 'dark', text: 'Dark', icon: 'cilMoon' },
    { name: 'auto', text: 'Auto', icon: 'cilContrast' }
  ];

  readonly icons = computed(() => {
    const currentMode = this.colorMode();
    return this.colorModes.find((m) => m.name === currentMode)?.icon ?? 'cilSun';
  });

  // ---- Auth manuelle ----
  auth = inject(AuthService);
  router = inject(Router);

  // ---- Temps réel ----
  rt = inject(RealtimeEventsService);

  // ---- Notifications ----
  notifSvc = inject(NotificationService);

  sidebarId = input('sidebar1');

  // User observable du AuthService
  user$ = this.auth.user$;

  // Dropdown notifications
  showNotifDropdown = false;

  constructor() {
    super();
  }

  ngOnInit(): void {
    // Connexion WebSocket → apiBaseUrl défini dans environment
    this.notifSvc.connect(environment.apiBaseUrl);
  }

  // Helpers pour le template
  get isAdmin() {
    return this.auth.role === 'admin';
  }

  get isSteward() {
    return this.auth.role === 'steward';
  }

  get isViewer() {
    return this.auth.role === 'viewer';
  }

  // Expose les notifications et le compteur non lus (signals)
  get notifications(): Notification[] {
    return this.notifSvc.notifications();
  }

  get unreadCount(): number {
    return this.notifSvc.unreadCount;
  }

  // ---- Logout manuel ----
  logout() {
    this.auth.logout();
  }

  // ---- Style par niveau de notification ----
  levelClass(level: string) {
    switch (level) {
      case 'ERROR':
        return 'text-danger fw-semibold';
      case 'WARNING':
        return 'text-warning fw-semibold';
      case 'SUCCESS':
        return 'text-success fw-semibold';
      default:
        return 'text-primary fw-semibold';
    }
  }

  // ---- Toggle du dropdown de notifications ----
  toggleNotifDropdown() {
    this.showNotifDropdown = !this.showNotifDropdown;

    // Quand on ouvre, on marque tout comme lu
    if (this.showNotifDropdown) {
      this.notifications.forEach((_, idx) => this.notifSvc.markAsRead(idx));
    }
  }

  // ---- Clic sur notification ----
  openNotification(n: Notification, index: number) {
    if (n.targetType === 'RUN' && n.targetId) {
      this.router.navigate(['/workflow-engine', 'runs', n.targetId]);
    } else if (n.targetType === 'ALERT' && n.targetId) {
      this.router.navigate(['/alerts', n.targetId]);
    } else if (n.targetType === 'DASHBOARD') {
      this.router.navigate(['/dashboard']);
    }
    this.notifSvc.markAsRead(index);
  }

  // ---- Données mock inchangées (si tu veux les garder pour d'autres menus) ----
  public newMessages = [
    {
      id: 0,
      from: 'Jessica Williams',
      avatar: '7.jpg',
      status: 'success',
      title: 'Urgent: System Maintenance Tonight',
      time: 'Just now',
      link: 'apps/email/inbox/message',
      message:
        "Attention team, we'll be conducting critical system maintenance tonight from 10 PM to 2 AM. Plan accordingly..."
    },
    {
      id: 1,
      from: 'Richard Johnson',
      avatar: '6.jpg',
      status: 'warning',
      title: 'Project Update: Milestone Achieved',
      time: '5 minutes ago',
      link: 'apps/email/inbox/message',
      message:
        "Kudos on hitting sales targets last quarter! Let's keep the momentum. New goals, new victories ahead..."
    },
    {
      id: 2,
      from: 'Angela Rodriguez',
      avatar: '5.jpg',
      status: 'danger',
      title: 'Social Media Campaign Launch',
      time: '1:52 PM',
      link: 'apps/email/inbox/message',
      message:
        'Exciting news! Our new social media campaign goes live tomorrow. Brace yourselves for engagement...'
    },
    {
      id: 3,
      from: 'Jane Lewis',
      avatar: '4.jpg',
      status: 'info',
      title: 'Inventory Checkpoint',
      time: '4:03 AM',
      link: 'apps/email/inbox/message',
      message:
        "Team, it's time for our monthly inventory check. Accurate counts ensure smooth operations. Let's nail it..."
    },
    {
      id: 4,
      from: 'Ryan Miller',
      avatar: '3.jpg',
      status: 'info',
      title: 'Customer Feedback Results',
      time: '3 days ago',
      link: 'apps/email/inbox/message',
      message:
        'Our latest customer feedback is in. Let’s analyze and discuss improvements for an even better service...'
    }
  ];

  public newNotifications = [
    { id: 0, title: 'New user registered', icon: 'cilUserFollow', color: 'success' },
    { id: 1, title: 'User deleted', icon: 'cilUserUnfollow', color: 'danger' },
    { id: 2, title: 'Sales report is ready', icon: 'cilChartPie', color: 'info' },
    { id: 3, title: 'New client', icon: 'cilBasket', color: 'primary' },
    { id: 4, title: 'Server overloaded', icon: 'cilSpeedometer', color: 'warning' }
  ];

  public newStatus = [
    { id: 0, title: 'CPU Usage', value: 25, color: 'info', details: '348 Processes. 1/4 Cores.' },
    { id: 1, title: 'Memory Usage', value: 70, color: 'warning', details: '11444GB/16384MB' },
    { id: 2, title: 'SSD 1 Usage', value: 90, color: 'danger', details: '243GB/256GB' }
  ];

  public newTasks = [
    { id: 0, title: 'Upgrade NPM', value: 0, color: 'info' },
    { id: 1, title: 'ReactJS Version', value: 25, color: 'danger' },
    { id: 2, title: 'VueJS Version', value: 50, color: 'warning' },
    { id: 3, title: 'Add new layouts', value: 75, color: 'info' },
    { id: 4, title: 'Angular Version', value: 100, color: 'success' }
  ];
}
