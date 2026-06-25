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
    const payload = {
      alunoId: userId,
      objetivo: this.fichaForm.objetivo,
      outrosObjetivos: this.fichaForm.outrosObjetivos.trim() || undefined,
      avaliacoes: [],
    };

    this.svc.create(payload).subscribe({
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

  protected startAddEntry(id: string): void {
    this.entryForm = this.emptyEntryForm();
    this.addingEntryFor.set(id);
    if (this.expandedId() !== id) this.expandedId.set(id);
  }

  protected cancelAddEntry(): void {
    this.addingEntryFor.set(null);
  }

  protected saveEntry(fichaId: string): void {
    if (this.saving()) return;
    this.saving.set(true);

    const entrada: EntradaAvaliacao = {
      data: new Date(this.entryForm.data),
      peso: this.entryForm.peso ? Number(this.entryForm.peso) : undefined,
      imc: this.entryForm.imc ? Number(this.entryForm.imc) : undefined,
      percentualMassaGorda: this.entryForm.percentualMassaGorda
        ? Number(this.entryForm.percentualMassaGorda)
        : undefined,
      percentualMassaMagra: this.entryForm.percentualMassaMagra
        ? Number(this.entryForm.percentualMassaMagra)
        : undefined,
    };

    this.svc.addEntrada(fichaId, entrada).subscribe({
      next: () => {
        this.fichas.update((list) =>
          list.map((f) =>
            f._id === fichaId ? { ...f, avaliacoes: [...f.avaliacoes, entrada] } : f,
          ),
        );
        this.saving.set(false);
        this.addingEntryFor.set(null);
        this.savedId.set(fichaId);
        setTimeout(() => this.savedId.set(null), 3000);
      },
      error: () => this.saving.set(false),
    });
  }

  protected latestEntry(ficha: FichaAvaliacao): EntradaAvaliacao | null {
    if (!ficha.avaliacoes.length) return null;
    return ficha.avaliacoes[ficha.avaliacoes.length - 1];
  }

  private emptyEntryForm(): EntryForm {
    return {
      data: new Date().toISOString().slice(0, 10),
      peso: '',
      imc: '',
      percentualMassaGorda: '',
      percentualMassaMagra: '',
    };
  }

  private emptyFichaForm(): FichaForm {
    return { objetivo: 'Saúde e Bem-Estar', outrosObjetivos: '' };
  }
}
