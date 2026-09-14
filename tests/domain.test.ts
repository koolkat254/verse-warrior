import { describe, expect, it } from 'vitest';
import fixture from './fixtures/catalog.json';
import { findGroup, flatten, parseCatalog } from '../src/domain/catalog';
import {
  activePassageIds,
  addDays,
  counts,
  duePassageIds,
  localDay,
  rateReference,
  rateReview,
  referencePassageIds,
  status,
} from '../src/domain/scheduler';
import {
  emptyState,
  parseBackup,
  parseState,
  progressReducer,
  reviewSignature,
  referenceSignature,
} from '../src/domain/state';
import { compareWords, firstLetter, normalizeWords, wordOrder } from '../src/domain/text';
import type { Rating } from '../src/domain/types';

const at = (day: string) => new Date(`${day}T12:00:00`);
const catalog = parseCatalog(fixture);

describe('catalog', () => {
  it('supports empty production content', () =>
    expect(
      parseCatalog({ schemaVersion: 1, contentVersion: '1', passages: [], collections: [] })
        .passages,
    ).toEqual([]));
  it('preserves hierarchy, order, variants and multi-verse units', () => {
    expect(flatten(catalog.collections[0])).toEqual([
      'practice-one',
      'practice-two',
      'practice-variant',
    ]);
    expect(flatten(findGroup(catalog.collections[0], 'week-one')!)).toEqual([
      'practice-one',
      'practice-two',
    ]);
    expect(findGroup(catalog.collections[0], 'book-one')?.title).toBe('Book one');
    expect(flatten(catalog.collections[2])).toEqual(['practice-two']);
    expect(catalog.passages[1].reference).toContain('–');
    expect(catalog.passages[2].translation).not.toBe(catalog.passages[0].translation);
  });
  it.each([
    ['duplicate passages', (f: typeof fixture) => f.passages.push(f.passages[0])],
    [
      'missing reference',
      (f: typeof fixture) => {
        f.passages[0].reference = '';
      },
    ],
    [
      'unknown passage',
      (f: typeof fixture) => {
        f.collections[1].passageIds = ['missing'];
      },
    ],
    [
      'conflicting hierarchy',
      (f: typeof fixture) => {
        f.collections[0].passageIds = [];
      },
    ],
    [
      'duplicate group IDs',
      (f: typeof fixture) => {
        f.collections[0].books![0].weeks[1].id = 'week-one';
      },
    ],
  ])('rejects %s', (_name, change) => {
    const f = structuredClone(fixture);
    change(f);
    expect(() => parseCatalog(f)).toThrow();
  });
  it('supports books without weeks', () => {
    const f = {
      ...fixture,
      collections: [
        {
          id: 'direct-book',
          title: 'Book',
          books: [{ id: 'one', title: 'One', passageIds: ['practice-one'] }],
        },
      ],
    };
    expect(flatten(parseCatalog(f).collections[0])).toEqual(['practice-one']);
  });
});
describe('review scheduling', () => {
  it.each<Rating>(['remembered', 'help', 'forgot'])(
    'enrolls %s for tomorrow without mastery credit',
    (rating) => {
      expect(rateReview(null, rating, at('2026-01-01'))).toMatchObject({
        intervalStep: 0,
        dueDate: '2026-01-02',
        successfulReviewStreak: 0,
        masteredAt: null,
      });
    },
  );
  it('earns mastery after reviews on days 1, 4, and 11, then continues', () => {
    let r = rateReview(null, 'remembered', at('2026-01-01'));
    r = rateReview(r, 'remembered', at('2026-01-02'));
    expect(r.dueDate).toBe('2026-01-05');
    r = rateReview(r, 'remembered', at('2026-01-05'));
    expect(r.masteredAt).toBeNull();
    expect(r.dueDate).toBe('2026-01-12');
    r = rateReview(r, 'remembered', at('2026-01-12'));
    expect(r.masteredAt).toBe(at('2026-01-12').toISOString());
    expect(r.dueDate).toBe('2026-01-26');
    for (let i = 0; i < 6; i++) r = rateReview(r, 'remembered', at(r.dueDate));
    expect(r.intervalStep).toBe(5);
    expect(r.masteredAt).not.toBeNull();
  });
  it.each<Rating>(['help', 'forgot'])('loses mastery on %s and can regain it', (rating) => {
    let r = rateReview(null, 'remembered', at('2026-01-01'));
    for (let i = 0; i < 3; i++) r = rateReview(r, 'remembered', at(r.dueDate));
    r = rateReview(r, rating, at(r.dueDate));
    expect(r.intervalStep).toBe(rating === 'help' ? 2 : 0);
    expect(r.masteredAt).toBeNull();
    expect(r.successfulReviewStreak).toBe(0);
    for (let i = 0; i < 3; i++) r = rateReview(r, 'remembered', at(r.dueDate));
    expect(r.masteredAt).not.toBeNull();
  });
  it('does not count early or same-day recall and advances overdue reviews once', () => {
    const r = rateReview(null, 'remembered', at('2026-01-01'));
    expect(() => rateReview(r, 'remembered', at('2026-01-01'))).toThrow('not due');
    expect(rateReview(r, 'remembered', at('2026-03-01'))).toMatchObject({
      intervalStep: 1,
      dueDate: '2026-03-04',
      successfulReviewStreak: 1,
      masteredAt: null,
    });
  });
  it('handles month, year, leap day and DST calendar transitions', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(localDay(at('2026-01-01'))).toBe('2026-01-01');
  });
  it('builds and resets a separate reference recall signal', () => {
    let reference = rateReference(null, 'remembered', at('2026-01-01'));
    reference = rateReference(reference, 'remembered', at('2026-01-02'));
    expect(reference.solidAt).toBeNull();
    reference = rateReference(reference, 'remembered', at('2026-01-03'));
    expect(reference.solidAt).toBe(at('2026-01-03').toISOString());
    reference = rateReference(reference, 'help', at('2026-01-04'));
    expect(reference).toMatchObject({ successfulRecallStreak: 0, solidAt: null });
  });
});
describe('progress and queues', () => {
  it('deduplicates shared passages and retains due dates across activation', () => {
    let state = emptyState(at('2026-01-01'));
    state = { ...state, activeCollectionIds: ['foundations', 'shared'] };
    state = progressReducer(state, {
      type: 'rate',
      id: 'practice-one',
      rating: 'remembered',
      expected: 'null',
      now: at('2026-01-01'),
    });
    expect(duePassageIds(catalog, state, at('2026-01-02'))).toEqual(['practice-one']);
    const r = state.passageProgress['practice-one'].review;
    state = progressReducer(state, {
      type: 'activate',
      id: 'foundations',
      active: false,
      now: at('2026-01-02'),
    });
    expect(activePassageIds(catalog, state)).toEqual(['practice-one']);
    state = progressReducer(state, {
      type: 'activate',
      id: 'shared',
      active: false,
      now: at('2026-01-02'),
    });
    expect(duePassageIds(catalog, state, at('2026-01-05'))).toEqual([]);
    state = progressReducer(state, {
      type: 'activate',
      id: 'shared',
      active: true,
      now: at('2026-01-05'),
    });
    expect(duePassageIds(catalog, state, at('2026-01-05'))).toEqual(['practice-one']);
    expect(state.passageProgress['practice-one'].review).toEqual(r);
  });
  it('practice does not alter review and counts states uniquely', () => {
    let state = emptyState();
    expect(status()).toBe('new');
    state = progressReducer(state, { type: 'practice', id: 'practice-one', now: at('2026-01-01') });
    expect(status(state.passageProgress['practice-one'])).toBe('learning');
    state = progressReducer(state, {
      type: 'rate',
      id: 'practice-one',
      rating: 'remembered',
      expected: 'null',
      now: at('2026-01-01'),
    });
    const old = state.passageProgress['practice-one'].review;
    state = progressReducer(state, { type: 'practice', id: 'practice-one', now: at('2026-01-02') });
    expect(state.passageProgress['practice-one'].review).toEqual(old);
    expect(counts(['practice-one', 'practice-one', 'practice-two'], state)).toEqual({
      new: 1,
      learning: 0,
      reviewing: 1,
      mastered: 0,
    });
    expect(() =>
      progressReducer(state, {
        type: 'rate',
        id: 'practice-one',
        rating: 'forgot',
        expected: reviewSignature(null),
        now: at('2026-01-02'),
      }),
    ).toThrow('another tab');
  });
  it('selects reference cards that were not shown in word recall', () => {
    let state = { ...emptyState(), activeCollectionIds: ['foundations'] };
    state = progressReducer(state, {
      type: 'rate',
      id: 'practice-one',
      rating: 'remembered',
      expected: 'null',
      now: at('2026-01-01'),
    });
    state = progressReducer(state, {
      type: 'rate',
      id: 'practice-two',
      rating: 'remembered',
      expected: 'null',
      now: at('2026-01-01'),
    });
    expect(referencePassageIds(catalog, state, ['practice-one'])).toEqual(['practice-two']);
    state = progressReducer(state, {
      type: 'rate-reference',
      id: 'practice-two',
      rating: 'remembered',
      expected: referenceSignature(null),
      now: at('2026-01-02'),
    });
    expect(state.passageProgress['practice-two'].reference?.successfulRecallStreak).toBe(1);
  });
  it('validates versioned backup state and preserves dormant passage IDs', () => {
    const state = progressReducer(emptyState(), {
      type: 'practice',
      id: 'dormant',
      now: at('2026-01-01'),
    });
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(
      parseBackup({
        app: 'verse-warrior',
        exportedAt: new Date().toISOString(),
        catalogVersion: 'old',
        state,
      }).state.passageProgress.dormant,
    ).toBeDefined();
    expect(() => parseState({ ...state, schemaVersion: 2 })).toThrow('Unsupported');
    expect(() => parseBackup({ app: 'other', state })).toThrow('Verse Warrior');
    expect(() =>
      parseState({ ...state, passageProgress: { constructor: state.passageProgress.dormant } }),
    ).toThrow('safe');
  });
});
describe('text comparison and hints', () => {
  it('normalizes punctuation, Unicode apostrophes and spacing', () =>
    expect(normalizeWords('DON’T  fear—begin, again!')).toEqual([
      'dont',
      'fear',
      'begin',
      'again',
    ]));
  it('matches a missing word without cascading errors', () =>
    expect(compareWords('one two three four', 'one three four').map((d) => d.kind)).toEqual([
      'correct',
      'missing',
      'correct',
      'correct',
    ]));
  it('aligns repetitions and replacements', () => {
    expect(
      compareWords('the word the word', 'the word word').filter((d) => d.kind === 'missing'),
    ).toHaveLength(1);
    expect(compareWords('one two three', 'one too three')[1]).toEqual({
      kind: 'incorrect',
      expected: 'two',
      actual: 'too',
    });
    expect(compareWords('one two', 'one extra two')[1].kind).toBe('extra');
    expect(compareWords('one', '').map((d) => d.kind)).toEqual(['missing']);
  });
  it('makes stable progressive subsets and keeps first-letter punctuation', () => {
    const order = wordOrder(8, () => 0.4);
    expect(new Set(order).size).toBe(8);
    expect(order.slice(0, 4)).toEqual(expect.arrayContaining(order.slice(0, 2)));
    expect(firstLetter('“Memory,”')).toBe('“M,”');
  });
});
