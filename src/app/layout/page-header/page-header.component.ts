import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
    </header>
  `,
  styles: [`
    .page-header {
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      color: #111827;
    }

    p {
      margin: 6px 0 0;
      color: #6b7280;
    }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
