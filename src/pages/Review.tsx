import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Recall } from '../components/Recall';
import { Icon } from '../components/ui';
import { duePassageIds } from '../domain/scheduler';
import { reviewSignature } from '../domain/state';
import { useApp } from '../state/context';

export const REVIEW_BATCH_SIZE = 5;

export function ReviewSession() {
  const { catalog, state, now, warning } = useApp();
  const [queue] = useState(() =>
    duePassageIds(catalog, state, now)
      .slice(0, REVIEW_BATCH_SIZE)
      .map((id) => ({
        id,
        expected: reviewSignature(state.passageProgress[id]?.review),
      })),
  );
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
            ? `You reviewed ${queue.length} ${queue.length === 1 ? 'passage' : 'passages'}. ${warning ? 'Export your progress before leaving this unsaved session.' : 'Each rating has been saved as you went.'}`
            : 'Come back when your next review is ready, or spend a little time learning.'}
        </p>
        <Link to="/" className="button primary">
          Back to Today
        </Link>
      </section>
    );
  const passage = catalog.passages.find((p) => p.id === current.id)!;
  return (
    <>
      <div className="session-progress">
        <span>
          Passage {index + 1} of {queue.length}
        </span>
        <span>Up to {REVIEW_BATCH_SIZE} at a time · You can stop anytime</span>
        <progress value={index} max={queue.length} aria-label="Review session progress" />
      </div>
      <Recall
        key={current.id}
        passage={passage}
        expected={current.expected}
        onNext={() => setIndex((i) => i + 1)}
        last={index === queue.length - 1}
      />
    </>
  );
}
