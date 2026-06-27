import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { AvaliacaoService } from '../../core/services/avaliacao.service';
import {
  PerfilService,
  type TeacherInfo,
  type StudentInfo,
} from '../../core/services/perfil.service';
import { AuthService } from '../../core/auth/auth.service';
import { CheckinService } from '../../core/services/checkin.service';
import type { FichaAvaliacao, EntradaAvaliacao, MetasAvaliacao } from '../../core/models';
import type { Checkin } from '../../core/models/checkin.model';
import { OBJETIVO_OPTIONS } from '../../core/models';

// ── Form interfaces ────────────────────────────────────────────────────────

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

interface MetasForm {
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
  studentId: string;
  metas: MetasForm;
}

// ── Chart types ────────────────────────────────────────────────────────────

export type ChartMetric =
  | 'peso'
  | 'imc'
  | 'percentualMassaGorda'
  | 'percentualMassaMagra'
  | 'kcal'
  | 'glicemiaVejuno'
  | 'paSistolica'
  | 'paDiastolica'
  | 'fcRepouso'
  | 'perimetroAbdominal'
  | 'perimetroCintura';

export interface ChartMetricDef {
  key: ChartMetric;
  i18nKey: string;
  unit: string;
}

export interface ChartDot {
  x: number;
  y: number;
  v: number;
  date: Date;
}

export interface ChartResult {
  hasData: boolean;
  hasCurve: boolean;
  dots: ChartDot[];
  path: string;
  metaPath: string | null;
  metaY: number | null;
  metaV: number | null;
  yMinLabel: string;
  yMaxLabel: string;
  firstLabel: string;
  lastLabel: string;
}

export interface RingResult {
  key: ChartMetric;
  i18nKey: string;
  unit: string;
  current: number;
  meta: number;
  pct: number; // 0–100 for display (clamped)
  rawProgress: number; // unclamped (can be < 0 or > 1)
  dashOffset: number;
  color: string;
  achieved: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const OBJETIVOS = [...OBJETIVO_OPTIONS];

const CHART_METRICS: ChartMetricDef[] = [
  { key: 'peso', i18nKey: 'avaliacao.peso', unit: 'kg' },
  { key: 'imc', i18nKey: 'avaliacao.imc', unit: '' },
  { key: 'percentualMassaGorda', i18nKey: 'avaliacao.mg', unit: '%' },
  { key: 'percentualMassaMagra', i18nKey: 'avaliacao.mm', unit: '%' },
  { key: 'kcal', i18nKey: 'avaliacao.kcal', unit: '' },
  { key: 'glicemiaVejuno', i18nKey: 'avaliacao.gv', unit: '' },
  { key: 'paSistolica', i18nKey: 'avaliacao.pas', unit: '' },
  { key: 'paDiastolica', i18nKey: 'avaliacao.pad', unit: '' },
  { key: 'fcRepouso', i18nKey: 'avaliacao.fc', unit: 'bpm' },
  { key: 'perimetroAbdominal', i18nKey: 'avaliacao.abd', unit: 'cm' },
  { key: 'perimetroCintura', i18nKey: 'avaliacao.cint', unit: 'cm' },
];

// chart SVG coordinate constants
const CW = 500;
const CH = 100;
const CPL = 4;
const CPR = 4;
const CPT = 8;
const CPB = 4;

// ring SVG constants
const RING_R = 30;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 188.5

function n(v: string): number | undefined {
  const x = parseFloat(v);
  return isNaN(x) ? undefined : x;
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────────────

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
  private readonly checkinSvc = inject(CheckinService);

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

  // Students (PT mode)
  protected readonly students = signal<StudentInfo[]>([]);
  protected readonly selectedStudentId = signal<string | null>(null);
  protected readonly studentsLoading = signal(false);

  // Combobox for student filter
  protected readonly studentComboQuery = signal('');
  protected readonly studentComboOpen = signal(false);
  protected readonly studentComboDisplay = computed(() => {
    const id = this.selectedStudentId();
    if (id === null) return '';
    const s = this.students().find((st) => st.userId === id);
    if (!s) return id;
    return s.alias || s.name || s.email || id;
  });
  protected readonly filteredStudentsForCombo = computed(() => {
    const q = this.studentComboQuery().toLowerCase().trim();
    if (!q) return this.students();
    return this.students().filter(
      (s) =>
        (s.alias || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        s.userId.toLowerCase().includes(q),
    );
  });

  // Teachers available for sharing
  protected readonly myTeacherIds = signal<string[]>([]);
  protected readonly teachers = signal<TeacherInfo[]>([]);
  protected readonly sharingSaving = signal<string | null>(null);
  protected readonly myTeachers = computed(() =>
    this.teachers().filter((t) => this.myTeacherIds().includes(t.userId)),
  );

  // Chart
  protected readonly chartMetric = signal<ChartMetric>('peso');
  protected readonly chartMetrics = CHART_METRICS;

  // Metas sheet toggle
  protected readonly metasOpen = signal(false);

  // Student check-ins (PT mode — to show cargas)
  protected readonly studentCheckins = signal<Checkin[]>([]);
  protected readonly cargasOpen = signal(false);

  protected readonly objetivos = OBJETIVOS;
  protected entryForm: EntryForm = this.emptyEntryForm();
  protected fichaForm: FichaForm = this.emptyFichaForm();

  constructor() {
    this.perfilSvc.get().subscribe({
      next: (p) => {
        const isT = p.roles?.includes('teacher') ?? false;
        this.isTeacher.set(isT);
        this.myTeacherIds.set(p.teacherIds ?? []);
        if (isT) {
          this.loadStudents();
        }
      },
    });

    this.perfilSvc.listTeachers().subscribe({
      next: (list) => this.teachers.set(list),
    });

    if (this.ptMode()) {
      this.loading.set(false);
    } else {
      this.loadFichas();
      // Load own check-ins to show carga evolution
      this.checkinSvc.list().subscribe({
        next: (list) => this.studentCheckins.set(list),
        error: () => {
          /* non-critical */
        },
      });
    }
  }

  private loadFichas(studentId?: string): void {
    this.svc.list(studentId).subscribe({
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

  private loadStudents(): void {
    this.studentsLoading.set(true);
    this.perfilSvc.listStudents().subscribe({
      next: (list) => {
        this.students.set(list);
        this.studentsLoading.set(false);
      },
      error: () => this.studentsLoading.set(false),
    });
  }

  protected onStudentComboInput(value: string): void {
    this.studentComboQuery.set(value);
    this.studentComboOpen.set(true);
  }

  protected selectStudentFromCombo(id: string | null): void {
    this.selectStudent(id);
    this.studentComboQuery.set('');
    this.studentComboOpen.set(false);
  }

  protected openStudentCombo(): void {
    this.studentComboOpen.set(true);
  }

  protected blurStudentCombo(): void {
    setTimeout(() => {
      this.studentComboQuery.set('');
      this.studentComboOpen.set(false);
    }, 160);
  }

  protected selectStudent(id: string | null): void {
    this.selectedStudentId.set(id);
    this.expandedId.set(null);
    this.addingEntryFor.set(null);
    this.loading.set(true);
    this.loadFichas(id ?? undefined);
    this.fichaForm.studentId = id ?? '';
    this.studentCheckins.set([]);
    this.cargasOpen.set(false);
    if (id) {
      this.checkinSvc.listForStudent(id).subscribe({
        next: (list) => this.studentCheckins.set(list),
        error: () => {
          /* non-critical */
        },
      });
    }
  }

  protected studentName(id: string | null): string {
    if (!id) return '';
    const s = this.students().find((st) => st.userId === id);
    return s?.alias || s?.name || s?.email || id;
  }

  protected togglePtMode(): void {
    const next = !this.ptMode();
    this.ptMode.set(next);
    localStorage.setItem(AssessmentPage.PT_MODE_KEY, String(next));
    if (next) {
      this.fichas.set([]);
      this.selectedStudentId.set(null);
      this.loading.set(false);
    } else {
      this.selectedStudentId.set(null);
      this.fichaForm.studentId = '';
      this.loading.set(true);
      this.loadFichas();
    }
  }

  protected toggle(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
    if (this.addingEntryFor() === id) this.addingEntryFor.set(null);
  }

  protected latestEntry(f: FichaAvaliacao): EntradaAvaliacao | null {
    return f.avaliacoes.length > 0 ? f.avaliacoes[f.avaliacoes.length - 1] : null;
  }

  protected isSharedView(f: FichaAvaliacao): boolean {
    return f.studentId !== this.auth.userId();
  }

  // ── Ficha CRUD ────────────────────────────────────────────────────────────

  protected startCreateFicha(): void {
    this.fichaForm = this.emptyFichaForm();
    this.metasOpen.set(false);
    this.creatingFicha.set(true);
  }

  protected cancelCreateFicha(): void {
    this.creatingFicha.set(false);
    this.editingFicha.set(null);
    this.metasOpen.set(false);
  }

  protected startEditFicha(f: FichaAvaliacao): void {
    const m = f.metas;
    this.fichaForm = {
      objetivo: f.objetivo ?? '',
      studentId: f.studentId,
      metas: {
        peso: m?.peso?.toString() ?? '',
        imc: m?.imc?.toString() ?? '',
        percentualMassaGorda: m?.percentualMassaGorda?.toString() ?? '',
        percentualMassaMagra: m?.percentualMassaMagra?.toString() ?? '',
        kcal: m?.kcal?.toString() ?? '',
        glicemiaVejuno: m?.glicemiaVejuno?.toString() ?? '',
        paSistolica: m?.paSistolica?.toString() ?? '',
        paDiastolica: m?.paDiastolica?.toString() ?? '',
        fcRepouso: m?.fcRepouso?.toString() ?? '',
        perimetroAbdominal: m?.perimetroAbdominal?.toString() ?? '',
        perimetroCintura: m?.perimetroCintura?.toString() ?? '',
      },
    };
    this.metasOpen.set(!!m && Object.values(m).some((v) => v !== undefined));
    this.editingFicha.set(f);
  }

  protected saveFicha(): void {
    if (this.saving()) return;
    const userId = this.auth.userId();
    if (!userId) return;
    this.saving.set(true);
    const existing = this.editingFicha();
    const obj = this.fichaForm.objetivo.trim() || undefined;
    const metas = this.buildMetas();

    const targetStudentId =
      this.ptMode() && this.fichaForm.studentId.trim()
        ? this.fichaForm.studentId.trim()
        : this.ptMode() && this.selectedStudentId()
          ? this.selectedStudentId()!
          : userId;

    const req = existing
      ? (this.svc.update(existing._id!, {
          objetivo: obj,
          metas,
        }) as import('rxjs').Observable<unknown>)
      : (this.svc.create({
          studentId: targetStudentId,
          objetivo: obj,
          metas,
          avaliacoes: [],
        }) as import('rxjs').Observable<unknown>);

    req.subscribe({
      next: () => {
        this.creatingFicha.set(false);
        this.editingFicha.set(null);
        this.metasOpen.set(false);
        this.saving.set(false);
        this.loading.set(true);
        this.loadFichas(this.selectedStudentId() ?? undefined);
      },
      error: () => this.saving.set(false),
    });
  }

  private buildMetas(): MetasAvaliacao | undefined {
    const f = this.fichaForm.metas;
    const m: MetasAvaliacao = {};
    if (n(f.peso) !== undefined) m.peso = n(f.peso);
    if (n(f.imc) !== undefined) m.imc = n(f.imc);
    if (n(f.percentualMassaGorda) !== undefined) m.percentualMassaGorda = n(f.percentualMassaGorda);
    if (n(f.percentualMassaMagra) !== undefined) m.percentualMassaMagra = n(f.percentualMassaMagra);
    if (n(f.kcal) !== undefined) m.kcal = n(f.kcal);
    if (n(f.glicemiaVejuno) !== undefined) m.glicemiaVejuno = n(f.glicemiaVejuno);
    if (n(f.paSistolica) !== undefined) m.paSistolica = Math.round(n(f.paSistolica)!);
    if (n(f.paDiastolica) !== undefined) m.paDiastolica = Math.round(n(f.paDiastolica)!);
    if (n(f.fcRepouso) !== undefined) m.fcRepouso = Math.round(n(f.fcRepouso)!);
    if (n(f.perimetroAbdominal) !== undefined) m.perimetroAbdominal = n(f.perimetroAbdominal);
    if (n(f.perimetroCintura) !== undefined) m.perimetroCintura = n(f.perimetroCintura);
    return Object.keys(m).length > 0 ? m : undefined;
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
        this.fichas.update((list) =>
          list.map((item) => (item._id === f._id ? { ...item, sharedWithTeacherIds: next } : item)),
        );
        this.sharingSaving.set(null);
      },
      error: () => this.sharingSaving.set(null),
    });
  }

  // ── Entry CRUD ────────────────────────────────────────────────────────────

  protected editingEntryIndex = signal<number | null>(null);

  protected startAddEntry(fichaId: string): void {
    this.entryForm = this.emptyEntryForm();
    this.editingEntryIndex.set(null);
    this.addingEntryFor.set(fichaId);
  }

  protected startEditEntry(
    fichaId: string,
    reversedIndex: number,
    entry: EntradaAvaliacao,
    totalEntries: number,
  ): void {
    const originalIndex = totalEntries - 1 - reversedIndex;
    this.editingEntryIndex.set(originalIndex);
    this.entryForm = this.entryToForm(entry);
    this.addingEntryFor.set(fichaId);
  }

  protected cancelAddEntry(): void {
    this.addingEntryFor.set(null);
    this.editingEntryIndex.set(null);
  }

  protected saveEntry(fichaId: string): void {
    if (this.saving()) return;
    this.saving.set(true);

    const entry = this.buildEntryFromForm();
    const editIndex = this.editingEntryIndex();

    if (editIndex !== null) {
      const ficha = this.fichas().find((f) => f._id === fichaId);
      if (!ficha) {
        this.saving.set(false);
        return;
      }
      const updated = ficha.avaliacoes.map((e, i) => (i === editIndex ? entry : e));
      this.svc.update(fichaId, { avaliacoes: updated }).subscribe({
        next: () => {
          this.addingEntryFor.set(null);
          this.editingEntryIndex.set(null);
          this.saving.set(false);
          this.savedId.set(fichaId);
          setTimeout(() => this.savedId.set(null), 2500);
          this.loadFichas(this.selectedStudentId() ?? undefined);
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.svc.addEntrada(fichaId, entry).subscribe({
        next: () => {
          this.addingEntryFor.set(null);
          this.saving.set(false);
          this.savedId.set(fichaId);
          setTimeout(() => this.savedId.set(null), 2500);
          this.loadFichas(this.selectedStudentId() ?? undefined);
        },
        error: () => this.saving.set(false),
      });
    }
  }

  // \u2500\u2500 Chart / metrics \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  protected metricValue(e: EntradaAvaliacao, metric: ChartMetric): number | null {
    switch (metric) {
      case 'peso':
        return e.peso ?? null;
      case 'imc':
        return e.imc ?? null;
      case 'percentualMassaGorda':
        return e.percentualMassaGorda ?? null;
      case 'percentualMassaMagra':
        return e.percentualMassaMagra ?? null;
      case 'kcal':
        return e.kcal ?? null;
      case 'glicemiaVejuno':
        return e.glicemiaVejuno ?? null;
      case 'paSistolica':
        return e.pressaoArterial?.sistolica ?? null;
      case 'paDiastolica':
        return e.pressaoArterial?.diastolica ?? null;
      case 'fcRepouso':
        return e.fcRepouso ?? null;
      case 'perimetroAbdominal':
        return e.perimetros?.abdominal ?? null;
      case 'perimetroCintura':
        return e.perimetros?.cintura ?? null;
    }
  }

  protected metaValue(metas: MetasAvaliacao | undefined, metric: ChartMetric): number | null {
    if (!metas) return null;
    return (metas as Record<string, number | undefined>)[metric] ?? null;
  }

  protected deltaVsPrev(f: FichaAvaliacao, metric: ChartMetric): number | null {
    if (f.avaliacoes.length < 2) return null;
    const curr = this.metricValue(f.avaliacoes[f.avaliacoes.length - 1], metric);
    const prev = this.metricValue(f.avaliacoes[f.avaliacoes.length - 2], metric);
    if (curr === null || prev === null) return null;
    return Math.round((curr - prev) * 10) / 10;
  }

  protected hasMetricData(f: FichaAvaliacao, metric: ChartMetric): boolean {
    return f.avaliacoes.some((e) => this.metricValue(e, metric) !== null);
  }

  protected buildChart(f: FichaAvaliacao): ChartResult {
    const metric = this.chartMetric();
    const entries = f.avaliacoes
      .map((e) => ({ date: new Date(e.data), value: this.metricValue(e, metric) }))
      .filter((d): d is { date: Date; value: number } => d.value !== null);

    if (entries.length === 0) {
      return {
        hasData: false,
        hasCurve: false,
        dots: [],
        path: '',
        metaPath: null,
        metaY: null,
        metaV: null,
        yMinLabel: '',
        yMaxLabel: '',
        firstLabel: '',
        lastLabel: '',
      };
    }

    const metaV = this.metaValue(f.metas, metric);
    const values = entries.map((d) => d.value);
    const allVals = metaV !== null ? [...values, metaV] : values;
    let lo = Math.min(...allVals);
    let hi = Math.max(...allVals);
    const pad = (hi - lo) * 0.12 || 2;
    lo -= pad;
    hi += pad;
    const range = hi - lo;

    const toX = (i: number) =>
      CPL +
      (entries.length > 1 ? (i / (entries.length - 1)) * (CW - CPL - CPR) : (CW - CPL - CPR) / 2);
    const toY = (v: number) => CPT + (1 - (v - lo) / range) * (CH - CPT - CPB);

    const dots: ChartDot[] = entries.map((d, i) => ({
      x: toX(i),
      y: toY(d.value),
      v: d.value,
      date: d.date,
    }));

    const hasCurve = dots.length >= 2;
    const path = hasCurve
      ? 'M' + dots.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join('L')
      : '';
    const metaY = metaV !== null ? toY(metaV) : null;
    const metaPath =
      metaY !== null
        ? 'M' + CPL + ',' + metaY.toFixed(1) + 'L' + (CW - CPR) + ',' + metaY.toFixed(1)
        : null;

    return {
      hasData: true,
      hasCurve,
      dots,
      path,
      metaPath,
      metaY,
      metaV,
      yMinLabel: Math.min(...values).toString(),
      yMaxLabel: Math.max(...values).toString(),
      firstLabel: fmtDate(entries[0].date),
      lastLabel: entries.length > 1 ? fmtDate(entries[entries.length - 1].date) : '',
    };
  }

  protected selectChartMetric(m: ChartMetric): void {
    this.chartMetric.set(m);
  }

  // ── Cargas (PT mode) ──────────────────────────────────────────────────────

  /** Groups check-ins by programaTreinoId+grupoLetra, returns latest carga per exercise */
  protected readonly cargasSummary = computed(() => {
    const checkins = this.studentCheckins().filter((c) => c.cargas?.length);
    if (!checkins.length) return [];

    // Group: programaTreinoId|grupoLetra → { exercicio → [{data, carga}] }
    const groups = new Map<
      string,
      { programaId: string; grupo: string; exercises: Map<string, { data: Date; carga: number }[]> }
    >();

    for (const c of checkins) {
      if (!c.cargas?.length) continue;
      const key = `${c.programaTreinoId ?? '?'}|${c.grupoLetra ?? '?'}`;
      if (!groups.has(key)) {
        groups.set(key, {
          programaId: c.programaTreinoId ?? '?',
          grupo: c.grupoLetra ?? '?',
          exercises: new Map(),
        });
      }
      const g = groups.get(key)!;
      for (const carga of c.cargas) {
        if (!g.exercises.has(carga.nome)) g.exercises.set(carga.nome, []);
        g.exercises.get(carga.nome)!.push({ data: new Date(c.data), carga: carga.carga });
      }
    }

    return Array.from(groups.values()).map((g) => ({
      programaId: g.programaId,
      grupo: g.grupo,
      exercises: Array.from(g.exercises.entries()).map(([nome, entries]) => {
        const sorted = entries.sort((a, b) => b.data.getTime() - a.data.getTime());
        const latest = sorted[0];
        const first = sorted[sorted.length - 1];
        // % increase from first session (0 = no change, 1 = doubled)
        const rawPct = first.carga > 0 ? (latest.carga - first.carga) / first.carga : 0;
        const clamped = Math.max(0, Math.min(1, rawPct));
        const pct = Math.round(rawPct * 100); // can exceed 100 for display
        const dashOffset = RING_CIRC * (1 - clamped);
        let color: string;
        if (rawPct >= 0.75) color = 'var(--c-success)';
        else if (rawPct >= 0.25) color = 'var(--c-accent)';
        else color = 'var(--c-warn)';
        return { nome, entries: sorted, latest, first, pct, dashOffset, color };
      }),
    }));
  });

  protected hasActiveMetas(f: FichaAvaliacao): boolean {
    if (!f.metas || f.avaliacoes.length === 0) return false;
    return CHART_METRICS.some((def) => {
      const meta = this.metaValue(f.metas, def.key);
      const curr = this.metricValue(f.avaliacoes[f.avaliacoes.length - 1], def.key);
      return meta !== null && curr !== null;
    });
  }

  protected buildRings(f: FichaAvaliacao): RingResult[] {
    if (!f.metas || f.avaliacoes.length === 0) return [];

    const latest = f.avaliacoes[f.avaliacoes.length - 1];
    const rings: RingResult[] = [];

    for (const def of CHART_METRICS) {
      const meta = this.metaValue(f.metas, def.key);
      const curr = this.metricValue(latest, def.key);
      if (meta === null || curr === null) continue;

      // First entry with data = starting point
      let start: number | null = null;
      for (const e of f.avaliacoes) {
        const v = this.metricValue(e, def.key);
        if (v !== null) {
          start = v;
          break;
        }
      }
      if (start === null) continue;

      // progress: 0 = at start, 1 = goal reached
      const rawProgress = start === meta ? 1 : (curr - start) / (meta - start);
      const clamped = Math.max(0, Math.min(1, rawProgress));
      const dashOffset = RING_CIRC * (1 - clamped);

      let color: string;
      if (rawProgress >= 1) color = 'var(--c-success)';
      else if (rawProgress < 0) color = 'var(--c-danger)';
      else if (rawProgress >= 0.5) color = 'var(--c-accent)';
      else color = 'var(--c-warn)';

      rings.push({
        key: def.key,
        i18nKey: def.i18nKey,
        unit: def.unit,
        current: curr,
        meta,
        pct: Math.round(clamped * 100),
        rawProgress,
        dashOffset,
        color,
        achieved: rawProgress >= 1,
      });
    }
    return rings;
  }

  // \u2500\u2500 Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  private buildEntryFromForm(): EntradaAvaliacao {
    const f = this.entryForm;
    const pa =
      n(f.paSistolica) !== undefined && n(f.paDiastolica) !== undefined
        ? { sistolica: n(f.paSistolica)!, diastolica: n(f.paDiastolica)! }
        : undefined;
    const per =
      n(f.perimetroAbdominal) !== undefined || n(f.perimetroCintura) !== undefined
        ? { abdominal: n(f.perimetroAbdominal), cintura: n(f.perimetroCintura) }
        : undefined;
    return {
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
  }

  private entryToForm(e: EntradaAvaliacao): EntryForm {
    const d = e.data instanceof Date ? e.data : new Date(e.data);
    return {
      data:
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0'),
      peso: e.peso?.toString() ?? '',
      imc: e.imc?.toString() ?? '',
      percentualMassaGorda: e.percentualMassaGorda?.toString() ?? '',
      percentualMassaMagra: e.percentualMassaMagra?.toString() ?? '',
      kcal: e.kcal?.toString() ?? '',
      glicemiaVejuno: e.glicemiaVejuno?.toString() ?? '',
      paSistolica: e.pressaoArterial?.sistolica?.toString() ?? '',
      paDiastolica: e.pressaoArterial?.diastolica?.toString() ?? '',
      fcRepouso: e.fcRepouso?.toString() ?? '',
      perimetroAbdominal: e.perimetros?.abdominal?.toString() ?? '',
      perimetroCintura: e.perimetros?.cintura?.toString() ?? '',
    };
  }

  private emptyEntryForm(): EntryForm {
    const nd = new Date();
    return {
      data:
        nd.getFullYear() +
        '-' +
        String(nd.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(nd.getDate()).padStart(2, '0'),
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

  private emptyMetasForm(): MetasForm {
    return {
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
    return { objetivo: '', studentId: '', metas: this.emptyMetasForm() };
  }
}
