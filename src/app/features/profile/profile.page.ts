import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { PerfilService } from '../../core/services/perfil.service';

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

  protected nome = signal('');
  protected numeroAluno = signal('');
  protected loading = signal(true);
  protected saving = signal(false);
  protected saved = signal(false);

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
