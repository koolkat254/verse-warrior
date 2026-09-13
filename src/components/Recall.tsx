import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Passage, Rating } from '../domain/types';
import { useApp } from '../state/context';
import { Comparison } from './Exercises';
import { Scripture } from './ui';
import { dateLabel } from '../domain/dateLabel';

export function Recall({
  passage,
  expected,
  enrollment = false,
  onNext,
  last = false,
}: {
  passage: Passage;
  expected: string;
  enrollment?: boolean;
  onNext?: () => void;
  last?: boolean;
}) {
  const { act, state } = useApp();
  const [revealed, setRevealed] = useState(false),
    [typing, setTyping] = useState(false),
    [attempt, setAttempt] = useState('');
  const [rating, setRating] = useState<Rating | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const review = state.passageProgress[passage.id]?.review;
  async function submit(value: Rating) {
    setPending(true);
    setError('');
    try {
      await act({ type: 'rate', id: passage.id, rating: value, expected, now: new Date() });
      setRating(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your rating could not be applied.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="recall-heading">
        <p className="eyebrow">
          {enrollment ? 'Your first recall' : 'Recall & review'} · {passage.translation}
        </p>
        <h1>{passage.reference}</h1>
      </div>
      {!revealed ? (
        <section className="panel recall-prompt">
          <div className="recall-mark" aria-hidden="true">
            “
          </div>
          <h2>Let the words come to you.</h2>
          <p>
            Say the passage aloud or quietly to yourself.
            <br />
            Then reveal the text and check your recall.
          </p>
          {typing ? (
            <>
              <label className="input-label" htmlFor="recall-attempt">
                Your recall attempt
              </label>
              <textarea
                id="recall-attempt"
                rows={6}
                value={attempt}
                onChange={(event) => setAttempt(event.target.value)}
                maxLength={Math.max(2000, passage.text.length * 3)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </>
          ) : (
            <button className="text-button" onClick={() => setTyping(true)}>
              I’d like to type it instead
            </button>
          )}
          <button className="button primary" onClick={() => setRevealed(true)}>
            {typing ? 'Reveal and compare' : 'Reveal passage'}
          </button>
        </section>
      ) : (
        <>
          <section className="panel">
            <Scripture passage={passage} />
            {typing && <Comparison expected={passage.text} actual={attempt} />}
          </section>
          {rating ? (
            <section className="rating-result" aria-live="polite">
              <h2>
                {enrollment
                  ? 'Your review rhythm has begun.'
                  : rating === 'remembered'
                    ? 'A little stronger each time.'
                    : 'Another chance to grow.'}
              </h2>
              <p>
                {review && `Next review: ${dateLabel(review.dueDate)}.`}{' '}
                {review?.masteredAt
                  ? 'This passage is mastered. Keep returning to it.'
                  : enrollment
                    ? 'This first attempt does not count toward mastery.'
                    : ''}
              </p>
              {rating !== 'remembered' && (
                <Link className="button" to={`/practice/${passage.id}/hide`}>
                  Practice with hints
                </Link>
              )}
              {enrollment ? (
                <Link className="button primary" to="/">
                  Back to Today
                </Link>
              ) : (
                <button className="button primary" onClick={onNext}>
                  {last ? 'Finish review' : 'Next passage'}
                </button>
              )}
            </section>
          ) : (
            <section className="rating-section">
              <h2>How did you remember it?</h2>
              <p>Choose what reflects your recall before revealing the passage.</p>
              <div className="rating-buttons">
                {(
                  [
                    {
                      value: 'remembered',
                      title: 'Remembered',
                      detail: 'Recalled it without help',
                    },
                    { value: 'help', title: 'Needed help', detail: 'Needed a hint or correction' },
                    { value: 'forgot', title: 'Forgot', detail: 'Couldn’t recall the passage' },
                  ] as const
                ).map((option) => (
                  <button
                    disabled={pending || !!error}
                    key={option.value}
                    onClick={() => {
                      void submit(option.value);
                    }}
                  >
                    <strong>{option.title}</strong>
                    <span>{option.detail}</span>
                  </button>
                ))}
              </div>
              {error && (
                <div role="alert" className="notice">
                  <p>{error}</p>
                  <Link to="/">Return to Today</Link>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
