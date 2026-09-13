import { useState } from 'react';
import { compareWords, firstLetter, tokens, wordOrder } from '../domain/text';

export function WordHints({ text, letters = false }: { text: string; letters?: boolean }) {
  const parts = tokens(text);
  const words = parts.filter((p) => /[\p{L}\p{N}]/u.test(p));
  const [order, setOrder] = useState(() => wordOrder(words.length));
  const [level, setLevel] = useState(25);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const hidden = new Set(order.slice(0, Math.ceil((words.length * level) / 100)));
  let index = -1;
  return (
    <div>
      {!letters && (
        <div className="exercise-controls">
          <fieldset className="levels">
            <legend>Words hidden</legend>
            {[0, 25, 50, 75, 100].map((value) => (
              <button
                key={value}
                aria-pressed={level === value}
                onClick={() => {
                  setLevel(value);
                  setRevealed(new Set());
                }}
              >
                {value}%
              </button>
            ))}
          </fieldset>
          <button
            className="text-button"
            onClick={() => {
              setOrder(wordOrder(words.length));
              setRevealed(new Set());
            }}
          >
            New pattern
          </button>
        </div>
      )}
      <p className="hint-description">
        {letters
          ? 'Use the first letters to recall each word.'
          : 'Read the passage aloud, filling in the hidden words.'}{' '}
        Tap a hint to reveal a word.
      </p>
      <div className="scripture hinted-text">
        {parts.map((part, position) => {
          if (!/[\p{L}\p{N}]/u.test(part)) return <span key={position}>{part}</span>;
          const n = ++index;
          const concealed = (letters || hidden.has(n)) && !revealed.has(n);
          return concealed ? (
            <button
              className="word-hint"
              key={position}
              aria-label={
                letters ? `Hint ${firstLetter(part)}, reveal word ${n + 1}` : `Reveal word ${n + 1}`
              }
              onClick={() => setRevealed((current) => new Set([...current, n]))}
            >
              {letters ? firstLetter(part) : '••••'}
            </button>
          ) : (
            <span key={position}>{part}</span>
          );
        })}
      </div>
      {letters && revealed.size > 0 && (
        <button className="text-button" onClick={() => setRevealed(new Set())}>
          Reset hints
        </button>
      )}
    </div>
  );
}
export function Comparison({ expected, actual }: { expected: string; actual: string }) {
  const differences = compareWords(expected, actual);
  const exact = differences.every((d) => d.kind === 'correct');
  return (
    <section className="comparison" aria-label="Attempt comparison">
      <h3>{exact ? 'All the words are there.' : 'A moment to check your recall.'}</h3>
      <p className="muted">Case, punctuation, and spacing don’t affect this comparison.</p>
      <div className="diff-words">
        {differences.map((d, i) => (
          <span
            key={i}
            className={`diff ${d.kind}`}
            aria-label={
              d.kind === 'correct'
                ? d.actual
                : d.kind === 'incorrect'
                  ? `You wrote ${d.actual}; expected ${d.expected}`
                  : `${d.kind}: ${d.expected ?? d.actual}`
            }
          >
            {d.kind === 'incorrect' ? (
              <>
                <del>{d.actual}</del> <ins>{d.expected}</ins>
              </>
            ) : d.kind === 'extra' ? (
              <del>{d.actual}</del>
            ) : d.kind === 'missing' ? (
              <ins>{d.expected}</ins>
            ) : (
              d.actual
            )}
          </span>
        ))}
      </div>
      {!exact && (
        <p className="diff-legend">
          Underlined: missing or expected · Crossed out: extra or replaced
        </p>
      )}
    </section>
  );
}
export function Typing({ text }: { text: string }) {
  const [attempt, setAttempt] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <div>
      <label className="input-label" htmlFor="typed-attempt">
        Type the passage from memory
      </label>
      <textarea
        id="typed-attempt"
        value={attempt}
        onChange={(event) => setAttempt(event.target.value)}
        readOnly={submitted}
        maxLength={Math.max(2000, text.length * 3)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Take your time. Begin when you’re ready."
        rows={6}
      />
      {submitted ? (
        <>
          <Comparison expected={text} actual={attempt} />
          <button
            className="button"
            onClick={() => {
              setAttempt('');
              setSubmitted(false);
            }}
          >
            Try again
          </button>
        </>
      ) : (
        <button
          className="button primary"
          disabled={!attempt.trim()}
          onClick={() => setSubmitted(true)}
        >
          Compare attempt
        </button>
      )}
    </div>
  );
}
