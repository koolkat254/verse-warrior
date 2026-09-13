import { describe, expect, it } from 'vitest';
import { ProgressStore, STORAGE_KEY } from '../src/state/storage';
import type { StoragePort } from '../src/state/storage';
import { reviewSignature } from '../src/domain/state';
class MemoryStorage implements StoragePort {
  items = new Map<string, string>();
  failRead = false;
  failWrite = false;
  getItem(key: string) {
    if (this.failRead) throw new Error('Blocked');
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('Quota');
    this.items.set(key, value);
  }
  removeItem(key: string) {
    if (this.failWrite) throw new Error('Blocked');
    this.items.delete(key);
  }
}
const now = new Date('2026-01-01T12:00:00');
describe('browser persistence', () => {
  it('persists practice and can export/restore without Scripture', () => {
    const storage = new MemoryStorage(),
      store = new ProgressStore(storage);
    store.dispatch({ type: 'practice', id: 'one', now });
    expect(new ProgressStore(storage).snapshot.state).toEqual(store.snapshot.state);
    const backup = store.backup('one');
    expect(JSON.stringify(backup)).not.toContain('translation');
    store.reset();
    store.restore(backup);
    expect(store.snapshot.state).toEqual(backup.state);
  });
  it.each(['{broken', JSON.stringify({ schemaVersion: 50 })])(
    'protects unreadable stored data: %s',
    (raw) => {
      const storage = new MemoryStorage();
      storage.setItem(STORAGE_KEY, raw);
      const store = new ProgressStore(storage);
      store.dispatch({ type: 'practice', id: 'one', now });
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
      expect(store.snapshot.raw).toBe(raw);
      expect(store.snapshot.protected).toBe(true);
      expect(store.backup('1').state.passageProgress.one).toBeDefined();
    },
  );
  it('keeps an unsaved session usable when writes fail', () => {
    const storage = new MemoryStorage();
    storage.failWrite = true;
    const store = new ProgressStore(storage);
    store.dispatch({ type: 'practice', id: 'one', now });
    store.dispatch({ type: 'practice', id: 'two', now });
    expect(Object.keys(store.snapshot.state.passageProgress)).toEqual(['one', 'two']);
    expect(store.snapshot.warning).toContain('could not be saved');
    storage.failWrite = false;
    store.dispatch({ type: 'practice', id: 'three', now });
    expect(new ProgressStore(storage).snapshot.state.passageProgress.one).toBeDefined();
  });
  it('reports blocked reads and does not delete other application data', () => {
    const storage = new MemoryStorage();
    storage.failRead = true;
    expect(new ProgressStore(storage).snapshot.warning).toContain('unavailable');
    storage.failRead = false;
    storage.setItem('other-app', 'keep');
    const store = new ProgressStore(storage);
    store.reset();
    expect(storage.getItem('other-app')).toBe('keep');
  });
  it('never overwrites unreadable storage even if writes are available', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, 'unreadable original');
    storage.failRead = true;
    const store = new ProgressStore(storage);
    store.dispatch({ type: 'practice', id: 'unsaved', now });
    expect(storage.items.get(STORAGE_KEY)).toBe('unreadable original');
    expect(store.snapshot.state.passageProgress.unsaved).toBeDefined();
  });
  it('does not discard unsaved practice when blocked empty storage becomes readable', () => {
    const storage = new MemoryStorage();
    storage.failRead = true;
    const store = new ProgressStore(storage);
    store.dispatch({ type: 'practice', id: 'unsaved', now });
    storage.failRead = false;
    store.refresh();
    expect(store.snapshot.state.passageProgress.unsaved).toBeDefined();
    expect(store.snapshot.warning).not.toBe('');
  });
  it('rejects invalid restore without mutating current state or disk', () => {
    const storage = new MemoryStorage(),
      store = new ProgressStore(storage);
    store.dispatch({ type: 'practice', id: 'one', now });
    const saved = storage.getItem(STORAGE_KEY);
    expect(() => store.restore({ app: 'other' })).toThrow();
    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
  });
  it('reads new tab changes before writing and rejects stale duplicate ratings', () => {
    const storage = new MemoryStorage(),
      one = new ProgressStore(storage),
      two = new ProgressStore(storage);
    one.dispatch({ type: 'rate', id: 'one', expected: 'null', rating: 'remembered', now });
    two.refresh();
    const expected = reviewSignature(two.snapshot.state.passageProgress.one.review);
    one.dispatch({
      type: 'rate',
      id: 'one',
      expected,
      rating: 'remembered',
      now: new Date('2026-01-02T12:00:00'),
    });
    expect(() =>
      two.dispatch({
        type: 'rate',
        id: 'one',
        expected,
        rating: 'remembered',
        now: new Date('2026-01-02T12:00:00'),
      }),
    ).toThrow('another tab');
    expect(new ProgressStore(storage).snapshot.state.passageProgress.one.review?.intervalStep).toBe(
      1,
    );
  });
  it('retains unsaved work if another tab changes stored progress', () => {
    const storage = new MemoryStorage(),
      one = new ProgressStore(storage),
      two = new ProgressStore(storage);
    storage.failWrite = true;
    one.dispatch({ type: 'practice', id: 'unsaved', now });
    storage.failWrite = false;
    two.dispatch({ type: 'practice', id: 'elsewhere', now });
    one.refresh();
    expect(one.snapshot.protected).toBe(true);
    expect(one.snapshot.state.passageProgress.unsaved).toBeDefined();
    expect(one.snapshot.warning).toContain('Another tab');
  });
});
