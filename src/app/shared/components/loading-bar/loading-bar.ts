import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/loading/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (svc.active()) {
      <div class="loading-bar" aria-hidden="true">
        <div class="loading-bar__track"></div>
      </div>
    }
  `,
  styleUrl: './loading-bar.css',
})
export class LoadingBar {
  protected readonly svc = inject(LoadingService);
}
