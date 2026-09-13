import { Link } from 'react-router-dom';
import { counts, STATUS_LABELS } from '../domain/scheduler';
import { useApp } from '../state/context';
import type { Passage } from '../domain/types';

export function Icon({
  name,
  size = 22,
}: {
  name: 'book' | 'sun' | 'settings' | 'arrow' | 'leaf';
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'book' && (
        <>
          <path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z" />
          <path d="M12 5v15" />
        </>
      )}
      {name === 'sun' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      )}
      {name === 'settings' && (
        <>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="8" cy="6" r="2" fill="currentColor" />
          <circle cx="16" cy="12" r="2" fill="currentColor" />
          <circle cx="10" cy="18" r="2" fill="currentColor" />
        </>
      )}
      {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
      {name === 'leaf' && (
        <>
          <path d="M19 3c1 8-1 16-9 16-5 0-7-6-3-10 3-3 7-2 12-6Z" />
          <path d="m5 22 9-12" />
        </>
      )}
    </svg>
  );
}
export function Recovery({ message = 'This page is not available.' }: { message?: string }) {
  return (
    <section className="panel empty">
      <Icon name="book" size={40} />
      <h1>Let’s find your place.</h1>
      <p>{message}</p>
      <Link className="button primary" to="/collections">
        Go to Collections
      </Link>
    </section>
  );
}
export function ProgressCounts({ ids }: { ids: string[] }) {
  const { state } = useApp();
  const summary = counts(ids, state);
  const total = new Set(ids).size;
  return (
    <div className="progress-summary">
      <div className="progress-heading">
        <span>
          {summary.mastered} of {total} mastered
        </span>
        <strong>{total ? Math.round((summary.mastered / total) * 100) : 0}%</strong>
      </div>
      <progress value={summary.mastered} max={total || 1} aria-label="Passages mastered" />
      <div className="count-grid">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key}>
            <strong>{value}</strong>
            <span>{STATUS_LABELS[key as keyof typeof STATUS_LABELS]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Scripture({ passage }: { passage: Passage }) {
  return (
    <>
      <p className="scripture">{passage.text}</p>
      {passage.attribution && <p className="attribution">{passage.attribution}</p>}
    </>
  );
}
