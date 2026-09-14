import { flatten } from './catalog';
import type {
  Catalog,
  PassageProgress,
  ProgressState,
  Rating,
  ReferenceRating,
  ReferenceRecall,
  Review,
} from './types';

export const INTERVALS = [1, 3, 7, 14, 30, 60] as const;
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + days);
  return localDay(date);
}
export function rateReview(previous: Review | null, rating: Rating, now: Date): Review {
  const today = localDay(now),
    timestamp = now.toISOString();
  if (!previous)
    return {
      intervalStep: 0,
      dueDate: addDays(today, 1),
      lastReviewedAt: timestamp,
      lastRating: rating,
      successfulReviewStreak: 0,
      masteredAt: null,
    };
  if (previous.dueDate > today || localDay(new Date(previous.lastReviewedAt)) === today)
    throw new Error('This passage is not due. Early practice does not change its schedule.');
  const remembered = rating === 'remembered';
  const intervalStep = remembered
    ? Math.min(previous.intervalStep + 1, INTERVALS.length - 1)
    : rating === 'help'
      ? Math.max(0, previous.intervalStep - 1)
      : 0;
  const streak = remembered ? previous.successfulReviewStreak + 1 : 0;
  const qualifies =
    streak >= 3 &&
    INTERVALS[previous.intervalStep] >= 7 &&
    addDays(localDay(new Date(previous.lastReviewedAt)), 7) <= today;
  return {
    intervalStep,
    dueDate: addDays(today, INTERVALS[intervalStep]),
    lastReviewedAt: timestamp,
    lastRating: rating,
    successfulReviewStreak: streak,
    masteredAt: remembered ? (previous.masteredAt ?? (qualifies ? timestamp : null)) : null,
  };
}
export function rateReference(
  previous: ReferenceRecall | null,
  rating: ReferenceRating,
  now: Date,
): ReferenceRecall {
  const timestamp = now.toISOString();
  const streak = rating === 'remembered' ? (previous?.successfulRecallStreak ?? 0) + 1 : 0;
  return {
    lastReviewedAt: timestamp,
    lastRating: rating,
    successfulRecallStreak: streak,
    solidAt:
      rating === 'remembered' ? (previous?.solidAt ?? (streak >= 3 ? timestamp : null)) : null,
  };
}
export function activePassageIds(catalog: Catalog, state: ProgressState): string[] {
  return [
    ...new Set(
      catalog.collections.filter((c) => state.activeCollectionIds.includes(c.id)).flatMap(flatten),
    ),
  ];
}
export function duePassageIds(catalog: Catalog, state: ProgressState, now: Date): string[] {
  const today = localDay(now);
  return activePassageIds(catalog, state)
    .filter((id) => {
      const review = state.passageProgress[id]?.review;
      return (
        review && review.dueDate <= today && localDay(new Date(review.lastReviewedAt)) !== today
      );
    })
    .sort(
      (a, b) =>
        state.passageProgress[a].review!.dueDate.localeCompare(
          state.passageProgress[b].review!.dueDate,
        ) || a.localeCompare(b),
    );
}
export function referencePassageIds(
  catalog: Catalog,
  state: ProgressState,
  excludedIds: readonly string[] = [],
): string[] {
  const excluded = new Set(excludedIds);
  return activePassageIds(catalog, state)
    .filter((id) => state.passageProgress[id]?.review && !excluded.has(id))
    .sort((a, b) => {
      const first = state.passageProgress[a].reference;
      const second = state.passageProgress[b].reference;
      return (
        Number(Boolean(first?.solidAt)) - Number(Boolean(second?.solidAt)) ||
        (first?.lastReviewedAt ?? '').localeCompare(second?.lastReviewedAt ?? '') ||
        a.localeCompare(b)
      );
    });
}
export const STATUS_LABELS = {
  new: 'Not started',
  learning: 'Learning',
  reviewing: 'Reviewing',
  mastered: 'Mastered',
} as const;
export function status(progress?: PassageProgress): keyof typeof STATUS_LABELS {
  return !progress
    ? 'new'
    : !progress.review
      ? 'learning'
      : progress.review.masteredAt
        ? 'mastered'
        : 'reviewing';
}
export function counts(ids: string[], state: ProgressState) {
  const result = { new: 0, learning: 0, reviewing: 0, mastered: 0 };
  for (const id of new Set(ids)) result[status(state.passageProgress[id])]++;
  return result;
}
