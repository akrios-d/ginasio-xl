import { Component, Input, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';

/**
 * Add new icon names here as you drop more SVGs into `public/icons/<name>.svg`.
 * Keeping this as a string union gives type-safe `<app-icon name="..." />` usage.
 */
export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'chart'
  | 'close'
  | 'edit'
  | 'logout'
  | 'mic'
  | 'plus'
  | 'trash';

/**
 * Lazy-loads an SVG from `/icons/<name>.svg` and inlines it via `[innerHTML]`
 * after `bypassSecurityTrustHtml`. Identical names share a single Observable
 * thanks to `shareReplay(1)` + a static cache, so HTTP fires once per icon
 * across the whole app.
 *
 * Usage: `<app-icon name="trash" [size]="20" />`
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.html',
  styleUrl: './icon.css',
  imports: [AsyncPipe],
})
export class Icon {
  @Input({ required: true })
  set name(value: IconName) {
    this.loadIcon(value);
  }

  @Input() size = 16;

  safeSvg$!: Observable<SafeHtml>;

  private static readonly cache = new Map<IconName, Observable<SafeHtml>>();

  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  static clearCache(): void {
    Icon.cache.clear();
  }

  private loadIcon(name: IconName): void {
    const cached = Icon.cache.get(name);

    if (cached) {
      this.safeSvg$ = cached;
      return;
    }

    const request$ = this.http.get(`/icons/${name}.svg`, { responseType: 'text' }).pipe(
      map((svg) => this.sanitizer.bypassSecurityTrustHtml(svg)),
      catchError(() => of(this.sanitizer.bypassSecurityTrustHtml(''))),
      shareReplay(1),
    );

    Icon.cache.set(name, request$);
    this.safeSvg$ = request$;
  }
}
