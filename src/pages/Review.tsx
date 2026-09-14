import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Recall } from '../components/Recall';
import { ReferenceRecall } from '../components/ReferenceRecall';
import { Icon } from '../components/ui';
import { duePassageIds, referencePassageIds } from '../domain/scheduler';
import { referenceSignature, reviewSignature } from '../domain/state';
import { useApp } from '../state/context';

export const REVIEW_BATCH_SIZE = 5;
export const REFERENCE_BATCH_SIZE = 2;

export function ReviewSession() {
  const { catalog, state, now, warning } = useApp();
  const [queue] = useState(() => {
    const wordIds = duePassageIds(catalog, state, now).slice(0, REVIEW_BATCH_SIZE);
    const referenceIds = referencePassageIds(catalog, state, now, wordIds).slice(
      0,
      REFERENCE_BATCH_SIZE,
    );
    return [
      ...wordIds.map((id, position) => ({
        kind: 'words' as const,
        id,
        expected: reviewSignature(state.passageProgress[id]?.review),
        progressText: `Passage ${position + 1} of ${wordIds.length}`,
      })),
      ...referenceIds.map((id, position) => ({
        kind: 'reference' as const,
        id,
        expected: referenceSignature(state.passageProgress[id]?.reference),
        progressText: `Reference check ${position + 1} of ${referenceIds.length}`,
      })),
    ];
  });
  const [index, setIndex] = useState(0);
  const current = queue[index];
  if (!current)
    return (
      <section className="panel empty">
        <Icon name="leaf" size={48} />
        <p className="eyebrow">{queue.length ? 'Practice complete' : 'A little breathing room'}</p>
        <h1>{queue.length ? 'Carry these words into your day.' : 'Nothing is due right now.'}</h1>
        <p>
          {queue.length
            ? `You completed ${queue.length} ${queue.length === 1 ? 'card' : 'cards'}. ${warning ? 'Export your progress before leaving this unsaved session.' : 'Each rating has been saved as you went.'}`
            : 'Come back when your next review is ready, or spend a little time learning.'}
        </p>
        <Link to="/" className="button primary">
          Back to Today
        </Link>
      </section>
    );
  const passage = catalog.passages.find((item) => item.id === current.id)!;
  const last = index === queue.length - 1;
  const next = () => setIndex((value) => value + 1);
  return (
    <>
      <div className="session-progress">
        <span>{current.progressText}</span>
        <span>
          Up to {REVIEW_BATCH_SIZE} word cards and {REFERENCE_BATCH_SIZE} reference checks · You can
          stop anytime
        </span>
        <progress value={index} max={queue.length} aria-label="Review session progress" />
      </div>
      {current.kind === 'words' ? (
        <Recall
          key={`words-${current.id}`}
          passage={passage}
          expected={current.expected}
          onNext={next}
          last={last}
        />
      ) : (
        <ReferenceRecall
          key={`reference-${current.id}`}
          passage={passage}
          expected={current.expected}
          onNext={next}
          last={last}
        />
      )}
    </>
  );
}
