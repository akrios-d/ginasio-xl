import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { PerfilService } from '../../core/services/perfil.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage {
  protected readonly i18n = inject(I18nService);
  private readonly perfilSvc = inject(PerfilService);
  protected readonly auth = inject(AuthService);

  private static readonly PT_MODE_KEY = 'gymdesk:pt-mode';

  protected nome = signal('');
  protected numeroAluno = signal('');
  protected loading = signal(true);
  protected saving = signal(false);
  protected saved = signal(false);
  protected ptMode = signal<boolean>(localStorage.getItem(ProfilePage.PT_MODE_KEY) === 'true');
  protected idCopied = signal(false);

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        this.nome.set(p.nome ?? '');
        this.numeroAluno.set(p.numeroAluno ?? '');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected togglePtMode(): void {
    const next = !this.ptMode();
    this.ptMode.set(next);
    localStorage.setItem(ProfilePage.PT_MODE_KEY, String(next));
  }

  protected copyId(): void {
    const id = this.auth.userId();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      this.idCopied.set(true);
      setTimeout(() => this.idCopied.set(false), 2000);
    });
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);

    this.perfilSvc
      .save({ nome: this.nome(), numeroAluno: this.numeroAluno() || undefined })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 3000);
        },
        error: () => this.saving.set(false),
      });
  }
}
