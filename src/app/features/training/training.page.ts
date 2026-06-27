import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProgramaTreinoService } from '../../core/services/programa-treino.service';
import { PerfilService } from '../../core/services/perfil.service';
import type { StudentInfo } from '../../core/services/perfil.service';
import { AuthService } from '../../core/auth/auth.service';
import type { ProgramaTreino } from '../../core/models';

interface CardioForm {
  equipamento: string;
  tempo: number;
  nivel: string;
  velocidade: string;
}

interface ExercicioForm {
  nome: string;
  numeroMaquina: number | null;
  series: number;
  repeticoes: number;
  carga: number | null; // kg
  youtubeUrl: string;
}

interface GrupoForm {
  letra: string;
  exercicios: ExercicioForm[];
}

interface PlanForm {
  objetivos: string;
  alunoId: string;
  cardio: CardioForm[];
  grupos: GrupoForm[];
  observacoes: string;
  aulasRecomendadas: string[];
}

type ActiveTab = 'aquecimento' | number;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function emptyCardio(): CardioForm {
  return { equipamento: '', tempo: 10, nivel: '', velocidade: '' };
}

function emptyExercicio(): ExercicioForm {
  return { nome: '', numeroMaquina: null, series: 3, repeticoes: 10, carga: null, youtubeUrl: '' };
}

function emptyGrupo(index: number): GrupoForm {
  return { letra: LETTERS[index] ?? String(index + 1), exercicios: [emptyExercicio()] };
}

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './training.html',
  styleUrl: './training.css',
})
export class TrainingPage {
  protected readonly i18n = inject(I18nService);
  private readonly svc = inject(ProgramaTreinoService);
  private readonly perfilSvc = inject(PerfilService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  private static readonly PT_MODE_KEY = 'gymdesk:pt-mode';

  protected readonly programs = signal<ProgramaTreino[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly editing = signal<ProgramaTreino | null>(null);
  protected readonly saving = signal(false);
  protected readonly activeTab = signal<ActiveTab>(0);
  protected readonly isTeacher = signal(false);
  protected readonly ptMode = signal<boolean>(
    localStorage.getItem(TrainingPage.PT_MODE_KEY) === 'true',
  );

  // ── Student combobox ──────────────────────────────────────
  protected readonly students = signal<StudentInfo[]>([]);
  protected readonly studentQuery = signal('');
  protected readonly studentDropdownOpen = signal(false);
  protected readonly selectedStudent = signal<StudentInfo | null>(null);

  protected readonly filteredStudents = computed(() => {
    const q = this.studentQuery().toLowerCase().trim();
    const all = this.students();
    if (!q) return all;
    return all.filter(
      (s) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        s.userId.toLowerCase().includes(q),
    );
  });

  protected form: PlanForm = this.emptyForm();

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        const hasTeacherRole = (p.roles ?? []).includes('teacher');
        this.isTeacher.set(hasTeacherRole);
        if (!hasTeacherRole && this.ptMode()) {
          this.ptMode.set(false);
          localStorage.removeItem(TrainingPage.PT_MODE_KEY);
        }
        if (hasTeacherRole) {
          this.loadStudents();
        }
      },
      error: () => undefined,
    });
    this.loadPrograms();
  }

  private loadStudents(): void {
    this.perfilSvc.listStudents().subscribe({
      next: (list) => this.students.set(list),
      error: () => undefined,
    });
  }

  protected togglePtMode(): void {
    const next = !this.ptMode();
    this.ptMode.set(next);
    localStorage.setItem(TrainingPage.PT_MODE_KEY, String(next));
    this.loading.set(true);
    this.loadPrograms();
  }

  private loadPrograms(): void {
    this.svc.list({ showAll: true, asPt: this.ptMode() }).subscribe({
      next: (list) => {
        this.programs.set([...list].sort((a, b) => (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  // ── Combobox methods ─────────────────────────────────────
  protected onStudentInput(value: string): void {
    this.studentQuery.set(value);
    this.form.alunoId = value;
    this.selectedStudent.set(null);
    this.studentDropdownOpen.set(true);
  }

  protected selectStudent(s: StudentInfo): void {
    this.selectedStudent.set(s);
    this.form.alunoId = s.userId;
    this.studentQuery.set(s.name ?? s.email ?? s.userId);
    this.studentDropdownOpen.set(false);
  }

  protected clearStudent(): void {
    this.selectedStudent.set(null);
    this.form.alunoId = '';
    this.studentQuery.set('');
    this.studentDropdownOpen.set(false);
  }

  protected openStudentDropdown(): void {
    this.studentDropdownOpen.set(true);
  }

  /** Delay to let click on option register before blur fires */
  protected blurStudentInput(): void {
    setTimeout(() => this.studentDropdownOpen.set(false), 160);
  }

  // ─────────────────────────────────────────────────────────

  protected toggleActive(p: ProgramaTreino): void {
    if (!p._id) return;
    const next = !p.ativo;
    this.svc.update(p._id, { ativo: next }).subscribe({
      next: () => {
        this.programs.update((list) =>
          [...list]
            .map((x) => (x._id === p._id ? { ...x, ativo: next } : x))
            .sort((a, b) => (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0)),
        );
      },
      error: () => undefined,
    });
  }

  protected toggle(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  protected startCreate(): void {
    this.form = this.emptyForm();
    this.clearStudent();
    this.activeTab.set(0);
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
    this.editing.set(null);
  }

  protected studentDisplayName(alunoId: string): string {
    const s = this.students().find((st) => st.userId === alunoId);
    return s?.alias || s?.name || s?.email || '';
  }

  // ── Video embed (generic) ─────────────────────────────────
  protected readonly activeVideoKey = signal<string | null>(null);

  protected videoKey(programId: string, grupoLetra: string, exNome: string): string {
    return `${programId}|${grupoLetra}|${exNome}`;
  }

  protected toggleVideo(key: string): void {
    this.activeVideoKey.update((cur) => (cur === key ? null : key));
  }

  /** Classify a URL so the template can pick the right player */
  protected videoType(url: string): 'youtube' | 'vimeo' | 'direct' | 'iframe' {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/vimeo\.com/.test(url)) return 'vimeo';
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return 'direct';
    return 'iframe';
  }

  protected videoEmbedUrl(url: string): SafeResourceUrl {
    const type = this.videoType(url);
    let embedUrl = url;
    if (type === 'youtube') {
      const id = this.extractYoutubeId(url);
      embedUrl = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    } else if (type === 'vimeo') {
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      embedUrl = m ? `https://player.vimeo.com/video/${m[1]}?badge=0` : url;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  private extractYoutubeId(url: string): string {
    const patterns = [
      /[?&]v=([^&#]+)/,
      /youtu\.be\/([^?&#]+)/,
      /\/embed\/([^?&#]+)/,
      /\/shorts\/([^?&#]+)/,
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return m[1];
    }
    return url;
  }

  protected readonly aulaInput = signal('');

  protected addAula(): void {
    const v = this.aulaInput().trim();
    if (!v || this.form.aulasRecomendadas.includes(v)) return;
    this.form.aulasRecomendadas = [...this.form.aulasRecomendadas, v];
    this.aulaInput.set('');
  }

  protected removeAula(i: number): void {
    this.form.aulasRecomendadas = this.form.aulasRecomendadas.filter((_, idx) => idx !== i);
  }

  protected aulaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addAula();
    }
  }

  protected startEdit(p: ProgramaTreino): void {
    this.form = {
      objetivos: p.objetivos ?? '',
      alunoId: p.alunoId ?? '',
      observacoes: p.observacoes ?? '',
      aulasRecomendadas: p.aulasRecomendadas ?? [],
      cardio: p.faseInicial.exercicios.map((c) => ({
        equipamento: c.equipamento,
        tempo: c.tempo,
        nivel: c.nivel ?? '',
        velocidade: c.velocidade ?? '',
      })),
      grupos: p.fasePrincipal.grupos.map((g) => ({
        letra: g.letra,
        exercicios: g.exercicios.map((e) => ({
          nome: e.nome,
          numeroMaquina: e.numeroMaquina ?? null,
          series: e.series,
          repeticoes: e.repeticoes,
          carga:
            e.progressao.length > 0 ? (e.progressao[e.progressao.length - 1].carga ?? null) : null,
          youtubeUrl: e.youtubeUrl ?? '',
        })),
      })),
    };
    // Pre-select student if alunoId matches a known student
    const known = this.students().find((s) => s.userId === p.alunoId);
    if (known) {
      this.selectedStudent.set(known);
      this.studentQuery.set(known.name ?? known.email ?? known.userId);
    } else {
      this.selectedStudent.set(null);
      this.studentQuery.set(p.alunoId ?? '');
    }
    this.studentDropdownOpen.set(false);
    this.activeTab.set(0);
    this.editing.set(p);
  }

  protected selectTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  protected isTab(tab: ActiveTab): boolean {
    return this.activeTab() === tab;
  }

  protected addCardio(): void {
    this.form.cardio.push(emptyCardio());
  }

  protected removeCardio(i: number): void {
    this.form.cardio.splice(i, 1);
  }

  protected addGrupo(): void {
    const idx = this.form.grupos.length;
    this.form.grupos.push(emptyGrupo(idx));
    this.activeTab.set(idx);
  }

  protected removeCurrentGrupo(): void {
    const tab = this.activeTab();
    if (typeof tab !== 'number') return;
    this.form.grupos.splice(tab, 1);
    this.form.grupos.forEach((g, i) => (g.letra = LETTERS[i] ?? String(i + 1)));
    this.activeTab.set(Math.max(0, tab - 1));
  }

  protected addExercicio(): void {
    const tab = this.activeTab();
    if (typeof tab !== 'number') return;
    this.form.grupos[tab]?.exercicios.push(emptyExercicio());
  }

  protected removeExercicio(i: number): void {
    const tab = this.activeTab();
    if (typeof tab !== 'number') return;
    this.form.grupos[tab]?.exercicios.splice(i, 1);
  }

  protected currentGrupo(): GrupoForm | null {
    const tab = this.activeTab();
    return typeof tab === 'number' ? (this.form.grupos[tab] ?? null) : null;
  }

  protected save(): void {
    if (this.saving()) return;
    const userId = this.auth.userId();
    if (!userId) return;
    this.saving.set(true);

    const existing = this.editing();
    const targetId = this.ptMode() && this.form.alunoId.trim() ? this.form.alunoId.trim() : userId;
    const payload = {
      alunoId: targetId,
      data: existing ? existing.data : new Date(),
      objetivos: this.form.objetivos.trim() || undefined,
      observacoes: this.form.observacoes.trim() || undefined,
      aulasRecomendadas: this.form.aulasRecomendadas,
      faseInicial: {
        exercicios: this.form.cardio
          .filter((c) => c.equipamento.trim())
          .map((c) => ({
            equipamento: c.equipamento.trim(),
            tempo: c.tempo,
            nivel: c.nivel.trim() || undefined,
            velocidade: c.velocidade.trim() || undefined,
          })),
      },
      fasePrincipal: {
        grupos: this.form.grupos
          .filter((g) => g.exercicios.some((e) => e.nome.trim()))
          .map((g) => ({
            letra: g.letra,
            cardioAposTreino: false,
            exercicios: g.exercicios
              .filter((e) => e.nome.trim())
              .map((e) => ({
                nome: e.nome.trim(),
                numeroMaquina: e.numeroMaquina ?? undefined,
                series: e.series,
                repeticoes: e.repeticoes,
                progressao: (() => {
                  const prev =
                    existing?.fasePrincipal.grupos
                      .find((g2) => g2.letra === g.letra)
                      ?.exercicios.find((e2) => e2.nome === e.nome.trim())?.progressao ?? [];
                  if (e.carga == null) return prev;
                  const lastCarga = prev.length > 0 ? prev[prev.length - 1].carga : undefined;
                  if (e.carga === lastCarga) return prev;
                  return [...prev, { data: new Date(), carga: e.carga }];
                })(),
                youtubeUrl: e.youtubeUrl.trim() || undefined,
              })),
          })),
        descansoEntreSeriesSegundos: existing?.fasePrincipal.descansoEntreSeriesSegundos ?? 60,
      },
      faseFinal: existing?.faseFinal ?? { duracaoSegundos: 15, todosGruposMusculares: true },
    };

    const req = (
      existing
        ? this.svc.update(existing._id!, payload as Partial<ProgramaTreino>)
        : this.svc.create(
            payload as Omit<
              ProgramaTreino,
              '_id' | 'criadoPorId' | 'ativo' | 'createdAt' | 'updatedAt'
            >,
          )
    ) as import('rxjs').Observable<unknown>;

    req.subscribe({
      next: () => {
        this.creating.set(false);
        this.editing.set(null);
        this.saving.set(false);
        this.loading.set(true);
        this.loadPrograms();
      },
      error: () => this.saving.set(false),
    });
  }

  private emptyForm(): PlanForm {
    return {
      objetivos: '',
      alunoId: '',
      cardio: [],
      grupos: [emptyGrupo(0)],
      observacoes: '',
      aulasRecomendadas: [],
    };
  }
}
