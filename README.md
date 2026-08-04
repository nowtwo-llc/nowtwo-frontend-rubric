# Frontend Rubric

[![CI](https://github.com/nowtwo-llc/nowtwo-frontend-rubric/actions/workflows/ci.yml/badge.svg)](https://github.com/nowtwo-llc/nowtwo-frontend-rubric/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A rubric editor for the browser. Criteria, weighted grading scales, standards alignment and
drag-to-reorder — rendered as form inputs inside your own form.

```bash
npm install @nowtwo-llc/frontend-rubric
```

## What it is

A rubric is a list of **criteria**. Each criterion carries a **grading scale** (levels worth
different point values), an optional set of aligned **standards**, and is worth its best
level. The editor maintains that structure, keeps the running total current, and writes the
whole thing into the surrounding form as named inputs.

It has **no save of its own**. The host page owns the form, the submit and the persistence —
which means adopting it is mostly a matter of reading the field names below.

[**Live demo →**](https://nowtwo-llc.github.io/nowtwo-frontend-rubric/)

## Use

```ts
import { RubricEditor } from '@nowtwo-llc/frontend-rubric';
import '@nowtwo-llc/frontend-rubric/style.css';

const editor = new RubricEditor({
    container: '#nt-rubric-app',
    criteria: window._criteria
});

editor.mount();
```

Via a script tag, the UMD build exposes `RubricEditor` as a global:

```html
<link rel="stylesheet" href="/dist/frontend-rubric.min.css" />
<script src="/dist/frontend-rubric.min.js"></script>
<script>
    new RubricEditor({ container: '#nt-rubric-app' }).mount();
</script>
```

The stylesheet is always a separate file — it is never inlined into the JavaScript, so you
must import it yourself. It carries **layout only**: the markup reuses your own `input`,
`button`, `dataList` and `inputGroup` classes so the editor inherits whatever theme is in
force.

## Options

| Option | Default | Purpose |
| --- | --- | --- |
| `container` | `'#nt-rubric-app'` | Element or selector to render into. Throws if a selector matches nothing. |
| `criteria` | `window._criteria`, then `[]` | Initial rubric. **Adopted, not copied** — edits land on the array you pass. |
| `standardsUrl` | `'/standards/select'` | Base path of the standards picker. |
| `fieldPrefix` | `'criteria'` | Prefix for every generated form field name. |
| `selectStandardEvent` | `'HE:StandardsTool:SelectStandard'` | Event the host dispatches when a standard is chosen. |
| `removeStandardEvent` | `'HE:StandardsTool:RemoveStandard'` | Event the host dispatches when a standard is cleared. |
| `host` | Bridge backed by `hostGlobal` | Host integration — see below. |
| `hostGlobal` | `'RubricHost'` | Name of the global carrying the host bridge. Ignored when `host` is passed. |

## API

| Member | Description |
| --- | --- |
| `mount()` | Renders the editor. Idempotent. |
| `destroy()` | Removes the DOM and every listener, including the `document` ones. |
| `criteria` | The live rubric array. |
| `totalPoints` | Sum of every criterion's best level. |
| `moveCriterion(from, to)` | Reorders a criterion, as a completed drag does. |
| `addStandard(index, standard)` | Aligns a standard, as the picker's select event does. |

## Form fields

The editor posts through your form, so these names are a contract with your server.

| Field | Shape |
| --- | --- |
| `criteria_hash[]` | One per criterion, in document order. Empty for a new criterion. |
| `criteria_name[]` | One per criterion |
| `criteria_description[]` | One per criterion |
| `criteria_<i>_level_hash[]` | Levels of criterion `i` |
| `criteria_<i>_level_points[]` | Levels of criterion `i` |
| `criteria_<i>_level_description[]` | Levels of criterion `i` |
| `criteria_<i>_standard_ids` | Comma-separated standard ids for criterion `i` |

Two shapes are in play and the difference matters. Criterion-level fields are plain arrays
paired up **by document order**. Level and standard fields embed the criterion's **index**,
which is what associates a scale with its criterion. Both stay consistent through deletes and
drags. Change `fieldPrefix` and every name above changes with it.

## Host integration

Everything page-specific goes through a single `HostBridge`:

```ts
interface HostBridge {
    icon(style: string, name: string): string;
    tooltipAttributes(): Record<string, string>;
    elementTooltipAttributes(targetId: string): Record<string, string>;
    activate(root: HTMLElement): void;
    loadOverlay(url: string, request: OverlayRequestOptions, display: OverlayDisplayOptions): void;
    hideTooltips(): void;
}
```

Pass one as the `host` option, or — for the `<script>` build, where you may not want to write
module code — define a global of the same shape and the editor will find it:

```html
<script>
    window.RubricHost = {
        icon: (style, name) => myIcons[name],
        loadOverlay: (url) => myModal.open(url)
    };
</script>
```

**Every member is optional.** Anything you leave out degrades to a no-op, so the editor still
renders and still posts correct form data on a page that provides nothing at all. Adopt the
pieces you need.

`example/host.js` is a complete worked bridge — icons, a standards picker and description
tooltips — and it is what lets the demo run the real bundle with no application framework
behind it.

Standards are chosen in a separate host-rendered overlay, which announces its result as
events on `document` rather than calling back into the editor. Both event names are
configurable.

## Data model

```ts
interface Criterion {
    hash: string;
    name: string;
    description: string;
    levels: { hash: string; points: number | string; description: string }[];
    standards: {
        standardId: number | string;
        standardGuid: string;
        standardDescription: string;
        standardNumberEnhanced: string;
    }[];
}
```

`points` admits both numbers and strings because both genuinely occur — a saved rubric
carries numbers, a text input hands back strings. Comparison and totalling always go through
a numeric parse, and a half-typed value scores as zero rather than breaking the total.

## Upgrading from 8.x

9.0 is a rewrite. The Vue 3 component is now dependency-light TypeScript, and the package is
published as `@nowtwo-llc/frontend-rubric` on npm.

**The host template must change.** The 8.x global initialiser no longer exists; construct the
editor directly instead:

```diff
-<div id="the-8x-container-id"></div>
-<script src="…/vendors-bundle.min.js"></script>
-<script src="…/the-8x-bundle.min.js"></script>
-<script>window.theOldGlobalInit();</script>
+<div id="nt-rubric-app"></div>
+<script src="…/frontend-rubric.min.js"></script>
+<script>new RubricEditor({ container: '#nt-rubric-app' }).mount();</script>
```

- **One file, not two.** The separate `vendors-bundle.min.js` is gone; the UMD build is
  self-contained.
- **Renamed artifacts.** The bundle and stylesheet are now `frontend-rubric.min.{js,css}`.
- **Renamed root element.** The container id is now `#nt-rubric-app`, configurable via
  `container`. The app's own root class is `.nt-rubric`.
- **Form field names are unchanged**, so no server-side change is required.
- `window._criteria` still works as the default data source.

## License

MIT © NowTwo LLC. See [LICENSE](LICENSE).
