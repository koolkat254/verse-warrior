# Verse Warrior

A quiet, mobile-first Bible memorization app. Learn passages with full-text study, progressive word hiding, first-letter hints, typed recall, and reference practice. Return for self-rated spaced reviews that build lasting memory.

React · TypeScript · Vite · GitHub Pages. No backend, accounts, or Bible API.

## Development

Use **Node 24 LTS** and npm. `.nvmrc` records the Node major; `package-lock.json` locks dependencies.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including `/verse-warrior/`. The production catalog is intentionally empty until the maintainer supplies launch content. No test wording or third-party Scripture is bundled by default.

In the current Windows workspace, a portable Node runtime is available in the ignored `.tools/node-v24.21.0-win-x64` directory. If Node is not on PATH, enable it for the current PowerShell session:

```powershell
$env:PATH = "$PWD\.tools\node-v24.21.0-win-x64;$env:PATH"
npm.cmd run dev
```

## Checks

```sh
npm run check                 # Lint, tests, content validation, typecheck, build
npx playwright install chromium webkit
npm run test:e2e              # Chromium desktop and WebKit mobile workflows
npm run preview              # Serve the normal production build
```

End-to-end tests build a separate `dist-test` using synthetic, non-Scripture fixtures and start a server on port 4173. Production builds exclude fixtures. To inspect the fixture experience manually, run `npm run build:e2e`, then `npm run preview:e2e`.

On the current Windows workspace, if browsers were installed locally, set `$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.tools\playwright"` before end-to-end commands.

## Content

Edit `src/content/catalog.json`. See [the content authoring guide](docs/content-authoring.md) for the schema, examples, ID rules, and validation. The maintainer supplies exact references, text, translation labels, and applicable attribution. Different translations may coexist as separate passage IDs.

## Product behavior

- Today combines due reviews from all active collections; a separate learning focus chooses the next new passage.
- Collections can be flat, organized into weeks, or organized into books with optional weeks. Nothing is locked to a calendar or course brand.
- Practice tools are optional and never automatically award mastery.
- “Ready to review” requires an initial recall rating and schedules tomorrow. Subsequent reviews use 1, 3, 7, 14, 30, and 60-day intervals.
- Remembered advances one interval; Needed help moves back one; Forgot resets to one day.
- Mastery requires three consecutive successful scheduled reviews, including an interval of at least seven days. Either unsuccessful rating removes mastery. Reviews continue after mastery.
- Pausing preserves dates. Identical passage IDs share progress across collections.

## Progress and recovery

The versioned `verse-warrior:state` localStorage document contains active collection IDs, learning focus, and progress keyed by passage ID. Scripture, typed drafts, hints, and review history are not copied into storage. Dates are local calendar dates; event timestamps are UTC.

Settings exports progress as JSON. Restore validates and previews the complete backup, then replaces current progress only after confirmation. Unknown passage IDs remain dormant. Invalid stored data is protected and can be downloaded verbatim before recovery; write failures keep the session usable with a visible warning.

Browser progress normally survives restarts, but clearing site data or ending a private browsing session can remove it. There is no automatic device sync. Modern browsers use Web Locks to serialize writes across tabs, with review signatures to reject stale submissions. Browsers without Web Locks detect already-persisted changes but cannot guarantee atomic simultaneous writes; current Chromium and WebKit are tested targets.

## Deployment

`.github/workflows/ci.yml` checks pull requests and main-branch pushes. Successful main builds publish `dist` through GitHub Pages. Vite uses `/verse-warrior/` as its base; HashRouter supports bookmarked routes on static hosting.

Before the first public release:

1. Supply and verify the launch catalog, including text and attribution.
2. Confirm the repository is public if using GitHub Free. Do not change visibility implicitly.
3. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
4. Push to `main` and confirm checks and deployment pass.
5. Open `https://koolkat254.github.io/verse-warrior/`; test a bookmarked passage URL, reload, review persistence, and backup restore.
6. Test on a real mobile browser. Automated WebKit emulation does not replace a physical-device check.

Local development commands do not deploy or change repository visibility. Real launch content, hosted smoke testing, and a physical-device check remain release requirements.

## Structure

- `src/domain`: validation, types, dates, scheduling, state transitions, word comparison.
- `src/state`: persistent store and React context; exercise drafts stay in component memory.
- `src/components`, `src/pages`: responsive UI, learning, review, and backup controls.
- `tests`: domain/storage tests, interaction tests, fixtures, browser workflows.

## Next version

PWA installation and reliable offline startup are deferred. The next milestone adds a manifest, icons, service-worker caching for app and catalog, and an update prompt that waits until practice ends. Custom collections follow later. Version 1 has no streaks, historical charts, notifications, authentication, or backend services.


