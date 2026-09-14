export interface Passage {
  id: string;
  reference: string;
  text: string;
  translation: string;
  attribution?: string;
}
export interface Week {
  id: string;
  title: string;
  passageIds: string[];
}
export type Group = { id: string; title: string } & (
  { passageIds: string[]; weeks?: never } | { weeks: Week[]; passageIds?: never }
);
export type Collection = { id: string; title: string; description?: string } & (
  | { passageIds: string[]; weeks?: never; groups?: never }
  | { weeks: Week[]; passageIds?: never; groups?: never }
  | { groups: Group[]; passageIds?: never; weeks?: never }
);
export interface Catalog {
  schemaVersion: 1;
  contentVersion: string;
  passages: Passage[];
  collections: Collection[];
}
export type Rating = 'remembered' | 'help' | 'forgot';
export type ReferenceRating = 'remembered' | 'help';
export interface Review {
  intervalStep: number;
  dueDate: string;
  lastReviewedAt: string;
  lastRating: Rating;
  successfulReviewStreak: number;
  masteredAt: string | null;
}
export interface ReferenceRecall {
  lastReviewedAt: string;
  lastRating: ReferenceRating;
  successfulRecallStreak: number;
  solidAt: string | null;
}
export interface PassageProgress {
  startedAt: string;
  lastPracticedAt: string;
  review: Review | null;
  reference: ReferenceRecall | null;
}
export interface LearningFocus {
  collectionId: string;
  groupId?: string;
}
export interface ProgressState {
  schemaVersion: 1;
  updatedAt: string;
  activeCollectionIds: string[];
  learningFocus: LearningFocus | null;
  passageProgress: Record<string, PassageProgress>;
}
export interface Backup {
  app: 'verse-warrior';
  exportedAt: string;
  catalogVersion: string;
  state: ProgressState;
}
