# Verse Warrior

Verse Warrior is a quiet, mobile-first Bible memorization app. It helps a learner study a passage, remove help gradually, recall its words and reference, and return for spaced review.

It is a static React, TypeScript, and Vite application for GitHub Pages. There is no backend, account system, Bible API, or automatic cross-device sync.

## Current content

The bundled catalog is version `1.0.1` and contains 15 passages in the **Every Man a Warrior** collection, grouped into Book 1 and Book 2. The application is not coupled to that course: the catalog also supports flat collections, weeks, books with weeks, shared passages, and separate translations.

Content lives in [src/content/catalog.json](src/content/catalog.json). See [the authoring guide](docs/content-authoring.md) before changing it. Stable passage IDs preserve local learner progress when content is reordered or corrected.

## Development

Use Node 24 LTS and npm. The supported Node range is recorded in `package.json`; `package-lock.json` locks dependencies.

```sh
npm ci
npm run dev
```

Vite serves the app under `/verse-warrior/`. Open the local URL it prints, including that path.

## Checks

```sh
npm run check                 # lint, unit/component tests, content validation, typecheck, build
npx playwright install chromium webkit
npm run test:e2e              # Chromium desktop and mobile WebKit workflows
npm run preview               # serve the production build
```

End-to-end tests build a separate `dist-test` from synthetic, non-Scripture fixtures and serve it on port 4173. Production builds do not include those fixtures. To inspect that test build manually, run `npm run build:e2e`, then `npm run preview:e2e`.

## How it works

- **Today** has one main action: it opens due review first, then resumes the newest unfinished passage in the selected learning focus, then offers the next new passage.
- **Collections** can be activated or paused independently. Pausing removes a collection from the review queue but retains its dates and progress.
- **Practice** offers reading, progressive word hiding, first-letter hints, typed recall, and standalone reference practice. Extra practice never changes the word-review schedule.
- Opening a learning exercise marks a passage as Learning. Selecting **Ready to review** begins an initial recall; submitting that rating schedules tomorrow's review without mastery credit.
- Scheduled word reviews use 1, 3, 7, 14, 30, and 60-day intervals. Remembered advances one step, Needed help moves back one, and Forgot returns to one day.
- Word mastery requires three consecutive successful scheduled reviews, including a completed interval of at least seven days. A Needed help or Forgot rating removes mastery; reviews continue afterward.
- A review session contains up to five word-recall cards, followed by up to two reference cards for passages whose words were not shown in that session or reviewed earlier that day. Reference recall has its own three-success **solid** signal and does not affect word mastery or scheduling.
- In word-hint and first-letter exercises, Space or Right Arrow reveals the next concealed word. During review, Space or Enter reveals an answer and advances after a rating. Word cards use `1`, `2`, and `3` for Remembered, Needed help, and Forgot. Reference cards use `1` and `2`. Shortcuts do not apply while the learner is typing.

## Progress, backup, and privacy

Progress is stored only in this browser under the versioned `verse-warrior:state` localStorage key. It includes active collections, learning focus, word-review records, and reference-recall records. Scripture text, typed attempts, hint patterns, and complete review history are not stored there.

Due dates use local calendar dates. Recorded actions use UTC timestamps. Browser focus, visibility changes, cross-tab storage changes, and midnight refresh the displayed schedule.

Settings can export a JSON backup and restore a validated backup after confirmation. Restoring replaces the current Verse Warrior state. Unknown passage IDs are retained as dormant data, so a later catalog can make them available again. If storage is unavailable or data is malformed, the session remains usable and Settings offers recovery or export options.

Browser progress normally survives restarts, but clearing site data or ending a private-browsing session can remove it. Use backups before changing browsers or devices. Modern browsers use Web Locks and per-record signatures to prevent stale ratings across tabs.

## Deployment

The [GitHub Actions workflow](.github/workflows/ci.yml) runs checks and browser tests on pull requests and `main`. Successful `main` builds deploy `dist` to GitHub Pages. Vite uses `/verse-warrior/` as its base and HashRouter keeps bookmarked routes compatible with static hosting.

Before a release:

1. Verify the catalog's wording, translation labels, attribution, ordering, and passage IDs.
2. Confirm the repository is public if using GitHub Free hosting.
3. In GitHub, set **Settings > Pages > Build and deployment > Source** to **GitHub Actions**.
4. Push `main`, confirm the workflow succeeds, and open `https://koolkat254.github.io/verse-warrior/`.
5. Smoke-test a bookmarked hash route, local progress after reload, a review rating, and backup restore.
6. Test on a real mobile browser. Automated WebKit coverage does not replace a device check.

## Project structure

- `src/content`: bundled catalog.
- `src/domain`: content validation, scheduling, state transitions, dates, and text comparison.
- `src/state`: localStorage adapter and React state context.
- `src/components` and `src/pages`: responsive application UI and exercises.
- `tests`: domain, storage, interaction, and Playwright browser coverage.

## Next version

PWA installation and reliable offline startup are next. That work will add a manifest, installation assets, service-worker caching for the application and catalog, and an update prompt that waits for practice to finish. Custom collection creation/import follows later.
