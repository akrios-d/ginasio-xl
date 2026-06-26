import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProgramaTreinoService } from '../../core/services/programa-treino.service';
import { PerfilService } from '../../core/services/perfil.service';
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
  youtubeUrl: string;
}

interface GrupoForm {
  letra: string;
  exercicios: ExercicioForm[];
}

interface PlanForm {
  objetivos: string;
  alunoId: string; // só usado em modo PT
  cardio: CardioForm[];
  grupos: GrupoForm[];
  observacoes: string;
}

type ActiveTab = 'aquecimento' | number;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function emptyCardio(): CardioForm {
  return { equipamento: '', tempo: 10, nivel: '', velocidade: '' };
}

function emptyExercicio(): ExercicioForm {
  return { nome: '', numeroMaquina: null, series: 3, repeticoes: 10, youtubeUrl: '' };
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

  protected form: PlanForm = this.emptyForm();

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        const hasTeacherRole = (p.roles ?? []).includes('teacher');
        this.isTeacher.set(hasTeacherRole);
        // clear ptMode if user no longer has teacher role
        if (!hasTeacherRole && this.ptMode()) {
          this.ptMode.set(false);
          localStorage.removeItem(TrainingPage.PT_MODE_KEY);
        }
      },
      error: () => undefined,
    });
    this.loadPrograms();
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
    this.activeTab.set(0);
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
    this.editing.set(null);
  }

  protected startEdit(p: ProgramaTreino): void {
    this.form = {
      objetivos: p.objetivos ?? '',
      alunoId: p.alunoId ?? '',
      observacoes: p.observacoes ?? '',
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
          youtubeUrl: e.youtubeUrl ?? '',
        })),
      })),
    };
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
      aulasRecomendadas: existing?.aulasRecomendadas ?? [],
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
                progressao: [],
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
    return { objetivos: '', alunoId: '', cardio: [], grupos: [emptyGrupo(0)], observacoes: '' };
  }
}
