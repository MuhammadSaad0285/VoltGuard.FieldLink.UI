import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../../layout/page-header/page-header.component';

interface AdminCard {
  title: string;
  description: string;
  route?: string;
}

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss']
})
export class AdminPageComponent {
  readonly cards: AdminCard[] = [
    {
      title: 'User Management',
      description: 'View users, assign roles, manage account status, and reset passwords.',
      route: '/admin/users'
    },
    {
      title: 'Audit Trail',
      description: 'Review administrative and operational changes with field-level details.',
      route: '/admin/audit-trail'
    }
  ];
}
