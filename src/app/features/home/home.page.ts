import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  protected readonly i18n = inject(I18nService);

  protected readonly features = [
    { key: 'i18n' as const },
    { key: 'theme' as const },
    { key: 'api' as const },
  ];
}
