import { ApplicationRef, inject, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs';

/**
 * Activates new service worker versions as soon as they're ready.
 *
 * Flow:
 *   1. Wait for Angular to stabilise (no pending micro-tasks).
 *   2. Poll for updates once, then every 60s.
 *   3. When VERSION_READY fires, activate + reload.
 *
 * Safe because the app is server-of-truth: reloading never loses local state
 * that wasn't already persisted server-side.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.appRef.isStable.pipe(first((stable) => stable)).subscribe(() => {
      this.listenForUpdates();
      this.pollForUpdates();
    });
  }

  private listenForUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.swUpdate.activateUpdate().then(() => {
          document.location.reload();
        });
      });
  }

  private pollForUpdates(): void {
    this.checkNow();
    setInterval(() => this.checkNow(), 60_000);
  }

  private checkNow(): void {
    this.swUpdate.checkForUpdate().catch(() => {
      // SW may not be active yet on first load — ignore.
    });
  }
}
