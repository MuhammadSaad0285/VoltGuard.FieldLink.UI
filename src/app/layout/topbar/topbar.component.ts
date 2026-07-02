import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);

  get session() {
    return this.authService.getSession();
  }

  get displayName(): string {
    const session = this.session;
    return session?.fullName || session?.email || 'Signed in user';
  }

  get displayEmail(): string {
    const session = this.session;
    return session?.email && session.email !== this.displayName ? session.email : '';
  }

  logout(): void {
    this.authService.logout();
  }
}
