# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frontend Rubric is a browser rubric editor: criteria, weighted grading scales, standards
alignment and drag-to-reorder. Standalone TypeScript with one runtime dependency
(SortableJS), owned by NowTwo LLC.

Published as `@nowtwo-llc/frontend-rubric` to the public npm registry (`registry.npmjs.org`).
That is the only registry it is published to — `publishConfig` carries `access: public` and
deliberately pins no registry.

This repo is being prepared to go public. All naming, metadata, copyright and documentation
must stay under NowTwo LLC. Earlier releases were published under a different scope on GitHub
Packages; do not reintroduce that scope, that registry, an `.npmrc`, or any reference to a
prior owner of this code — including in commit messages, comments and documentation. When
describing the 8.x → 9.0 migration, describe the change without naming what it moved from.

## Build & Development Commands

```bash
npm run build:dev       # Development UMD build → ./build
npm run build:prod      # UMD + ESM + CJS bundles and types → ./dist
npm run build:types     # Declarations only → ./dist/types
npm run watch           # Development build with file watching
npm test                # Vitest suite (jsdom)
npm run test:watch      # Vitest in watch mode
npm run test:coverage   # Vitest with coverage thresholds enforced
npm run typecheck       # tsc over the library and the tests
npm run lint            # oxlint + Prettier + Stylelint, with fixes
npm run lint:check      # same, no fixes — what CI runs
npm run demo            # Build, then serve the demo at http://localhost:5050
npm run clean           # Remove build/, dist/ and coverage/
```

## Architecture

This is a **form control, not an application**. It renders inputs into the host's form and
has no save, no fetch and no router. Three things follow from that, and they are the
constraints most likely to be broken by a well-meaning change.

### 1. Form field names are a wire contract

`src/dom/fieldNames.ts` is the single source of the naming scheme, and
`tests/unit/fieldNames.spec.ts` spells the literals out so a change has to break a test on
purpose. Two shapes are in play:

- **Criterion fields** (`criteria_hash[]`, `criteria_name[]`, `criteria_description[]`) are
  plain arrays the server pairs up **by document order**. DOM order is the source of truth.
- **Level and standard fields** (`criteria_<i>_level_points[]`, `criteria_<i>_standard_ids`)
  embed the criterion **index**, which is what associates a scale with its criterion.

Level fields are `[]` arrays *within* a criterion, so reordering a scale needs no renaming —
a level's three fields travel together inside its own node.

### 2. Never re-render what someone is typing into

Every mutation on `RubricState` reports how far the damage spreads, and `RubricEditor.apply()`
routes each to the narrowest render that covers it:

| `RubricChange` | Render |
| --- | --- |
| `list` | Rebuild every row (`renderList`) |
| `levels` | One row's scale (`renderLevels`) |
| `order` | Move one row's existing level nodes (`syncLevelOrder`) |
| `standards` | One row's standards strip (`renderStandards`) |
| `points` | Point readouts only |

Text edits (name, description, level description) report **nothing** — the DOM already shows
what was typed, so re-rendering would only move the caret.

The scale re-sorts on every keystroke in a point field. That is longstanding product
behaviour, deliberately preserved. It is safe here because `syncLevelOrder` *moves the
existing nodes* rather than rewriting values into fixed positions, so the field being typed
into travels with its own value. `preserveFocus` then restores the caret, because `append`
on an attached node detaches and reinserts it, which blurs it. The
"keeps the caret in the field being typed into" test guards this; if it starts failing,
something widened a patch.

### 3. Host coupling is confined to one interface

Nothing in `src/` may reference a host global, an icon set or a tooltip library except
`src/host/globalHost.ts`. Everything page-specific — icon markup, tooltip attributes,
activation, opening the standards picker, dismissing tooltips — goes through `HostBridge`.
`example/host.js` is the proof: it is what lets the demo run the real bundle with no
application framework behind it, so keep it working.

**This includes markup hooks.** Attributes that only mean something to a particular host's
JavaScript must come from `tooltipAttributes()` / `elementTooltipAttributes()`, never be
hardcoded in `CriterionRow`. A `title` is fine — that is native HTML and works everywhere.

`createGlobalHost` resolves the global on **every call** rather than capturing it once. The
bundle is routinely loaded before the host page finishes wiring itself up, so a reference
taken at module load would pin `undefined` for the life of the page. Every method degrades to
a no-op when its counterpart is missing, so the editor still renders and still posts correct
form data on a page that provides nothing.

Standards are chosen in a host-rendered overlay that cannot call back into the editor, so it
announces results as `HE:StandardsTool:SelectStandard` / `…:RemoveStandard` events on
`document`. `activeCriterion` remembers which row the picker was opened from, because those
events carry only the standard.

### Source layout

```
src/
  RubricEditor.ts        Public controller. The only module in tsconfig.types.json.
  bundle.ts              Webpack entry: CSS side-effect import + re-export.
  types.ts               Data model and the HostBridge contract.
  model/
    RubricState.ts       Owns the criteria array and every mutation to it.
    points.ts            toPoints / maxPoints / totalPoints / sortLevels / nextLevelPoints.
    factories.ts         New criterion and level shapes.
  dom/
    CriterionRow.ts      One row, built once and patched.
    fieldNames.ts        The form contract.
    element.ts           el() / html() / clear() / preserveFocus().
    layout.ts            Header, footer, empty state.
  host/
    globalHost.ts        The only file that reads a host global.
    standardsEvents.ts   The document-level picker events.
  sortable/reorder.ts    SortableJS binding — one call into moveCriterion().
```

`RubricState` **adopts** the array it is given rather than copying it: the host hands over
`window._criteria` and expects edits to land on that same object.

Row handlers resolve their index via `indexOf(row)` when they fire, never capture it at
render time. Rows outlive their original index — deleting or dragging one shifts everything
after it.

## Distribution

`package.json` ships four artifacts through an `exports` map:

| Condition | File |
| --- | --- |
| `import` | `dist/frontend-rubric.mjs` |
| `require` | `dist/frontend-rubric.cjs` |
| `types` | `dist/types/RubricEditor.d.ts` |
| `unpkg` / script tag | `dist/frontend-rubric.min.js` (UMD, exposes the `RubricEditor` global) |
| `./style.css` | `dist/frontend-rubric.css` |

The CSS is always a separate file — never inlined into the JavaScript, so consumers must
import the stylesheet themselves. It carries layout only; colour and control styling come
from the host page via classes the markup reuses (`input`, `button`, `dataList`,
`inputGroup`).

`dist/` and `build/` are gitignored. `prepublishOnly` rebuilds `dist/` so published output
always matches the tagged source.

## Build System

Webpack 5 with **esbuild-loader**. `webpack.config.js` exports a single UMD config in
development and an array of three (UMD, ESM, CJS) in production.

Things that are load-bearing and easy to break:

- **esbuild-loader, not ts-loader.** TypeScript 7 is the native Go port and exposes no JS
  compiler API, so ts-loader (which calls `createProgram`/`createLanguageService`) cannot run
  against it at all. esbuild only strips types — it never type-checks and never emits
  declarations.
- **ES2020 lives in three places** and they must move together: `target` in `tsconfig.json`,
  `target` on the esbuild-loader rule, and `BUILD_TARGET` in `webpack.config.js`. Webpack's
  runtime wrapper follows the last one, so a mismatch silently ships syntax the tsconfig
  promised not to.
- **The CJS config uses `src/RubricEditor.ts` as its entry, not `src/bundle.ts`.** Bundling
  the CSS import there pulls in webpack's automatic-publicPath runtime, which throws outside
  a browser and breaks `require()` at load time.
- **Declarations are emitted once** by `tsc -p tsconfig.types.json`. esbuild cannot produce
  them.
- **No vendor split.** SortableJS is bundled into the UMD build on purpose — the 8.x output
  had a separate `vendors-bundle.min.js` the host had to load alongside it, and collapsing
  that to one file is a deliberate part of 9.0. Do not reintroduce `splitChunks`.
- Cleaning is done by the npm scripts (`rm -rf`), not a webpack plugin — three configs
  writing to one directory would delete each other's output.

## TypeScript setup

Running **TypeScript 7** (the native Go port). Three configs:

- `tsconfig.json` — the library. ES2020 target, `bundler` resolution, strict. Covers `src`
  only.
- `tsconfig.test.json` — the tests and `vitest.config.mts`. Adds Node types and `noEmit`.
- `tsconfig.types.json` — declaration-only emit, rooted at `src/RubricEditor.ts`.

`tsc` does two jobs and both are required: `npm run typecheck` is the **only** type gate
(esbuild does not check types, so `npm run build` will happily bundle broken code), and
`npm run build:types` is the only source of `.d.ts` files.

**Vue is gone as of 9.0, and TypeScript 7 is why it stays gone.** `vue-tsc` cannot run
against the Go port — it resolves `typescript/lib/tsc`, which the native package does not
export, and dies with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Reintroducing an SFC would mean
either dropping to TypeScript 5/6 or shipping `.vue` files with no type checking at all.

## Testing

Vitest on jsdom. The suite imports from `src/`, so no build is needed to run tests.

Assertions are chai-style (`expect(x).to.equal(y)`), which Vitest supports natively since its
`expect` is built on chai. `no-unused-expressions` is disabled for `tests/**` because those
assertions are bare expressions.

`tests/setup.ts` installs a `RubricHost` global so the default bridge is exercised on its
real path;
`createMockHost()` is for tests that assert on host calls directly.

SortableJS is mocked in `tests/unit/reorder.spec.ts` — a real drag needs pointer events and
layout jsdom does not provide. The reorder *behaviour* is reachable without that, through
`RubricEditor.moveCriterion()`, which is exactly what the drag binding calls; that method
exists partly to keep the drag path testable.

Coverage thresholds in `vitest.config.mts` sit just under the current numbers. Raise them
when coverage climbs; never lower them to make a build pass.

## Code Style

- Prettier: 120 char width, 4-space indent, single quotes, no trailing commas, always arrow
  parens.
- **oxlint** (`.oxlintrc.json`) rather than ESLint. typescript-eslint hard-refuses
  TypeScript 7 at runtime, and ESLint's own parser cannot read TypeScript without it; oxlint
  parses TS natively in Rust. The trade-off is no type-aware rules — `strict` under `tsc`
  carries that weight now.
- Stylelint via `stylelint-prettier`. Stylelint 15/16 removed the stylistic rules; don't
  re-add rules like `media-feature-colon-space-after` — Prettier owns formatting.
- CSS is flat, plain CSS. The 8.x `main.scss` was nested SCSS; there is no preprocessor now
  and no reason to reintroduce one for a layout-only stylesheet.

## CI

- `ci.yml` — typecheck, lint, test with coverage, build, `npm pack --dry-run` on pushes and
  PRs to `main`.
- `publish.yml` — on `v*` tags. Verifies the tag matches `package.json`, then publishes to
  npm via OIDC trusted publishing (no token; needs `id-token: write`, Node >= 22.14.0 and
  npm >= 11.5.1, so it upgrades npm because setup-node ships 10.x).
- `pages.yml` — deploys `example/` plus `dist/` to GitHub Pages. The demo is served at
  `/example/` so its `../dist/...` paths resolve the same way they do locally.

Two things in the workflows are security controls, not style — do not "tidy" them away:

- **The npm job sets `environment: npm-publish`.** That environment carries required
  reviewers, so a `v*` tag queues a release for approval instead of publishing immediately.
  The name must stay identical to the Environment field on the npm trusted publisher; GitHub
  puts it in the OIDC claim and npm rejects a mismatch.
- **Every action is pinned to a full commit SHA** with the version in a trailing comment.
  Tags can be force-moved by a compromised action repo; SHAs cannot. Dependabot updates the
  pins. Never replace a SHA with `@v5` to make a diff cleaner.

## Host template migration (8.x → 9.0)

The host template must change; the 8.x global initialiser no longer exists and the container
id is now `#nt-rubric-app`. Form field names are unchanged, so no server-side change is
required. See the "Upgrading from 8.x" section of README.md for the exact diff.

A host that previously relied on the built-in integration now supplies it: define a
`window.RubricHost` object (icons, `loadOverlay`, and the tooltip attributes its own
JavaScript looks for) before mounting. `example/host.js` is a complete worked example.
