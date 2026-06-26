import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { AvaliacaoService } from '../../core/services/avaliacao.service';
import { PerfilService, type TeacherInfo } from '../../core/services/perfil.service';
import { AuthService } from '../../core/auth/auth.service';
import type { FichaAvaliacao, EntradaAvaliacao, ObjetivoTreino } from '../../core/models';

interface EntryForm {
  data: string;
  peso: string;
  imc: string;
  percentualMassaGorda: string;
  percentualMassaMagra: string;
  kcal: string;
  glicemiaVejuno: string;
  paSistolica: string;
  paDiastolica: string;
  fcRepouso: string;
  perimetroAbdominal: string;
  perimetroCintura: string;
}

interface FichaForm {
  objetivo: string;
  outrosObjetivos: string;
  studentId: string; // used in PT mode to create for a specific student
}

const OBJETIVOS: ObjetivoTreino[] = [
  'Hipertrofia',
  'Perda Massa Gorda',
  'Reabilitação / Corretivo',
  'Performance',
  'Saúde e Bem-Estar',
];

function n(v: string): number | undefined {
  const x = parseFloat(v);
  return isNaN(x) ? undefined : x;
}

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './assessment.html',
  styleUrl: './assessment.css',
})
export class AssessmentPage {
  protected readonly i18n = inject(I18nService);
  private readonly svc = inject(AvaliacaoService);
  private readonly perfilSvc = inject(PerfilService);
  private readonly auth = inject(AuthService);

  private static readonly PT_MODE_KEY = 'gymdesk:pt-mode';

  protected readonly fichas = signal<FichaAvaliacao[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly addingEntryFor = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly savedId = signal<string | null>(null);
  protected readonly creatingFicha = signal(false);
  protected readonly editingFicha = signal<FichaAvaliacao | null>(null);

  // PT / teacher mode
  protected readonly ptMode = signal<boolean>(
    localStorage.getItem(AssessmentPage.PT_MODE_KEY) === 'true',
  );
  protected readonly isTeacher = signal(false);

  // Teachers available for sharing (the student's associated teachers)
  protected readonly myTeacherIds = signal<string[]>([]);
  protected readonly teachers = signal<TeacherInfo[]>([]);
  protected readonly sharingSaving = signal<string | null>(null); // fichaId being saved

  // computed: only show teachers the student is actually associated with
  protected readonly myTeachers = computed(() =>
    this.teachers().filter((t) => this.myTeacherIds().includes(t.userId)),
  );

  protected readonly objetivos = OBJETIVOS;
  protected entryForm: EntryForm = this.emptyEntryForm();
  protected fichaForm: FichaForm = this.emptyFichaForm();

  constructor() {
    // Load own profile: roles + teacherIds
    this.perfilSvc.get().subscribe({
      next: (p) => {
        this.isTeacher.set(p.roles?.includes('teacher') ?? false);
        this.myTeacherIds.set(p.teacherIds ?? []);
      },
    });

    // Load teachers list for share UI
    this.perfilSvc.listTeachers().subscribe({
      next: (list) => this.teachers.set(list),
    });

    this.loadFichas();
  }

  private loadFichas(): void {
    this.svc.list().subscribe({
      next: (list) => {
        this.fichas.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected togglePtMode(): void {
    const next = !this.ptMode();
    this.ptMode.set(next);
    localStorage.setItem(AssessmentPage.PT_MODE_KEY, String(next));
  }

  protected toggle(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
    if (this.addingEntryFor() === id) this.addingEntryFor.set(null);
  }

  protected latestEntry(f: FichaAvaliacao): EntradaAvaliacao | null {
    return f.avaliacoes.length > 0 ? f.avaliacoes[f.avaliacoes.length - 1] : null;
  }

  /** True when this assessment belongs to another student (teacher viewing shared) */
  protected isSharedView(f: FichaAvaliacao): boolean {
    return f.studentId !== this.auth.userId();
  }

  // ── Create / Edit ficha ───────────────────────────────────────────────────

  protected startCreateFicha(): void {
    this.fichaForm = this.emptyFichaForm();
    this.creatingFicha.set(true);
  }

  protected cancelCreateFicha(): void {
    this.creatingFicha.set(false);
    this.editingFicha.set(null);
  }

  protected startEditFicha(f: FichaAvaliacao): void {
    this.fichaForm = {
      objetivo: f.objetivo ?? '',
      outrosObjetivos: f.outrosObjetivos ?? '',
      studentId: f.studentId,
    };
    this.editingFicha.set(f);
  }

  protected saveFicha(): void {
    if (this.saving()) return;
    const userId = this.auth.userId();
    if (!userId) return;
    this.saving.set(true);
    const existing = this.editingFicha();
    const obj = (this.fichaForm.objetivo || undefined) as FichaAvaliacao['objetivo'];
    const outros = this.fichaForm.outrosObjetivos.trim() || undefined;

    // In PT mode a teacher can create for a different student
    const targetStudentId =
      this.ptMode() && this.fichaForm.studentId.trim() ? this.fichaForm.studentId.trim() : userId;

    const req = existing
      ? (this.svc.update(existing._id!, {
          objetivo: obj,
          outrosObjetivos: outros,
        }) as import('rxjs').Observable<unknown>)
      : (this.svc.create({
          studentId: targetStudentId,
          objetivo: obj,
          outrosObjetivos: outros,
          avaliacoes: [],
        }) as import('rxjs').Observable<unknown>);

    req.subscribe({
      next: () => {
        this.creatingFicha.set(false);
        this.editingFicha.set(null);
        this.saving.set(false);
        this.loading.set(true);
        this.loadFichas();
      },
      error: () => this.saving.set(false),
    });
  }

  // ── Share with teachers ───────────────────────────────────────────────────

  protected isSharedWith(f: FichaAvaliacao, teacherId: string): boolean {
    return f.sharedWithTeacherIds?.includes(teacherId) ?? false;
  }

  protected toggleShare(f: FichaAvaliacao, teacher: TeacherInfo): void {
    if (this.sharingSaving()) return;
    const current = f.sharedWithTeacherIds ?? [];
    const next = current.includes(teacher.userId)
      ? current.filter((id) => id !== teacher.userId)
      : [...current, teacher.userId];

    this.sharingSaving.set(f._id!);
    this.svc.share(f._id!, next).subscribe({
      next: () => {
        // Patch local state
        this.fichas.update((list) =>
          list.map((item) => (item._id === f._id ? { ...item, sharedWithTeacherIds: next } : item)),
        );
        this.sharingSaving.set(null);
      },
      error: () => this.sharingSaving.set(null),
    });
  }

  // ── Add entry ─────────────────────────────────────────────────────────────

  protected startAddEntry(fichaId: string): void {
    this.entryForm = this.emptyEntryForm();
    this.addingEntryFor.set(fichaId);
  }

  protected cancelAddEntry(): void {
    this.addingEntryFor.set(null);
  }

  protected saveEntry(fichaId: string): void {
    if (this.saving()) return;
    this.saving.set(true);
    const f = this.entryForm;
    const pa =
      n(f.paSistolica) !== undefined && n(f.paDiastolica) !== undefined
        ? { sistolica: n(f.paSistolica)!, diastolica: n(f.paDiastolica)! }
        : undefined;
    const per =
      n(f.perimetroAbdominal) !== undefined || n(f.perimetroCintura) !== undefined
        ? { abdominal: n(f.perimetroAbdominal), cintura: n(f.perimetroCintura) }
        : undefined;
    const entry: EntradaAvaliacao = {
      data: new Date(f.data),
      peso: n(f.peso),
      imc: n(f.imc),
      percentualMassaGorda: n(f.percentualMassaGorda),
      percentualMassaMagra: n(f.percentualMassaMagra),
      kcal: n(f.kcal),
      glicemiaVejuno: n(f.glicemiaVejuno),
      pressaoArterial: pa,
      fcRepouso: n(f.fcRepouso) !== undefined ? Math.round(n(f.fcRepouso)!) : undefined,
      perimetros: per,
    };
    this.svc.addEntrada(fichaId, entry).subscribe({
      next: () => {
        this.addingEntryFor.set(null);
        this.saving.set(false);
        this.savedId.set(fichaId);
        setTimeout(() => this.savedId.set(null), 2500);
        this.loadFichas();
      },
      error: () => this.saving.set(false),
    });
  }

  private emptyEntryForm(): EntryForm {
    return {
      data: new Date().toISOString().slice(0, 10),
      peso: '',
      imc: '',
      percentualMassaGorda: '',
      percentualMassaMagra: '',
      kcal: '',
      glicemiaVejuno: '',
      paSistolica: '',
      paDiastolica: '',
      fcRepouso: '',
      perimetroAbdominal: '',
      perimetroCintura: '',
    };
  }

  private emptyFichaForm(): FichaForm {
    return { objetivo: '', outrosObjetivos: '', studentId: '' };
  }
}
