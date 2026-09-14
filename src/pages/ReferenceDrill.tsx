import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGroup, flatten } from '../domain/catalog';
import { normalizeReference } from '../domain/text';
import type { Passage } from '../domain/types';
import { Recovery, Scripture } from '../components/ui';
import { useApp } from '../state/context';

const modes = [
  { id: 'choose', title: 'Choose' },
  { id: 'match', title: 'Match' },
  { id: 'type', title: 'Type' },
] as const;
type DrillMode = (typeof modes)[number]['id'];

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
function RoundFooter({ onNext }: { onNext: () => void }) {
  return (
    <button className="button" onClick={onNext}>
      Another verse
    </button>
  );
}
function ChooseReference({
  passages,
  round,
  onNext,
}: {
  passages: Passage[];
  round: number;
  onNext: () => void;
}) {
  const { passage, options } = useMemo(() => {
    const passage = passages[round % passages.length];
    return {
      passage,
      options: shuffle([
        passage,
        ...shuffle(passages.filter((item) => item.id !== passage.id)).slice(0, 3),
      ]),
    };
  }, [passages, round]);
  const [selected, setSelected] = useState<string | null>(null);
  const correct = selected === passage.id;
  return (
    <>
      <section className="panel practice-panel reference-drill-card">
        <p className="eyebrow">Choose the reference</p>
        <Scripture passage={passage} />
        <p className="muted">Which reference belongs with these words?</p>
        <div className="drill-choices">
          {options.map((option) => (
            <button
              key={option.id}
              disabled={selected !== null}
              className={selected === option.id ? (correct ? 'correct' : 'incorrect') : ''}
              onClick={() => setSelected(option.id)}
            >
              {option.reference}
            </button>
          ))}
        </div>
        {selected !== null && (
          <div className="drill-feedback" aria-live="polite">
            <h2>{correct ? 'That is right.' : 'Not this time.'}</h2>
            {!correct && <p>The reference is {passage.reference}.</p>}
            <RoundFooter onNext={onNext} />
          </div>
        )}
      </section>
    </>
  );
}
function MatchReferences({ passages, onNext }: { passages: Passage[]; onNext: () => void }) {
  const items = useMemo(() => shuffle(passages).slice(0, Math.min(3, passages.length)), [passages]);
  const options = useMemo(() => shuffle(items), [items]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="panel practice-panel reference-drill-card">
      <p className="eyebrow">Match verses and references</p>
      <p className="muted">Choose the reference that belongs with each passage.</p>
      <div className="match-list">
        {items.map((item, index) => {
          const answer = answers[item.id];
          const correct = submitted && answer === item.id;
          return (
            <section className="match-row" key={item.id}>
              <p className="match-number">{String(index + 1).padStart(2, '0')}</p>
              <p>{item.text}</p>
              <label>
                <span className="sr-only">Reference for passage {index + 1}</span>
                <select
                  className={submitted ? (correct ? 'correct' : 'incorrect') : ''}
                  disabled={submitted}
                  value={answer ?? ''}
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                >
                  <option value="">Choose a reference</option>
                  {options.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.reference}
                    </option>
                  ))}
                </select>
              </label>
              {submitted && !correct && <p className="match-answer">{item.reference}</p>}
            </section>
          );
        })}
      </div>
      {submitted ? (
        <div className="drill-feedback" aria-live="polite">
          <h2>
            {items.every((item) => answers[item.id] === item.id)
              ? 'All matched.'
              : 'Check the answers above.'}
          </h2>
          <RoundFooter onNext={onNext} />
        </div>
      ) : (
        <button className="button primary" onClick={() => setSubmitted(true)}>
          Check matches
        </button>
      )}
    </section>
  );
}
function TypeReference({
  passages,
  round,
  onNext,
}: {
  passages: Passage[];
  round: number;
  onNext: () => void;
}) {
  const passage = passages[round % passages.length];
  const [attempt, setAttempt] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const correct = normalizeReference(attempt) === normalizeReference(passage.reference);
  return (
    <section className="panel practice-panel reference-drill-card">
      <p className="eyebrow">Type the reference</p>
      <Scripture passage={passage} />
      <label className="input-label" htmlFor="reference-attempt">
        Book, chapter, and verse
      </label>
      <input
        id="reference-attempt"
        className="reference-input"
        disabled={submitted}
        value={attempt}
        onChange={(event) => setAttempt(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        placeholder="For example: John 3:16"
      />
      {submitted ? (
        <div className="drill-feedback" aria-live="polite">
          <h2>{correct ? 'That is right.' : 'Check the reference.'}</h2>
          {!correct && <p>{passage.reference}</p>}
          <p className="small muted">Case, spaces, and punctuation do not affect this check.</p>
          <RoundFooter onNext={onNext} />
        </div>
      ) : (
        <button
          className="button primary"
          disabled={!attempt.trim()}
          onClick={() => setSubmitted(true)}
        >
          Check reference
        </button>
      )}
    </section>
  );
}
export function ReferenceDrill() {
  const { catalog } = useApp();
  const { collectionId, groupId, mode } = useParams();
  const [round, setRound] = useState(() => Math.floor(Math.random() * 10_000));
  const collection = catalog.collections.find((item) => item.id === collectionId);
  const group = collection && findGroup(collection, groupId);
  const validMode = modes.some((item) => item.id === mode) ? (mode as DrillMode) : null;
  if (!collection || !group || !validMode)
    return <Recovery message="We could not find this reference drill." />;
  const passages = flatten(group)
    .map((id) => catalog.passages.find((passage) => passage.id === id))
    .filter((passage): passage is Passage => !!passage);
  if (!passages.length)
    return <Recovery message="This group does not have passages to practice yet." />;
  if (validMode === 'match' && passages.length < 2)
    return <Recovery message="Add at least two passages to use the matching drill." />;
  const base = groupId
    ? `/reference/${collection.id}/groups/${groupId}`
    : `/reference/${collection.id}`;
  const next = () => setRound((current) => (current + 1) % passages.length);
  return (
    <>
      <Link className="exit-practice" to={`/collections/${collection.id}`}>
        Back to collection <span aria-hidden="true">←</span>
      </Link>
      <div className="practice-heading">
        <p className="eyebrow">Reference drill · {group.title}</p>
        <h1>Connect words and references.</h1>
        <p>Practice only. Your scheduled review rhythm stays the same.</p>
      </div>
      <nav className="drill-nav" aria-label="Reference drill levels">
        {modes.map((item) => (
          <Link
            className={item.id === validMode ? 'active' : ''}
            key={item.id}
            to={`${base}/${item.id}`}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      {validMode === 'choose' && (
        <ChooseReference key={`choose-${round}`} passages={passages} round={round} onNext={next} />
      )}
      {validMode === 'match' && (
        <MatchReferences key={`match-${round}`} passages={passages} onNext={next} />
      )}
      {validMode === 'type' && (
        <TypeReference key={`type-${round}`} passages={passages} round={round} onNext={next} />
      )}
    </>
  );
}
