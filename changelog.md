# Change Log

This project follows [semantic versioning](https://semver.org/).

## v9.0.0

The modernization release: the component is rewritten in TypeScript, the package
is renamed, and the repository is public.

Earlier releases were published under a different scope on GitHub Packages and
are not covered here.

### Breaking

- **Renamed to `@nowtwo-llc/frontend-rubric`** and **published to npmjs.com**.
  Installing no longer requires a registry mapping or an auth token.
- **Rewritten as dependency-light TypeScript.** Vue 3, `sortablejs-vue3` and
  `mitt` are gone; SortableJS is the only runtime dependency. The unused
  `WindowPlugin` event bus went with them.
- **There is no global initialiser.** Construct the editor instead:

  ```diff
  -<script>window.theOldGlobalInit();</script>
  +<script>new RubricEditor({ container: '#nt-rubric-app' }).mount();</script>
  ```

- **One bundle, not two.** The separate `vendors-bundle.min.js` is gone — the
  UMD build is self-contained, so host templates load a single file.
- **Renamed artifacts.** The bundle and stylesheet are now
  `frontend-rubric.min.{js,css}`.
- **Renamed root element.** The container id is `#nt-rubric-app`, configurable
  via the `container` option. The app's own root class is `.nt-rubric`.
- **Host integration goes through a `HostBridge`.** Nothing in the library
  reaches for a host global any more. Define `window.RubricHost`, or pass a
  `host` option. Every member is optional and anything omitted degrades to a
  no-op — but with no bridge at all, icons render empty and the standards
  picker does nothing. `example/host.js` is a complete worked bridge.
- **The drag grip is a `<button>`,** not a `<span>`, so that reordering can be
  driven from the keyboard.
- **`dist/` is no longer committed.** It is built on publish.
- Requires Node 22 to build and test. There is no Node requirement to *use* the
  library.

**Form field names are unchanged**, so no server-side change is required.

### Added

- **`onChange` option and a bubbling `nt-rubric:change` event.** Both fire on
  every edit, including individual keystrokes, so a host can mark its form
  dirty, warn on unsaved navigation or live-validate. Neither fires on mount,
  and neither is debounced — only the host knows what delay its UI wants.
- **`validate()`**, returning `{ valid, problems }`. Codes: `empty-rubric`,
  `criterion-without-name`, `criterion-without-levels` and
  `level-points-not-numeric`, each carrying `criterionIndex` and, where
  relevant, `levelIndex`. The editor reports rather than blocks; half-finished
  state is normal while someone is still working.
- **Keyboard reordering.** Focus the grip and use <kbd>↑</kbd>/<kbd>↓</kbd>, or
  <kbd>Home</kbd>/<kbd>End</kbd> to send a criterion to either end. Focus
  follows the row so reordering can continue. Pointer dragging is unchanged.
- **`moveCriterion(from, to)`** on the instance API, which is also what the drag
  binding calls.
- `standardsPickerUrl(index)` and `addStandard(index, standard)`.
- `hostGlobal`, `fieldPrefix`, `standardsUrl`, `selectStandardEvent` and
  `removeStandardEvent` options — the previously hardcoded integration points.
- **`HostBridge.icon()` may return a `Node`,** not only an HTML string. The node
  is cloned and inserted as-is, so nothing is parsed as markup.
- **`HostBridge.renderStandardDescription()`**, an optional hook for taking
  control of how a standard's description is rendered. Return a `Node` or plain
  text and nothing is HTML-parsed.
- ESM and CJS builds alongside UMD, with generated type declarations and an
  `exports` map.

### Fixed

- **Accessibility.** Every input now has a real `<label>`; icon-only buttons
  carry `aria-label`, and remove-standard buttons name the standard they remove.
  Criteria expose `role="list"`/`listitem`, the running total is an `aria-live`
  region, and both empty states are `role="status"`. Standard chips use
  `aria-describedby`, so the description reaches a screen reader even with no
  host tooltip library. Reordering no longer requires a mouse.
- **Re-sorting a grading scale no longer swaps values under the caret.** Editing
  a point value moves the level's own node rather than rewriting values into
  fixed positions, and the caret is preserved, so the field being typed into
  keeps its value and its selection.
- **Grading scales sort numerically.** A scale loaded with string point values
  (`'10'`, `'5'`, `'1'`) previously sorted lexicographically.
- **Adding a level picks the next value numerically.** It previously compared
  raw values, so string points could produce the wrong starting point.
- **`destroy()` removes the `document`-level standards listeners.** They
  previously leaked for the lifetime of the page, so a re-mounted editor applied
  each chosen standard once per stale listener.
- Row actions resolve their criterion when clicked rather than capturing it at
  render time, so deleting or dragging a row no longer shifts what the buttons
  below it act on.

### Changed

- Styling is plain CSS instead of SCSS, and carries layout only — colour and
  control styling continue to come from the host page.
- Tooling moved to oxlint, Prettier, Stylelint, Vitest and esbuild-loader, with
  coverage thresholds enforced in CI.
- Releases publish from CI via npm trusted publishing (OIDC) and carry build
  provenance, verifiable with `npm audit signatures`.
