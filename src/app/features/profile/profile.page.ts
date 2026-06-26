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
  protected isTrainer = computed(() => this.roles().includes('teacher'));

  // Trainer profile modal
  protected trainerModalOpen = signal(false);
  /** draft while modal is open — discarded on cancel */
  protected trainerDraft = signal<TeacherProfile>({});
  protected trainerSaving = signal(false);
  protected trainerSaved = signal(false);

  // Saved trainer profile (shown in the card)
  protected trainerProfile = signal<TeacherProfile>({});

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
        this.trainerProfile.set(p.teacherProfile ?? {});
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

  // ── Trainer mode toggle / modal ───────────────────

  protected clickTrainerToggle(): void {
    if (this.isTrainer()) {
      // Already active → turn off immediately (no modal needed)
      this.setTrainerRole(false);
    } else {
      // Not active → open modal to fill profile before activating
      this.openTrainerModal();
    }
  }

  protected openTrainerModal(): void {
    // Seed draft with current saved profile
    this.trainerDraft.set({ ...this.trainerProfile() });
    this.trainerSaved.set(false);
    this.trainerModalOpen.set(true);
  }

  protected closeTrainerModal(): void {
    this.trainerModalOpen.set(false);
  }

  protected saveTrainerModal(): void {
    if (this.trainerSaving()) return;
    this.trainerSaving.set(true);

    const draft = this.trainerDraft();
    const wasTrainer = this.isTrainer();
    const newRoles: Role[] = wasTrainer ? this.roles() : [...this.roles(), 'teacher'];

    this.perfilSvc.save({ roles: newRoles, teacherProfile: draft }).subscribe({
      next: () => {
        this.roles.set(newRoles);
        this.trainerProfile.set(draft);
        this.trainerSaving.set(false);
        this.trainerSaved.set(true);
        setTimeout(() => {
          this.trainerSaved.set(false);
          this.trainerModalOpen.set(false);
          if (!wasTrainer) this.loadTeachers();
        }, 1000);
      },
      error: () => this.trainerSaving.set(false),
    });
  }

  protected updateDraftField(field: keyof TeacherProfile, value: string): void {
    this.trainerDraft.set({ ...this.trainerDraft(), [field]: value });
  }

  private setTrainerRole(active: boolean): void {
    const current = this.roles();
    const next: Role[] = active ? [...current, 'teacher'] : current.filter((r) => r !== 'teacher');
    this.perfilSvc.save({ roles: next }).subscribe({
      next: () => this.roles.set(next),
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
}
