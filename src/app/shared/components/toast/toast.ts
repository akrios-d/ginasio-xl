import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  styleUrl: './toast.css',
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type" role="alert">
          <span class="toast-icon">
            @if (toast.type === 'error') {
              ✕
            } @else if (toast.type === 'success') {
              ✓
            } @else {
              ℹ
            }
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
})
export class Toast {
  readonly toastService = inject(ToastService);
}
