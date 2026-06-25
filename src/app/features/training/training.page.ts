import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProgramaTreinoService } from '../../core/services/programa-treino.service';
import { AuthService } from '../../core/auth/auth.service';
import type { ProgramaTreino } from '../../core/models';

interface CardioForm {
  equipamento: string;
  tempo: number;
}

interface ExercicioForm {
  nome: string;
  series: number;
  repeticoes: number;
}

interface GrupoForm {
  letra: string;
  exercicios: ExercicioForm[];
}

interface PlanForm {
  objetivos: string;
  cardio: CardioForm[];
  grupos: GrupoForm[];
  observacoes: string;
}

// Tab: 'aquecimento' | group index
type ActiveTab = 'aquecimento' | number;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function emptyCardio(): CardioForm {
  return { equipamento: '', tempo: 10 };
}

function emptyExercicio(): ExercicioForm {
  return { nome: '', series: 3, repeticoes: 10 };
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
  private readonly auth = inject(AuthService);

  protected readonly programs = signal<ProgramaTreino[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly activeTab = signal<ActiveTab>(0);

  protected form: PlanForm = this.emptyForm();

  constructor() {
    this.loadPrograms();
  }

  private loadPrograms(): void {
    this.svc.list().subscribe({
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

  protected toggle(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  // ── Sheet ─────────────────────────────────────────────────────────────────

  protected startCreate(): void {
    this.form = this.emptyForm();
    this.activeTab.set(0);
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected selectTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  protected isTab(tab: ActiveTab): boolean {
    return this.activeTab() === tab;
  }

  // ── Aquecimento ───────────────────────────────────────────────────────────

  protected addCardio(): void {
    this.form.cardio.push(emptyCardio());
  }

  protected removeCardio(i: number): void {
    this.form.cardio.splice(i, 1);
  }

  // ── Grupos ────────────────────────────────────────────────────────────────

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

  // ── Save ──────────────────────────────────────────────────────────────────

  protected save(): void {
    if (this.saving()) return;
    const userId = this.auth.userId();
    if (!userId) return;

    this.saving.set(true);

    const payload = {
      alunoId: userId,
      data: new Date(),
      objetivos: this.form.objetivos.trim() || undefined,
      observacoes: this.form.observacoes.trim() || undefined,
      aulasRecomendadas: [],
      faseInicial: {
        exercicios: this.form.cardio
          .filter((c) => c.equipamento.trim())
          .map((c) => ({ equipamento: c.equipamento.trim(), tempo: c.tempo })),
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
                series: e.series,
                repeticoes: e.repeticoes,
                progressao: [],
              })),
          })),
        descansoEntreSeriesSegundos: 60,
      },
      faseFinal: { duracaoSegundos: 15, todosGruposMusculares: true },
    };

    this.svc.create(payload as any).subscribe({
      next: () => {
        this.creating.set(false);
        this.saving.set(false);
        this.loading.set(true);
        this.loadPrograms();
      },
      error: () => this.saving.set(false),
    });
  }

  private emptyForm(): PlanForm {
    return { objetivos: '', cardio: [], grupos: [emptyGrupo(0)], observacoes: '' };
  }
}
