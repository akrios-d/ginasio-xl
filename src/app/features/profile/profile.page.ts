import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { PerfilService, type TeacherInfo } from '../../core/services/perfil.service';
import { AuthService } from '../../core/auth/auth.service';
import type { Role, TeacherProfile } from '../../core/models';

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

  protected loading = signal(true);
  protected idCopied = signal(false);

  // Roles
  protected roles = signal<Role[]>(['student']);
  protected isTeacher = computed(() => this.roles().includes('teacher'));
  protected teacherSaving = signal(false);

  // Teacher profile fields
  protected teacherProfile = signal<TeacherProfile>({});
  protected teacherProfileSaving = signal(false);
  protected teacherProfileSaved = signal(false);

  // Teacher association (student side)
  protected teachers = signal<TeacherInfo[]>([]);
  protected teacherIds = signal<string[]>([]);
  protected loadingTeachers = signal(false);
  protected assocSaving = signal(false);

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        this.roles.set(p.roles ?? ['student']);
        this.teacherIds.set(p.teacherIds ?? []);
        this.teacherProfile.set(p.teacherProfile ?? {});
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

  protected toggleTeacherMode(): void {
    if (this.teacherSaving()) return;
    const current = this.roles();
    const next: Role[] = this.isTeacher()
      ? current.filter((r) => r !== 'teacher')
      : [...current, 'teacher'];
    this.teacherSaving.set(true);
    this.perfilSvc.save({ roles: next }).subscribe({
      next: () => {
        this.roles.set(next);
        this.teacherSaving.set(false);
        if (next.includes('teacher')) this.loadTeachers();
      },
      error: () => this.teacherSaving.set(false),
    });
  }

  protected saveTeacherProfile(): void {
    if (this.teacherProfileSaving()) return;
    this.teacherProfileSaving.set(true);
    this.perfilSvc.save({ teacherProfile: this.teacherProfile() }).subscribe({
      next: () => {
        this.teacherProfileSaving.set(false);
        this.teacherProfileSaved.set(true);
        setTimeout(() => this.teacherProfileSaved.set(false), 2500);
      },
      error: () => this.teacherProfileSaving.set(false),
    });
  }

  protected updateTeacherField(field: keyof TeacherProfile, value: string): void {
    this.teacherProfile.set({ ...this.teacherProfile(), [field]: value });
  }

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
}
