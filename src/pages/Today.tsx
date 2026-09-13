import { Link } from 'react-router-dom';
import { findGroup, flatten } from '../domain/catalog';
import { activePassageIds, duePassageIds } from '../domain/scheduler';
import { useApp } from '../state/context';
import { Icon, ProgressCounts } from '../components/ui';
import { dateLabel } from '../domain/dateLabel';

export function Today() {
  const { catalog, state, now } = useApp();
  const active = catalog.collections.filter((c) => state.activeCollectionIds.includes(c.id));
  const due = duePassageIds(catalog, state, now);
  const focusCollection = catalog.collections.find(
    (c) => c.id === state.learningFocus?.collectionId,
  );
  const group = focusCollection && findGroup(focusCollection, state.learningFocus?.groupId);
  const learningIds = group
    ? flatten(group).filter((id) => !state.passageProgress[id]?.review)
    : [];
  const resumedId = [...learningIds]
    .filter((id) => state.passageProgress[id])
    .sort((first, second) =>
      state.passageProgress[second].lastPracticedAt.localeCompare(
        state.passageProgress[first].lastPracticedAt,
      ),
    )[0];
  const nextId = resumedId ?? learningIds[0];
  const next = catalog.passages.find((p) => p.id === nextId);
  const practiceTarget = due.length ? '/review' : next ? `/practice/${next.id}/read` : null;
  const nextDue = activePassageIds(catalog, state)
    .map((id) => state.passageProgress[id]?.review?.dueDate)
    .filter((d): d is string => !!d)
    .sort()[0];
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">A little practice. Lasting roots.</p>
        <h1>Your daily practice</h1>
        <p>Make room for the words you want to carry with you.</p>
      </div>
      {!active.length ? (
        <section className="welcome-panel">
          <div className="welcome-art" aria-hidden="true">
            <div className="art-circle">
              <Icon name="book" size={72} />
            </div>
            <span className="art-line" />
          </div>
          <div>
            <p className="eyebrow">Begin at your own pace</p>
            <h2>One passage at a time.</h2>
            <p>
              Choose a collection, learn its passages, and return for a little recall. We’ll help
              you find your next step.
            </p>
            <Link className="button primary" to="/collections">
              Choose a collection <Icon name="arrow" />
            </Link>
            <p className="small muted">
              Your progress stays in this browser. You can download a backup anytime in Settings.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="review-hero">
            <div>
              <p className="eyebrow">Your next step</p>
              <h2>
                {due.length ? (
                  <>
                    <span className="due-number">{due.length}</span>{' '}
                    {due.length === 1 ? 'passage is' : 'passages are'} ready to recall.
                  </>
                ) : next ? (
                  next.reference
                ) : (
                  'You’re caught up.'
                )}
              </h2>
              <p>
                {due.length
                  ? 'Start with one passage. Your session will keep moving until you choose to stop.'
                  : next && focusCollection
                    ? `${resumedId ? 'Pick up where you left off' : 'Begin something new'} from ${focusCollection.title}${group && group !== focusCollection ? ` · ${group.title}` : ''}.`
                    : nextDue
                      ? `Your next review is ${dateLabel(nextDue)}. Choose a learning focus to continue.`
                      : 'Your review rhythm begins when you mark a passage ready.'}
              </p>
              {practiceTarget ? (
                <Link to={practiceTarget} className="button primary">
                  Start practice <Icon name="arrow" />
                </Link>
              ) : (
                <Link to="/collections" className="button primary">
                  Choose a focus <Icon name="arrow" />
                </Link>
              )}
            </div>
            <Icon name="sun" size={64} />
          </section>
          <p className="focus-line">
            {focusCollection
              ? `Learning focus: ${focusCollection.title}${group && group !== focusCollection ? ` · ${group.title}` : ''}.`
              : 'Choose a collection, book, or week as your learning focus.'}{' '}
            <Link to={focusCollection ? `/collections/${focusCollection.id}` : '/collections'}>
              Change
            </Link>
          </p>
          <section className="section">
            <div className="section-heading">
              <h2>Your collections</h2>
              <Link to="/collections">View all</Link>
            </div>
            <div className="card-grid">
              {active.map((c) => (
                <article className="panel" key={c.id}>
                  <Link className="title-link" to={`/collections/${c.id}`}>
                    <h3>{c.title}</h3>
                    <Icon name="arrow" size={18} />
                  </Link>
                  <ProgressCounts ids={flatten(c)} />
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      <aside className="quiet-note">
        <Icon name="leaf" />
        <p>Memory grows with returning. A few honest minutes are a good place to start.</p>
      </aside>
    </>
  );
}
