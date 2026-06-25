import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { PerfilService, type ProfessorInfo } from '../../core/services/perfil.service';
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

  protected numeroAluno = signal('');
  protected loading = signal(true);
  protected saving = signal(false);
  protected saved = signal(false);
  protected ptMode = signal<boolean>(localStorage.getItem(ProfilePage.PT_MODE_KEY) === 'true');
  protected idCopied = signal(false);

  protected professors = signal<ProfessorInfo[]>([]);
  protected professorId = signal('');
  protected loadingProfs = signal(false);
  protected assocSaving = signal(false);

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        this.numeroAluno.set(p.numeroAluno ?? '');
        this.professorId.set(p.professorId ?? '');
        this.loading.set(false);
        if (!this.ptMode()) {
          this.loadProfessors();
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadProfessors(): void {
    this.loadingProfs.set(true);
    this.perfilSvc.listProfessores().subscribe({
      next: (list) => {
        this.professors.set(list);
        this.loadingProfs.set(false);
      },
      error: () => this.loadingProfs.set(false),
    });
  }

  protected togglePtMode(): void {
    const next = !this.ptMode();
    this.ptMode.set(next);
    localStorage.setItem(ProfilePage.PT_MODE_KEY, String(next));
    this.perfilSvc.save({ isProfessor: next }).subscribe({
      next: () => undefined,
      error: () => undefined,
    });
    if (!next) {
      this.loadProfessors();
    }
  }

  protected associate(prof: ProfessorInfo): void {
    if (this.assocSaving()) return;
    const isSame = this.professorId() === prof.userId;
    const next = isSame ? '' : prof.userId;
    this.assocSaving.set(true);
    this.perfilSvc.save({ professorId: next || undefined }).subscribe({
      next: () => {
        this.professorId.set(next);
        this.assocSaving.set(false);
      },
      error: () => this.assocSaving.set(false),
    });
  }

  protected copyId(): void {
    const id = this.auth.userId();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      this.idCopied.set(true);
      setTimeout(() => this.idCopied.set(false), 2000);
    });
  }
}
