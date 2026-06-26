import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService, type AppLanguage } from '../../core/i18n/i18n.service';
import {
  PerfilService,
  type StudentInfo,
  type TeacherInfo,
} from '../../core/services/perfil.service';
import { AuthService } from '../../core/auth/auth.service';
import { Flag } from '../../shared/components/flag/flag';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, Flag, ThemeToggle, Icon],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage {
  protected readonly i18n = inject(I18nService);
  private readonly perfilSvc = inject(PerfilService);
  protected readonly auth = inject(AuthService);

  protected loading = signal(true);
  protected idCopied = signal(false);

  // Name edit state
  protected displayName = signal('');
  protected nameEditing = signal(false);
  protected nameSaving = signal(false);

  // Teacher state
  protected isTeacher = signal(false);

  // Student: my teachers
  protected myTeachers = signal<TeacherInfo[]>([]);
  protected students = signal<StudentInfo[]>([]);
  protected studentsSheetOpen = signal(false);
  protected studentIdInput = signal('');
  protected linkSaving = signal(false);
  protected linkError = signal('');
  protected unlinkingId = signal<string | null>(null);

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        this.displayName.set(p.name ?? '');
        const isT = (p.roles ?? []).includes('teacher');
        this.isTeacher.set(isT);
        this.loading.set(false);
        if (isT) this.loadStudents();
        // Always load teachers (user may also be a student)
        this.loadMyTeachers();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadStudents(): void {
    this.perfilSvc.listStudents().subscribe({
      next: (list) => this.students.set(list),
      error: () => undefined,
    });
  }

  private loadMyTeachers(): void {
    this.perfilSvc.listMyTeachers().subscribe({
      next: (list) => this.myTeachers.set(list),
      error: () => undefined,
    });
  }

  protected startEditName(): void {
    this.nameEditing.set(true);
  }

  protected cancelEditName(): void {
    this.nameEditing.set(false);
  }

  protected saveName(): void {
    const name = this.displayName().trim();
    if (!name || this.nameSaving()) return;
    this.nameSaving.set(true);
    this.perfilSvc.save({ name }).subscribe({
      next: () => {
        this.nameSaving.set(false);
        this.nameEditing.set(false);
      },
      error: () => this.nameSaving.set(false),
    });
  }

  protected openStudentsSheet(): void {
    this.studentsSheetOpen.set(true);
  }

  protected closeStudentsSheet(): void {
    this.studentsSheetOpen.set(false);
    this.studentIdInput.set('');
    this.linkError.set('');
  }

  protected linkStudent(): void {
    const id = this.studentIdInput().trim();
    if (!id || this.linkSaving()) return;
    this.linkError.set('');
    this.linkSaving.set(true);

    this.perfilSvc.linkStudent(id).subscribe({
      next: (res) => {
        this.students.update((list) => {
          if (list.some((s) => s.userId === id)) return list;
          return [...list, { _id: '', userId: id, name: res.name, email: res.email }];
        });
        this.studentIdInput.set('');
        this.linkSaving.set(false);
      },
      error: (err) => {
        const status = err?.status;
        this.linkError.set(
          status === 404
            ? this.i18n.t('profile.alunoNotFound')
            : status === 403
              ? this.i18n.t('profile.forbidden')
              : this.i18n.t('common.error'),
        );
        this.linkSaving.set(false);
      },
    });
  }

  protected unlinkStudent(s: StudentInfo): void {
    if (this.unlinkingId()) return;
    this.unlinkingId.set(s.userId);
    this.perfilSvc.unlinkStudent(s.userId).subscribe({
      next: () => {
        this.students.update((list) => list.filter((x) => x.userId !== s.userId));
        this.unlinkingId.set(null);
      },
      error: () => this.unlinkingId.set(null),
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
