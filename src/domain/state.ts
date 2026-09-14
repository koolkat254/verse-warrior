import { array, identifier, record, text, unique } from './catalog';
import { rateReference, rateReview } from './scheduler';
import type {
  Backup,
  LearningFocus,
  PassageProgress,
  ProgressState,
  Rating,
  ReferenceRating,
  ReferenceRecall,
  Review,
} from './types';

export function emptyState(now = new Date()): ProgressState {
  return {
    schemaVersion: 1,
    updatedAt: now.toISOString(),
    activeCollectionIds: [],
    learningFocus: null,
    passageProgress: {},
  };
}
function timestamp(value: unknown, label: string): string {
  const result = text(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 19) !== result.slice(0, 19)
  )
    throw new Error(`${label} must be a UTC timestamp.`);
  return result;
}
function day(value: unknown): string {
  const result = text(value, 'Due date');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  )
    throw new Error('Invalid due date.');
  return result;
}
function integer(value: unknown, label: string, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max)
    throw new Error(`Invalid ${label}.`);
  return value;
}
export function parseState(input: unknown): ProgressState {
  const root = record(input, 'Progress');
  if (root.schemaVersion !== 1)
    throw new Error('Unsupported progress schema version. This app cannot safely read this file.');
  const activeCollectionIds = array(root.activeCollectionIds, 'Active collections').map((v) =>
    identifier(v, 'Collection ID'),
  );
  unique(activeCollectionIds, 'Active collections');
  let learningFocus: LearningFocus | null = null;
  if (root.learningFocus !== null) {
    const f = record(root.learningFocus, 'Learning focus');
    learningFocus = {
      collectionId: identifier(f.collectionId, 'Collection ID'),
      ...(f.groupId === undefined ? {} : { groupId: identifier(f.groupId, 'Group ID') }),
    };
  }
  const progress = record(root.passageProgress, 'Passage progress');
  const passageProgress: Record<string, PassageProgress> = {};
  for (const [id, value] of Object.entries(progress)) {
    identifier(id, 'Passage ID');
    const p = record(value, `Progress for ${id}`);
    let review: Review | null = null;
    if (p.review !== null) {
      const r = record(p.review, 'Review');
      if (!['remembered', 'help', 'forgot'].includes(String(r.lastRating)))
        throw new Error('Invalid review rating.');
      review = {
        intervalStep: integer(r.intervalStep, 'interval step', 5),
        dueDate: day(r.dueDate),
        lastReviewedAt: timestamp(r.lastReviewedAt, 'Last reviewed'),
        lastRating: r.lastRating as Rating,
        successfulReviewStreak: integer(r.successfulReviewStreak, 'success streak'),
        masteredAt: r.masteredAt === null ? null : timestamp(r.masteredAt, 'Mastered date'),
      };
      if (
        review.masteredAt &&
        (review.successfulReviewStreak < 3 ||
          review.intervalStep < 3 ||
          review.lastRating !== 'remembered')
      )
        throw new Error('Mastery evidence is inconsistent.');
      if (review.lastRating !== 'remembered' && review.successfulReviewStreak !== 0)
        throw new Error('Unsuccessful reviews must reset the success streak.');
    }
    let reference: ReferenceRecall | null = null;
    if (p.reference !== undefined && p.reference !== null) {
      const r = record(p.reference, 'Reference recall');
      if (!['remembered', 'help'].includes(String(r.lastRating)))
        throw new Error('Invalid reference rating.');
      reference = {
        lastReviewedAt: timestamp(r.lastReviewedAt, 'Last reference recall'),
        lastRating: r.lastRating as ReferenceRating,
        successfulRecallStreak: integer(r.successfulRecallStreak, 'reference success streak'),
        solidAt: r.solidAt === null ? null : timestamp(r.solidAt, 'Reference solid date'),
      };
      if (
        reference.solidAt &&
        (reference.successfulRecallStreak < 3 || reference.lastRating !== 'remembered')
      )
        throw new Error('Reference recall evidence is inconsistent.');
      if (reference.lastRating !== 'remembered' && reference.successfulRecallStreak !== 0)
        throw new Error('Unsuccessful reference recalls must reset the success streak.');
    }
    passageProgress[id] = {
      startedAt: timestamp(p.startedAt, 'Started date'),
      lastPracticedAt: timestamp(p.lastPracticedAt, 'Last practiced'),
      review,
      reference,
    };
  }
  return {
    schemaVersion: 1,
    updatedAt: timestamp(root.updatedAt, 'Updated date'),
    activeCollectionIds,
    learningFocus,
    passageProgress,
  };
}
export function parseBackup(input: unknown): Backup {
  const b = record(input, 'Backup');
  if (b.app !== 'verse-warrior') throw new Error('Choose a Verse Warrior progress backup.');
  return {
    app: 'verse-warrior',
    exportedAt: timestamp(b.exportedAt, 'Export date'),
    catalogVersion: text(b.catalogVersion, 'Catalog version'),
    state: parseState(b.state),
  };
}
export type Action =
  | { type: 'activate'; id: string; active: boolean; now: Date }
  | { type: 'focus'; focus: LearningFocus; now: Date }
  | { type: 'practice'; id: string; now: Date }
  | { type: 'rate'; id: string; rating: Rating; expected: string; now: Date }
  | { type: 'rate-reference'; id: string; rating: ReferenceRating; expected: string; now: Date };

export function reviewSignature(review?: Review | null): string {
  return JSON.stringify(review ?? null);
}
export function referenceSignature(reference?: ReferenceRecall | null): string {
  return JSON.stringify(reference ?? null);
}
export function progressReducer(state: ProgressState, action: Action): ProgressState {
  const stamp = action.now.toISOString();
  if (action.type === 'activate')
    return {
      ...state,
      updatedAt: stamp,
      activeCollectionIds: action.active
        ? [...new Set([...state.activeCollectionIds, action.id])]
        : state.activeCollectionIds.filter((id) => id !== action.id),
    };
  if (action.type === 'focus') return { ...state, updatedAt: stamp, learningFocus: action.focus };
  const previous = state.passageProgress[action.id];
  if (action.type === 'rate' && reviewSignature(previous?.review) !== action.expected)
    throw new Error(
      'This passage changed in another tab. Your rating was not applied. Return to Today to refresh your review session.',
    );
  if (
    action.type === 'rate-reference' &&
    referenceSignature(previous?.reference) !== action.expected
  )
    throw new Error(
      'This reference changed in another tab. Your rating was not applied. Return to Today to refresh your review session.',
    );
  const progress: PassageProgress = {
    startedAt: previous?.startedAt ?? stamp,
    lastPracticedAt: stamp,
    review:
      action.type === 'rate'
        ? rateReview(previous?.review ?? null, action.rating, action.now)
        : (previous?.review ?? null),
    reference:
      action.type === 'rate-reference'
        ? rateReference(previous?.reference ?? null, action.rating, action.now)
        : (previous?.reference ?? null),
  };
  return {
    ...state,
    updatedAt: stamp,
    passageProgress: { ...state.passageProgress, [action.id]: progress },
  };
}
