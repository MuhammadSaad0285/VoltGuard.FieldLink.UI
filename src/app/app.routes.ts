import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

const operationalRoles = ['Admin', 'Engineer'];

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage)
      },
      {
        path: 'customers',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/customers/customers-list/customers-list.component').then(
            (m) => m.CustomersListComponent
          )
      },
      {
        path: 'customers/new',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/customers/customer-form/customer-form.component').then(
            (m) => m.CustomerFormComponent
          )
      },
      {
        path: 'customers/:id/edit',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/customers/customer-form/customer-form.component').then(
            (m) => m.CustomerFormComponent
          )
      },
      {
        path: 'sites',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/sites/sites-list/sites-list.component').then(
            (m) => m.SitesListComponent
          )
      },
      {
        path: 'sites/new',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/sites/site-form/site-form.component').then(
            (m) => m.SiteFormComponent
          )
      },
      {
        path: 'sites/:id/edit',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/sites/site-form/site-form.component').then(
            (m) => m.SiteFormComponent
          )
      },
      {
        path: 'assets',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/assets/assets-list/assets-list.component').then(
            (m) => m.AssetsListComponent
          )
      },
      {
        path: 'assets/new',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/assets/asset-form/asset-form.component').then(
            (m) => m.AssetFormComponent
          )
      },
      {
        path: 'assets/:id/edit',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/assets/asset-form/asset-form.component').then(
            (m) => m.AssetFormComponent
          )
      },
      {
        path: 'assets/:id',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/assets/asset-detail/asset-detail.component').then(
            (m) => m.AssetDetailsComponent
          )
      },
      {
        path: 'jobs',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/jobs/jobs-list/jobs-list.component').then(
            (m) => m.JobsListComponent
          )
      },
      {
        path: 'jobs/new',
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'],
          requiredRoles: ['Admin']
        },
        loadComponent: () =>
          import('./features/jobs/job-form/job-form.component').then(
            (m) => m.JobFormComponent
          )
      },
      {
        path: 'jobs/:id/edit',
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'],
          requiredRoles: ['Admin']
        },
        loadComponent: () =>
          import('./features/jobs/job-form/job-form.component').then(
            (m) => m.JobFormComponent
          )
      },
      {
        path: 'test-results',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/test-results/test-results-list/test-results-list.component').then(
            (m) => m.TestResultsListComponent
          )
      },
      {
        path: 'test-results/new',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/test-results/test-result-form/test-result-form.component').then(
            (m) => m.TestResultFormComponent
          )
      },
      {
        path: 'test-results/:id',
        canActivate: [roleGuard],
        data: {
          roles: operationalRoles
        },
        loadComponent: () =>
          import('./features/test-results/test-result-detail/test-result-detail.component').then(
            (m) => m.TestResultDetailComponent
          )
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'],
          requiredRoles: ['Admin']
        },
        loadComponent: () =>
          import('./features/admin/admin-page/admin-page.component').then(
            (m) => m.AdminPageComponent
          )
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'],
          requiredRoles: ['Admin']
        },
        loadComponent: () =>
          import('./features/admin/users/admin-users-list.component').then(
            (m) => m.AdminUsersListComponent
          )
      },
      {
        path: 'admin/users/new',
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'],
          requiredRoles: ['Admin']
        },
        loadComponent: () =>
          import('./features/admin/users/admin-user-form.component').then(
            (m) => m.AdminUserFormComponent
          )
      },
      {
        path: 'admin/users/:id/edit',
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'],
          requiredRoles: ['Admin']
        },
        loadComponent: () =>
          import('./features/admin/users/admin-user-form.component').then(
            (m) => m.AdminUserFormComponent
          )
      },
      {
        path: 'admin/audit-trail',
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'],
          requiredRoles: ['Admin']
        },
        loadComponent: () =>
          import('./features/admin/audit-trail/audit-trail.component').then(
            (m) => m.AuditTrailComponent
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
