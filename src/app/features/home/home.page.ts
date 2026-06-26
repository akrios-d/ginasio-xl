import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { CheckinService } from '../../core/services/checkin.service';
import { ProgramaTreinoService } from '../../core/services/programa-treino.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import type { Checkin } from '../../core/models/checkin.model';
import type { ProgramaTreino } from '../../core/models';

interface CalendarDay {
  day: number; // 1-31, or 0 for padding cells
  date: Date | null;
  isToday: boolean;
  isSelected: boolean;
  checkins: Checkin[];
}

interface CheckinForm {
  programaTreinoId: string;
  grupoLetra: string;
  notas: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, ConfirmDialog],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly checkinSvc = inject(CheckinService);
  private readonly treinoSvc = inject(ProgramaTreinoService);
  private readonly elRef = inject(ElementRef);

  // ── Greeting ──────────────────────────────────────────────────────────────
  protected readonly greeting = computed(() => {
    const firstName = this.auth.user()?.name?.split(' ')[0];
    return firstName
      ? this.i18n.t('home.greetingName').replace('{name}', firstName)
      : this.i18n.t('home.greeting');
  });

  protected readonly sections = [
    { key: 'treino', route: '/training', icon: 'dumbbell' },
    { key: 'avaliacao', route: '/assessment', icon: 'chart' },
    { key: 'perfil', route: '/profile', icon: 'person' },
  ] as const;

  // ── Calendar state ────────────────────────────────────────────────────────
  private readonly today = new Date();
  protected readonly viewYear = signal(this.today.getFullYear());
  protected readonly viewMonth = signal(this.today.getMonth()); // 0-based
  protected readonly selectedDate = signal<Date | null>(null);

  protected readonly checkins = signal<Checkin[]>([]);
  protected readonly programs = signal<ProgramaTreino[]>([]);
  protected readonly calLoading = signal(true);

  // Add-checkin form
  protected readonly addingCheckin = signal(false);
  protected readonly savingCheckin = signal(false);
  protected readonly pendingDeleteId = signal<string | null>(null);
  protected form: CheckinForm = this.emptyForm();

  // ── Calendar computed ─────────────────────────────────────────────────────
  protected readonly monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth(), 1);
    return d.toLocaleDateString(this.i18n.language() === 'zh' ? 'zh-CN' : this.i18n.language(), {
      month: 'long',
      year: 'numeric',
    });
  });

  protected readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const todayStr = this.today.toDateString();
    const selectedStr = this.selectedDate()?.toDateString() ?? '';
    const checkinMap = this.buildCheckinMap(this.checkins(), year, month);

    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Shift so week starts on Monday (0=Mon, 6=Sun)
    const startPad = (firstDow + 6) % 7;

    const cells: CalendarDay[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ day: 0, date: null, isToday: false, isSelected: false, checkins: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({
        day: d,
        date,
        isToday: date.toDateString() === todayStr,
        isSelected: date.toDateString() === selectedStr,
        checkins: checkinMap[d] ?? [],
      });
    }
    return cells;
  });

  protected readonly selectedDayCheckins = computed<Checkin[]>(() => {
    const sel = this.selectedDate();
    if (!sel) return [];
    return this.checkins().filter((c) => new Date(c.data).toDateString() === sel.toDateString());
  });

  protected readonly selectedProgramGroups = computed<string[]>(() => {
    const pid = this.form.programaTreinoId;
    const prog = this.programs().find((p) => p._id === pid);
    return prog?.fasePrincipal.grupos.map((g) => g.letra) ?? [];
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  constructor() {
    this.loadMonth();
    this.treinoSvc.list().subscribe({
      next: (list) => this.programs.set(list.filter((p) => p.ativo ?? true)),
      error: () => undefined,
    });
  }

  // ── Calendar navigation ───────────────────────────────────────────────────
  protected isCurrentMonth(): boolean {
    return (
      this.viewYear() === this.today.getFullYear() && this.viewMonth() === this.today.getMonth()
    );
  }

  protected goToday(): void {
    this.viewYear.set(this.today.getFullYear());
    this.viewMonth.set(this.today.getMonth());
    this.selectedDate.set(null);
    this.loadMonth();
  }

  protected prevMonth(): void {
    if (this.viewMonth() === 0) {
      this.viewYear.update((y) => y - 1);
      this.viewMonth.set(11);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
    this.selectedDate.set(null);
    this.loadMonth();
  }

  protected nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewYear.update((y) => y + 1);
      this.viewMonth.set(0);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
    this.selectedDate.set(null);
    this.loadMonth();
  }

  protected selectDay(day: CalendarDay): void {
    if (!day.date) return;
    if (this.selectedDate()?.toDateString() === day.date.toDateString()) {
      this.selectedDate.set(null);
      this.addingCheckin.set(false);
    } else {
      this.selectedDate.set(day.date);
      this.addingCheckin.set(false);
      setTimeout(() => {
        const panel = this.elRef.nativeElement.querySelector('.day-panel') as HTMLElement | null;
        panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 30);
    }
  }

  // ── Check-in CRUD ─────────────────────────────────────────────────────────
  protected startAdd(): void {
    this.form = this.emptyForm();
    this.form.programaTreinoId = this.programs()[0]?._id ?? '';
    this.form.grupoLetra = '';
    this.addingCheckin.set(true);
  }

  protected cancelAdd(): void {
    this.addingCheckin.set(false);
  }

  protected saveCheckin(): void {
    if (this.savingCheckin()) return;
    const sel = this.selectedDate() ?? new Date();
    this.savingCheckin.set(true);

    this.checkinSvc
      .create({
        data: sel,
        programaTreinoId: this.form.programaTreinoId || undefined,
        grupoLetra: this.form.grupoLetra || undefined,
        notas: this.form.notas || undefined,
      })
      .subscribe({
        next: (res) => {
          const newCheckin: Checkin = {
            _id: res.id,
            userId: this.auth.userId() ?? '',
            data: sel,
            programaTreinoId: this.form.programaTreinoId || undefined,
            grupoLetra: this.form.grupoLetra || undefined,
            notas: this.form.notas || undefined,
          };
          this.checkins.update((list) => [newCheckin, ...list]);
          this.savingCheckin.set(false);
          this.addingCheckin.set(false);
        },
        error: () => this.savingCheckin.set(false),
      });
  }

  protected confirmRemove(id: string): void {
    this.pendingDeleteId.set(id);
  }

  protected cancelRemove(): void {
    this.pendingDeleteId.set(null);
  }

  protected removeCheckin(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.pendingDeleteId.set(null);
    this.checkinSvc.delete(id).subscribe({
      next: () => this.checkins.update((list) => list.filter((c) => c._id !== id)),
      error: () => undefined,
    });
  }

  protected programName(id: string | undefined): string {
    if (!id) return '';
    return this.programs().find((p) => p._id === id)?.objetivos ?? '';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private loadMonth(): void {
    this.calLoading.set(true);
    const year = this.viewYear();
    const month = this.viewMonth();
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0);
    this.checkinSvc.list(from, to).subscribe({
      next: (list) => {
        this.checkins.set(list);
        this.calLoading.set(false);
      },
      error: () => this.calLoading.set(false),
    });
  }

  private buildCheckinMap(
    checkins: Checkin[],
    year: number,
    month: number,
  ): Record<number, Checkin[]> {
    const map: Record<number, Checkin[]> = {};
    for (const c of checkins) {
      const d = new Date(c.data);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        (map[day] ??= []).push(c);
      }
    }
    return map;
  }

  private emptyForm(): CheckinForm {
    return { programaTreinoId: '', grupoLetra: '', notas: '' };
  }
}
