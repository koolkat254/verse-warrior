# Authoring Verse Warrior collections

The production content source is `src/content/catalog.json`, imported at build time. Edit it, run `npm run validate:content`, then run full checks before publishing.

The initial file is empty by agreement. Supply your exact wording, references, translation labels, and applicable attribution. Do not copy test fixtures into production.

## Minimal shape

This is a **format example**, not Scripture or recommended launch content:

```json
{
  "schemaVersion": 1,
  "contentVersion": "1.0.1",
  "passages": [
    {
      "id": "your-passage-id",
      "reference": "Book chapter:verse–verse",
      "text": "Your exact supplied passage text.\nA second paragraph if needed.",
      "translation": "Your translation label",
      "attribution": "Applicable attribution, if any."
    }
  ],
  "collections": [
    {
      "id": "discipleship",
      "title": "Discipleship",
      "description": "A brief introduction to this collection.",
      "passageIds": ["your-passage-id"]
    }
  ]
}
```

`attribution` and collection `description` are optional. Use plain text; HTML and Markdown are not interpreted. Newlines use JSON's `\n` escape. There is no Bible API, reference parser, or automatic translation substitution.

## Organization

A collection has exactly one of `passageIds`, `weeks`, or `books`. A book has exactly one of `passageIds` or `weeks`. A week always has `passageIds`. Each group has an `id` and `title`. Arrays determine display and learning order.

For a weeks-only collection, replace `passageIds` with:

```json
"weeks": [
  { "id": "week-1", "title": "Week 1", "passageIds": ["your-passage-id"] }
]
```

For a course with books and weeks, use:

```json
"books": [
  {
    "id": "book-1",
    "title": "Book 1",
    "weeks": [
      { "id": "book-1-week-1", "title": "Week 1", "passageIds": ["your-passage-id"] }
    ]
  }
]
```

Groups may be empty while preparing content. Multi-verse selections remain one item with one schedule. To practice smaller selections separately, author separate passage items explicitly.

## Stable IDs protect progress

- IDs use lowercase ASCII letters, numbers, hyphens, and underscores; begin with a letter or number. Reserved object-property names are rejected.
- Passage and collection IDs are unique across the catalog. Group IDs are unique within their collection, including across books.
- Every `passageIds` entry references a defined passage. Duplicate IDs within a single passage list are rejected.
- Reuse a passage ID across groups or collections when the memorization item is shared. Queues and totals deduplicate it.
- Different translations, excerpts, or substantial wording changes need a **new passage ID**. Never recycle an ID for unrelated material.
- Corrections preserve the item's ID and learner progress. Reordering or renaming groups also preserves progress.
- Removed items retain local progress as dormant data. Restoring their ID makes that progress available again.
- Increase `contentVersion` for published changes. It is informational for backup compatibility and does not reset progress.

## Before launch

Confirm references match supplied wording and translations, paragraph breaks are intentional, and attribution is accurate. Verify book/week ordering and shared IDs. Run `npm run check`, then inspect the collection and learning tools locally. Validation catches structural problems; the maintainer verifies Scripture accuracy.
