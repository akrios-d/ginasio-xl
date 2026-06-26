import { Component, inject, signal } from '@angular/core';
import { I18nService, type AppLanguage } from '../../core/i18n/i18n.service';
import { PerfilService, type TeacherInfo } from '../../core/services/perfil.service';
import { AuthService } from '../../core/auth/auth.service';
import { Flag } from '../../shared/components/flag/flag';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [Flag, ThemeToggle, Icon],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage {
  protected readonly i18n = inject(I18nService);
  private readonly perfilSvc = inject(PerfilService);
  protected readonly auth = inject(AuthService);

  protected loading = signal(true);
  protected idCopied = signal(false);

  // Teacher association (student side)
  protected teachers = signal<TeacherInfo[]>([]);
  protected teacherIds = signal<string[]>([]);
  protected loadingTeachers = signal(false);
  protected assocSaving = signal(false);

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        this.teacherIds.set(p.teacherIds ?? []);
        this.loading.set(false);
        this.loadTeachers();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadTeachers(): void {
    this.loadingTeachers.set(true);
    this.perfilSvc.listTeachers().subscribe({
      next: (list) => {
        this.teachers.set(list);
        this.loadingTeachers.set(false);
      },
      error: () => this.loadingTeachers.set(false),
    });
  }

  // ── Teacher association (student side) ───────────

  protected associate(teacher: TeacherInfo): void {
    if (this.assocSaving()) return;
    const current = this.teacherIds();
    const isSelected = current.includes(teacher.userId);
    const next = isSelected
      ? current.filter((id) => id !== teacher.userId)
      : [...current, teacher.userId];
    this.assocSaving.set(true);
    this.perfilSvc.save({ teacherIds: next }).subscribe({
      next: () => {
        this.teacherIds.set(next);
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

  protected pickLanguage(code: AppLanguage): void {
    this.i18n.setLanguage(code);
  }
}
