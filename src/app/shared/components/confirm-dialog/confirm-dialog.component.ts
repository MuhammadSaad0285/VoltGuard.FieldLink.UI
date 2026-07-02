import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-backdrop" role="presentation" (click)="cancel.emit()"></div>

    <section class="dialog-panel" role="dialog" aria-modal="true" [attr.aria-label]="title">
      <header>
        <h2>{{ title }}</h2>
      </header>

      <p>{{ message }}</p>

      <footer>
        <button type="button" class="secondary-action" (click)="cancel.emit()" [disabled]="busy">
          {{ cancelText }}
        </button>

        <button
          type="button"
          [class]="danger ? 'danger-action' : 'primary-action'"
          (click)="confirm.emit()"
          [disabled]="busy">
          {{ busy ? busyText : confirmText }}
        </button>
      </footer>
    </section>
  `,
  styles: [`
    :host {
      inset: 0;
      position: fixed;
      z-index: 1000;
    }

    .dialog-backdrop {
      background: rgba(15, 23, 42, 0.48);
      inset: 0;
      position: fixed;
    }

    .dialog-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.9rem;
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22);
      left: 50%;
      max-width: min(28rem, calc(100vw - 2rem));
      padding: 1.25rem;
      position: fixed;
      top: 18vh;
      transform: translateX(-50%);
      width: 100%;
    }

    h2 {
      color: #0f172a;
      font-size: 1.05rem;
      margin: 0;
    }

    p {
      color: #475569;
      line-height: 1.5;
      margin: 0.85rem 0 1.25rem;
    }

    footer {
      display: flex;
      gap: 0.7rem;
      justify-content: flex-end;
    }

    button {
      border: 0;
      border-radius: 0.7rem;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      padding: 0.7rem 0.95rem;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .secondary-action {
      background: #e2e8f0;
      color: #0f172a;
    }

    .primary-action {
      background: #0f172a;
      color: #ffffff;
    }

    .danger-action {
      background: #991b1b;
      color: #ffffff;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirm action';
  @Input() message = '';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() busyText = 'Working...';
  @Input() busy = false;
  @Input() danger = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
