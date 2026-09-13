import { emptyState, parseBackup, parseState, progressReducer } from '../domain/state';
import type { Action } from '../domain/state';
import type { Backup, ProgressState } from '../domain/types';

export const STORAGE_KEY = 'verse-warrior:state';
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface Snapshot {
  state: ProgressState;
  warning: string;
  raw: string | null;
  protected: boolean;
}
export class ProgressStore {
  snapshot: Snapshot;
  private baseline: string | null = null;
  private dirty = false;
  constructor(
    private storage: StoragePort,
    now = new Date(),
  ) {
    this.snapshot = { state: emptyState(now), warning: '', raw: null, protected: false };
    this.refresh();
  }
  refresh() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw === this.baseline && (!this.snapshot.protected || this.dirty)) return;
      if (this.dirty && raw !== this.baseline) {
        this.snapshot = {
          ...this.snapshot,
          warning:
            'Another tab changed saved progress while this session has unsaved changes. Export this session before reloading.',
          protected: true,
          raw,
        };
        return;
      }
      const state = raw === null ? emptyState() : parseState(JSON.parse(raw));
      this.baseline = raw;
      this.snapshot = { state, warning: '', protected: false, raw: null };
    } catch {
      let raw: string | null = null;
      try {
        raw = this.storage.getItem(STORAGE_KEY);
      } catch {
        /* Storage itself may be blocked. */
      }
      if (raw !== null && !this.dirty) this.baseline = raw;
      this.snapshot = {
        ...this.snapshot,
        raw,
        // Never write blindly after a failed read, even if writes happen to be permitted.
        protected: true,
        warning:
          raw !== null
            ? 'Saved data could not be read safely. It has not been overwritten; new practice is unsaved. Download the original in Settings, then restore a supported backup or reset.'
            : 'Browser storage is unavailable. Progress in this session is unsaved. Export a backup before leaving.',
      };
    }
  }
  dispatch(action: Action) {
    this.refresh();
    const state = progressReducer(this.snapshot.state, action);
    this.write(state);
  }
  private write(state: ProgressState, replace = false) {
    this.snapshot = { ...this.snapshot, state };
    this.dirty = true;
    if (this.snapshot.protected && !replace) return;
    try {
      const raw = JSON.stringify(state);
      this.storage.setItem(STORAGE_KEY, raw);
      this.baseline = raw;
      this.dirty = false;
      this.snapshot = { state, warning: '', raw: null, protected: false };
    } catch {
      this.snapshot = {
        ...this.snapshot,
        warning:
          'Progress could not be saved in this browser. Keep this tab open and export a backup before leaving.',
      };
    }
  }
  restore(input: unknown) {
    const backup = parseBackup(input);
    this.write(backup.state, true);
  }
  reset() {
    this.storage.removeItem(STORAGE_KEY);
    this.baseline = null;
    this.dirty = false;
    this.snapshot = { state: emptyState(), warning: '', raw: null, protected: false };
  }
  backup(catalogVersion: string, now = new Date()): Backup {
    return {
      app: 'verse-warrior',
      exportedAt: now.toISOString(),
      catalogVersion,
      state: this.snapshot.state,
    };
  }
}
export function downloadJson(value: unknown, filename: string, raw = false) {
  const blob = new Blob([raw ? String(value) : JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
