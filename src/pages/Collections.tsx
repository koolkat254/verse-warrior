import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { flatten } from '../domain/catalog';
import { status, STATUS_LABELS } from '../domain/scheduler';
import type { Collection, Group as CollectionGroup, Week } from '../domain/types';
import { useApp } from '../state/context';
import { Icon, ProgressCounts, Recovery } from '../components/ui';
import { dateLabel } from '../domain/dateLabel';

export function Collections() {
  const { catalog, state, act } = useApp();
  const [error, setError] = useState('');
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Words to carry with you</p>
        <h1>Your collections</h1>
        <p>Choose what matters to you. Learn at your own pace.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {catalog.collections.length ? (
        <div className="card-grid">
          {catalog.collections.map((c) => (
            <article className="panel collection-card" key={c.id}>
              <div className="collection-icon">
                <Icon name="book" />
              </div>
              <p className="eyebrow">{flatten(c).length} passages</p>
              <Link to={`/collections/${c.id}`} className="title-link">
                <h2>{c.title}</h2>
                <Icon name="arrow" />
              </Link>
              {c.description && <p>{c.description}</p>}
              <ProgressCounts ids={flatten(c)} />
              <button
                className="button full-width"
                aria-pressed={state.activeCollectionIds.includes(c.id)}
                onClick={() => {
                  void act({
                    type: 'activate',
                    id: c.id,
                    active: !state.activeCollectionIds.includes(c.id),
                    now: new Date(),
                  }).catch((e) => setError(String(e.message)));
                }}
              >
                {state.activeCollectionIds.includes(c.id)
                  ? 'Pause collection'
                  : 'Activate collection'}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel empty">
          <div className="collection-icon">
            <Icon name="book" size={32} />
          </div>
          <h2>A place for your first collection.</h2>
          <p>
            No collections have been added yet. Once the first collection is available, you can
            begin learning here.
          </p>
          <Link className="button" to="/">
            Back to Today
          </Link>
        </section>
      )}
      <p className="small muted section">
        Active collections contribute to your daily reviews. Pausing keeps your progress and review
        dates.
      </p>
    </>
  );
}
function PassageList({ ids }: { ids: string[] }) {
  const { catalog, state } = useApp();
  return ids.length ? (
    <ul className="passage-list">
      {ids.map((id, index) => {
        const p = catalog.passages.find((p) => p.id === id)!;
        const progress = state.passageProgress[id];
        return (
          <li key={id}>
            <Link to={`/practice/${id}/read`}>
              <span className="passage-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="passage-information">
                <strong>{p.reference}</strong>
                <span>{p.translation}</span>
                {progress?.review && (
                  <span className="review-dates">
                    Last reviewed {dateLabel(progress.review.lastReviewedAt)} · Due{' '}
                    {dateLabel(progress.review.dueDate)}
                  </span>
                )}
                {progress?.reference && (
                  <span className="review-dates">
                    Reference{' '}
                    {progress.reference.solidAt
                      ? 'solid'
                      : `${progress.reference.successfulRecallStreak} of 3`}
                  </span>
                )}
              </div>
              <span className={`status ${status(progress)}`}>
                {STATUS_LABELS[status(progress)]}
              </span>
              <Icon name="arrow" size={18} />
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="muted">No passages in this group yet.</p>
  );
}
function Group({
  group,
  collectionId,
  top = false,
}: {
  group: Collection | CollectionGroup | Week;
  collectionId: string;
  top?: boolean;
}) {
  const { state, act } = useApp();
  const [error, setError] = useState('');
  const selected =
    state.learningFocus?.collectionId === collectionId &&
    state.learningFocus.groupId === (top ? undefined : group.id);
  return (
    <section className={top ? 'collection-content' : 'group-section'}>
      <div className="section-heading">
        <h2>{top ? 'Where to learn next' : group.title}</h2>
        <div className="group-actions">
          <button
            className="button small-button"
            aria-pressed={selected}
            onClick={() => {
              void act({
                type: 'focus',
                focus: { collectionId, ...(top ? {} : { groupId: group.id }) },
                now: new Date(),
              }).catch((e) => setError(e.message));
            }}
          >
            {selected
              ? 'Learning from here'
              : top
                ? 'Learn from this collection'
                : 'Learn from this group'}
          </button>
          <Link
            className="button small-button"
            to={
              top
                ? `/reference/${collectionId}/choose`
                : `/reference/${collectionId}/groups/${group.id}/choose`
            }
          >
            Reference drill
          </Link>
        </div>
      </div>
      {top && (
        <p className="learning-direction">Today suggests new passages from this selection.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {!top && <ProgressCounts ids={flatten(group)} />}
      {group.passageIds ? (
        <PassageList ids={group.passageIds} />
      ) : group.weeks ? (
        group.weeks.map((week) => <Group key={week.id} group={week} collectionId={collectionId} />)
      ) : (
        ('groups' in group ? (group.groups ?? []) : []).map((section) => (
          <Group key={section.id} group={section} collectionId={collectionId} />
        ))
      )}
    </section>
  );
}
export function CollectionDetail() {
  const { collectionId } = useParams();
  const { catalog, state, act } = useApp();
  const [error, setError] = useState('');
  const collection = catalog.collections.find((c) => c.id === collectionId);
  if (!collection)
    return (
      <Recovery message="This collection may have moved or is no longer bundled with the app. Your saved progress is retained." />
    );
  const active = state.activeCollectionIds.includes(collection.id);
  return (
    <>
      <Link className="back-link" to="/collections">
        ← Collections
      </Link>
      <div className="page-heading">
        <p className="eyebrow">Your collection · {flatten(collection).length} passages</p>
        <h1>{collection.title}</h1>
        <p>{collection.description ?? 'A little practice, one passage at a time.'}</p>
        <button
          className="button"
          aria-pressed={active}
          onClick={() => {
            void act({
              type: 'activate',
              id: collection.id,
              active: !active,
              now: new Date(),
            }).catch((e) => setError(e.message));
          }}
        >
          {active ? 'Pause collection' : 'Activate collection'}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="panel">
        <ProgressCounts ids={flatten(collection)} />
      </div>
      <Group group={collection} collectionId={collection.id} top />
    </>
  );
}
