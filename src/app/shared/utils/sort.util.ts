/**
 * Generic sort utility — signal-based field/dir state with optional
 * localStorage persistence.
 *
 * Usage:
 *   const sort = createSort<MyItem, 'name' | 'date'>('date', 'desc', {
 *     date: (a, b) => Date.parse(a.time) - Date.parse(b.time),
 *     name: (a, b) => a.name.localeCompare(b.name),
 *   });
 *
 *   sort.field()        // signal<'name' | 'date'>
 *   sort.dir()          // signal<'asc' | 'desc'>
 *   sort.set('name')    // toggle dir if same field, else switch
 *   sort.apply(items)   // returns sorted COPY (non-mutating)
 *   sort.save('myKey')  // persist current state
 *   sort.load('myKey')  // restore previous state
 */
import { type Signal, signal } from '@angular/core';

export type SortDir = 'asc' | 'desc';

export type Comparator<T> = (a: T, b: T) => number;

export interface SortConfig<T, F extends string> {
  field: Signal<F>;
  dir: Signal<SortDir>;
  /**
   * Activate `nextField`. If it's already the active field, flip direction.
   * Otherwise switch to `nextField` with `defaultDir` (defaults to 'asc').
   */
  set(nextField: F, defaultDir?: SortDir): void;
  /** Returns a sorted copy of `items`. Original array is untouched. */
  apply(items: T[]): T[];
  /** Persist `{ field, dir }` JSON to localStorage under `storageKey`. */
  save(storageKey: string): void;
  /** Restore `{ field, dir }` from localStorage if present and valid. */
  load(storageKey: string): void;
}

export function createSort<T, F extends string>(
  initialField: F,
  initialDir: SortDir,
  comparators: Record<F, Comparator<T>>,
  /** Tiebreaker applied when the primary comparator returns 0. */
  tiebreaker?: Comparator<T>,
): SortConfig<T, F> {
  const field = signal<F>(initialField);
  const dir = signal<SortDir>(initialDir);

  function set(nextField: F, defaultDir: SortDir = 'asc'): void {
    if (field() === nextField) {
      dir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      field.set(nextField);
      dir.set(defaultDir);
    }
  }

  function apply(items: T[]): T[] {
    const cmp = comparators[field()];
    const multiplier = dir() === 'asc' ? 1 : -1;

    return [...items].sort((a, b) => {
      const primary = cmp(a, b);
      if (primary !== 0) return primary * multiplier;
      return tiebreaker ? tiebreaker(a, b) * multiplier : 0;
    });
  }

  function save(storageKey: string): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ field: field(), dir: dir() }));
    } catch {
      // localStorage might be unavailable (SSR, private mode); silent no-op.
    }
  }

  function load(storageKey: string): void {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const { field: f, dir: d } = JSON.parse(raw) as { field: F; dir: SortDir };
      if (f && f in comparators) field.set(f);
      if (d === 'asc' || d === 'desc') dir.set(d);
    } catch {
      // Bad JSON, missing storage, etc — silent fallback.
    }
  }

  return { field, dir, set, apply, save, load };
}
