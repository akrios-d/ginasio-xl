import { Injectable, signal, computed } from '@angular/core';

/**
 * Tracks in-flight HTTP requests so the loading bar knows when to show.
 * Call increment() before a request starts and decrement() when it ends.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _count = signal(0);

  readonly active = computed(() => this._count() > 0);

  increment(): void {
    this._count.update((n) => n + 1);
  }
  decrement(): void {
    this._count.update((n) => Math.max(0, n - 1));
  }
}
