import type { Book, Catalog, Collection, Passage, Week } from './types';

export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be nonempty text.`);
  return value;
}
export function identifier(value: unknown, label: string): string {
  const id = text(value, label);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id))
    throw new Error(`${label} must be a safe lowercase ID.`);
  return id;
}
export function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}
export function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate IDs.`);
}
export function parseCatalog(input: unknown): Catalog {
  const root = record(input, 'Catalog');
  if (root.schemaVersion !== 1) throw new Error('Unsupported catalog schema version.');
  const passages: Passage[] = array(root.passages, 'Passages').map((value) => {
    const p = record(value, 'Passage');
    return {
      id: identifier(p.id, 'Passage ID'),
      reference: text(p.reference, 'Reference'),
      text: text(p.text, 'Passage text'),
      translation: text(p.translation, 'Translation'),
      ...(p.attribution === undefined ? {} : { attribution: text(p.attribution, 'Attribution') }),
    };
  });
  unique(
    passages.map((p) => p.id),
    'Passages',
  );
  const known = new Set(passages.map((p) => p.id));
  const passageIds = (value: unknown) => {
    const ids = array(value, 'Passage IDs').map((v) => identifier(v, 'Passage ID'));
    unique(ids, 'Passage list');
    for (const id of ids) if (!known.has(id)) throw new Error(`Unknown passage: ${id}.`);
    return ids;
  };
  function shape(o: Record<string, unknown>, allowed: string[]) {
    const present = ['passageIds', 'weeks', 'books'].filter((k) => o[k] !== undefined);
    if (present.length !== 1 || !allowed.includes(present[0]))
      throw new Error('Choose exactly one supported grouping: passageIds, weeks, or books.');
  }
  const collections: Collection[] = array(root.collections, 'Collections').map((value) => {
    const c = record(value, 'Collection');
    const groups: string[] = [];
    function group(value: unknown) {
      const g = record(value, 'Group');
      const id = identifier(g.id, 'Group ID');
      groups.push(id);
      return { g, id, title: text(g.title, 'Group title') };
    }
    function week(value: unknown): Week {
      const { g, id, title } = group(value);
      shape(g, ['passageIds']);
      return { id, title, passageIds: passageIds(g.passageIds) };
    }
    function book(value: unknown): Book {
      const { g, id, title } = group(value);
      shape(g, ['passageIds', 'weeks']);
      return g.weeks === undefined
        ? { id, title, passageIds: passageIds(g.passageIds) }
        : { id, title, weeks: array(g.weeks, 'Weeks').map(week) };
    }
    shape(c, ['passageIds', 'weeks', 'books']);
    const base = {
      id: identifier(c.id, 'Collection ID'),
      title: text(c.title, 'Collection title'),
      ...(c.description === undefined ? {} : { description: text(c.description, 'Description') }),
    };
    const result =
      c.books !== undefined
        ? { ...base, books: array(c.books, 'Books').map(book) }
        : c.weeks !== undefined
          ? { ...base, weeks: array(c.weeks, 'Weeks').map(week) }
          : { ...base, passageIds: passageIds(c.passageIds) };
    unique(groups, `Groups in ${base.id}`);
    return result;
  });
  unique(
    collections.map((c) => c.id),
    'Collections',
  );
  return {
    schemaVersion: 1,
    contentVersion: text(root.contentVersion, 'Content version'),
    passages,
    collections,
  };
}
export function flatten(group: Collection | Book | Week): string[] {
  if (group.passageIds) return [...new Set(group.passageIds)];
  if (group.weeks) return [...new Set(group.weeks.flatMap(flatten))];
  return [...new Set(('books' in group ? (group.books ?? []) : []).flatMap(flatten))];
}
export function findGroup(
  collection: Collection,
  id?: string,
): Collection | Book | Week | undefined {
  if (!id) return collection;
  for (const book of collection.books ?? []) {
    if (book.id === id) return book;
    const week = book.weeks?.find((w) => w.id === id);
    if (week) return week;
  }
  return collection.weeks?.find((w) => w.id === id);
}
