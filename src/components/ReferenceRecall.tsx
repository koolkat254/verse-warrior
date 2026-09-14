import { useCallback, useEffect, useState } from 'react';
import type { Passage, ReferenceRating } from '../domain/types';
import { useApp } from '../state/context';

export function ReferenceRecall({
  passage,
  expected,
  onNext,
  last = false,
}: {
  passage: Passage;
  expected: string;
  onNext: () => void;
  last?: boolean;
}) {
  const { act, state } = useApp();
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<ReferenceRating | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reference = state.passageProgress[passage.id]?.reference;
  const submit = useCallback(
    async (value: ReferenceRating) => {
      setPending(true);
      setError('');
      try {
        await act({
          type: 'rate-reference',
          id: passage.id,
          rating: value,
          expected,
          now: new Date(),
        });
        setRating(value);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : 'Your reference rating could not be applied.',
        );
      } finally {
        setPending(false);
      }
    },
    [act, expected, passage.id],
  );
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      )
        return;
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed && !rating && !pending && !error) {
        const shortcuts: Record<string, ReferenceRating> = { '1': 'remembered', '2': 'help' };
        if (shortcuts[event.key]) {
          event.preventDefault();
          void submit(shortcuts[event.key]);
        }
      } else if (rating && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        onNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [error, onNext, pending, rating, revealed, submit]);
  return (
    <>
      <div className="recall-heading">
        <p className="eyebrow">Reference recall · {passage.translation}</p>
        <h1>Where are these words found?</h1>
      </div>
      <section className="panel reference-recall">
        <p className="scripture">{passage.text}</p>
        {!revealed ? (
          <div className="reference-prompt">
            <p>Recall the book, chapter, and verse aloud or quietly to yourself.</p>
            <p className="shortcut-hint">Press Space or Enter to reveal.</p>
            <button
              className="button primary primary-action"
              autoFocus
              onClick={() => setRevealed(true)}
            >
              Reveal reference
            </button>
          </div>
        ) : rating ? (
          <div className="rating-result" aria-live="polite">
            <h2>
              {rating === 'remembered'
                ? 'You connected the words and reference.'
                : 'Keep building the connection.'}
            </h2>
            <p>
              {reference?.solidAt
                ? 'This reference is solid. Keep it familiar as you review the words.'
                : `${reference?.successfulRecallStreak ?? 0} of 3 consecutive reference recalls.`}
            </p>
            <button
              className="button primary"
              autoFocus
              aria-keyshortcuts="Enter Space"
              onClick={onNext}
            >
              {last ? 'Finish practice' : 'Next card'}
            </button>
          </div>
        ) : (
          <div className="reference-answer" aria-live="polite">
            <h2>{passage.reference}</h2>
            <p>How well did you remember the reference before revealing it?</p>
            <p className="shortcut-hint">Keyboard: 1 remembered · 2 needed help</p>
            <div className="rating-buttons reference-rating-buttons">
              <button
                disabled={pending || !!error}
                aria-keyshortcuts="1"
                onClick={() => void submit('remembered')}
              >
                <strong>Remembered</strong>
                <span>Recalled the reference unaided</span>
              </button>
              <button
                disabled={pending || !!error}
                aria-keyshortcuts="2"
                onClick={() => void submit('help')}
              >
                <strong>Needed help</strong>
                <span>Needed a reminder or correction</span>
              </button>
            </div>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
