import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { AvaliacaoService } from '../../core/services/avaliacao.service';
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
  objetivo: ObjetivoTreino;
  outrosObjetivos: string;
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
  private readonly auth = inject(AuthService);

  protected readonly fichas = signal<FichaAvaliacao[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly addingEntryFor = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly savedId = signal<string | null>(null);
  protected readonly creatingFicha = signal(false);

  protected readonly objetivos = OBJETIVOS;
  protected entryForm: EntryForm = this.emptyEntryForm();
  protected fichaForm: FichaForm = this.emptyFichaForm();

  constructor() {
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

  protected toggle(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
    if (this.addingEntryFor() === id) this.addingEntryFor.set(null);
  }

  protected latestEntry(f: FichaAvaliacao): EntradaAvaliacao | null {
    return f.avaliacoes.length > 0 ? f.avaliacoes[f.avaliacoes.length - 1] : null;
  }

  // ── Create ficha ──────────────────────────────────────────────────────────

  protected startCreateFicha(): void {
    this.fichaForm = this.emptyFichaForm();
    this.creatingFicha.set(true);
  }

  protected cancelCreateFicha(): void {
    this.creatingFicha.set(false);
  }

  protected saveFicha(): void {
    if (this.saving()) return;
    const userId = this.auth.userId();
    if (!userId) return;
    this.saving.set(true);
    this.svc
      .create({
        alunoId: userId,
        objetivo: this.fichaForm.objetivo,
        outrosObjetivos: this.fichaForm.outrosObjetivos.trim() || undefined,
        avaliacoes: [],
      })
      .subscribe({
        next: () => {
          this.creatingFicha.set(false);
          this.saving.set(false);
          this.loading.set(true);
          this.loadFichas();
        },
        error: () => this.saving.set(false),
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
    return { objetivo: 'Hipertrofia', outrosObjetivos: '' };
  }
}
