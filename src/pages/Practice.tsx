import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WordHints, Typing } from '../components/Exercises';
import { Recall } from '../components/Recall';
import { Recovery, Scripture } from '../components/ui';
import { dateLabel } from '../domain/dateLabel';
import { reviewSignature } from '../domain/state';
import type { Passage } from '../domain/types';
import { useApp } from '../state/context';

const modes = [
  { id: 'read', title: 'Read' },
  { id: 'hide', title: 'Hide words' },
  { id: 'letters', title: 'First letters' },
  { id: 'type', title: 'Type' },
  { id: 'reference', title: 'Reference' },
];
const progressiveModes: Record<string, { id: string; title: string } | undefined> = {
  read: { id: 'hide', title: 'Make it harder' },
  hide: { id: 'letters', title: 'Use first letters' },
  letters: { id: 'type', title: 'Type from memory' },
};
function PracticeContent({ passage, mode }: { passage: Passage; mode: string }) {
  const { state, act } = useApp();
  const [referenceVisible, setReferenceVisible] = useState(false),
    [error, setError] = useState('');
  const [expected] = useState(() => reviewSignature(state.passageProgress[passage.id]?.review));
  const recordedPassageId = useRef<string | null>(null);
  useEffect(() => {
    if (recordedPassageId.current === passage.id) return;
    recordedPassageId.current = passage.id;
    void act({ type: 'practice', id: passage.id, now: new Date() }).catch((e) =>
      setError(e.message),
    );
  }, [act, passage.id]);
  const review = state.passageProgress[passage.id]?.review;
  const nextMode = progressiveModes[mode];
  if (mode === 'enroll')
    return expected === 'null' ? (
      <Recall passage={passage} expected={expected} enrollment />
    ) : (
      <section className="panel">
        <h1>Already in your review rhythm.</h1>
        <p>
          {review && `Next review: ${dateLabel(review.dueDate)}.`} You can practice anytime without
          changing the schedule.
        </p>
        <Link className="button" to={`/practice/${passage.id}/read`}>
          Continue practicing
        </Link>
        <Link className="button primary" to="/">
          Back to Today
        </Link>
      </section>
    );
  return (
    <>
      <div className="practice-heading">
        <p className="eyebrow">
          {mode === 'reference' ? 'Reference practice' : 'Make the words familiar'} ·{' '}
          {passage.translation}
        </p>
        <h1>{mode === 'reference' ? 'Where are these words found?' : passage.reference}</h1>
        <p>
          {mode === 'reference'
            ? 'Recall the book, chapter, and verse. Reveal the reference when you’re ready.'
            : 'Start with the words. Gradually give your memory more room.'}
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      <section className="panel practice-panel">
        {mode === 'read' && <Scripture passage={passage} />}
        {mode === 'hide' && <WordHints text={passage.text} />}
        {mode === 'letters' && <WordHints text={passage.text} letters />}
        {mode === 'type' && <Typing text={passage.text} />}
        {mode === 'reference' && (
          <>
            <p className="scripture">{passage.text}</p>
            {referenceVisible ? (
              <div className="reference-answer" aria-live="polite">
                <h2>{passage.reference}</h2>
                <p>Check the book, chapter, and verse against what you recalled.</p>
                <button className="button" onClick={() => setReferenceVisible(false)}>
                  Try again
                </button>
              </div>
            ) : (
              <button className="button primary" onClick={() => setReferenceVisible(true)}>
                Reveal reference
              </button>
            )}
          </>
        )}
      </section>
      <div className="practice-footer">
        <p>
          {review
            ? `In review · Next due ${dateLabel(review.dueDate)}. Extra practice won’t change this date.`
            : 'Feeling ready? Try recalling the passage and begin spaced review.'}
        </p>
        {nextMode ? (
          <Link className="button primary" to={`/practice/${passage.id}/${nextMode.id}`}>
            {nextMode.title} <span aria-hidden="true">→</span>
          </Link>
        ) : !review ? (
          <Link className="button primary" to={`/practice/${passage.id}/enroll`}>
            Test recall & start review <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
      <details className="practice-options">
        <summary>Practice options</summary>
        <p>
          Choose a tool, repeat one, or test the reference. Extra practice does not change review
          dates.
        </p>
        <nav aria-label="Practice tools">
          {modes.map((item) => (
            <Link
              key={item.id}
              className={item.id === mode ? 'active' : ''}
              to={`/practice/${passage.id}/${item.id}`}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
}
export function Practice() {
  const { passageId, mode } = useParams();
  const { catalog } = useApp();
  const passage = catalog.passages.find((p) => p.id === passageId);
  if (!passage || (!modes.some((m) => m.id === mode) && mode !== 'enroll'))
    return <Recovery message="We couldn’t find this passage or practice tool." />;
  return <PracticeContent key={`${passage.id}/${mode}`} passage={passage} mode={mode!} />;
}
