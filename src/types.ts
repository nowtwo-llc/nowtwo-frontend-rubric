/**
 * The rubric data model, plus the seams the editor uses to talk to its host
 * page. Everything here is either persisted by the host or supplied by it, so
 * treat the shapes as a contract rather than an implementation detail.
 */

/**
 * Point values arrive from two places with two different types: the host's
 * saved rubric (numbers) and the editor's own text inputs (strings). Rather
 * than coercing at the boundary and lying about one of them, the model admits
 * both and `toPoints()` is the single place that resolves it.
 */
export type PointValue = number | string;

export interface Standard {
    standardId: number | string;
    standardGuid: string;
    standardDescription: string;
    standardNumberEnhanced: string;
}

export interface Level {
    hash: string;
    points: PointValue;
    description: string;
}

export interface Criterion {
    hash: string;
    name: string;
    description: string;
    levels: Level[];
    standards: Standard[];
}

export interface OverlayRequestOptions {
    cache?: boolean;
}

export interface OverlayDisplayOptions {
    className?: string;
}

/**
 * Everything the editor needs from the page it is embedded in.
 *
 * This is the only seam between the editor and its host. Nothing else in the
 * library may reach for a global, an icon set or a tooltip library — which is
 * what lets the same bundle run in any host, and what lets the demo run it with
 * no host framework at all.
 *
 * The default implementation reads a global object of this shape; see
 * `host/globalHost.ts`.
 */
export interface HostBridge {
    /**
     * Returns an icon.
     *
     * Return a `Node` to avoid HTML parsing altogether — it is cloned and
     * inserted as-is. A returned **string is parsed as HTML** and must
     * therefore be trusted. Prefer the node form where you can.
     */
    icon(style: string, name: string): string | Node;
    /**
     * Renders a standard's description, which comes from the host's standards
     * library and may carry authored formatting.
     *
     * Omit it and the description is parsed as HTML, which is the historical
     * behaviour. Implement it to take control: return a `Node` you built or
     * sanitised, or a plain string of text, and nothing is HTML-parsed. Worth
     * doing if any part of your standards library is user-supplied.
     */
    renderStandardDescription?(description: string): string | Node;
    /**
     * Extra attributes for a control that already carries a `title`, letting the
     * host upgrade it from a native tooltip to a styled one. Return `{}` to keep
     * the native behaviour.
     */
    tooltipAttributes(): Record<string, string>;
    /**
     * Extra attributes for an element whose tooltip content lives in a separate
     * hidden node, identified by `targetId`. Used for standard descriptions,
     * which are too long for a `title`.
     */
    elementTooltipAttributes(targetId: string): Record<string, string>;
    /** Called after nodes are inserted so the host can activate them. */
    activate(root: HTMLElement): void;
    /** Opens the standards picker. */
    loadOverlay(url: string, request: OverlayRequestOptions, display: OverlayDisplayOptions): void;
    /** Dismisses any open tooltip, e.g. one attached to a node about to be removed. */
    hideTooltips(): void;
}

export interface RubricEditorOptions {
    /** Element or selector to render into. Defaults to `#nt-rubric-app`. */
    container?: string | HTMLElement;
    /** Initial rubric. Defaults to `window._criteria`, then to an empty rubric. */
    criteria?: Criterion[];
    /** Base path of the standards picker. Defaults to `/standards/select`. */
    standardsUrl?: string;
    /**
     * Prefix for every generated form field name. Defaults to `criteria`,
     * which is what the host form expects — see `dom/fieldNames.ts`.
     */
    fieldPrefix?: string;
    /** Event the host dispatches when a standard is chosen. */
    selectStandardEvent?: string;
    /** Event the host dispatches when a standard is cleared. */
    removeStandardEvent?: string;
    /** Host integration. Defaults to a bridge backed by the `hostGlobal` object. */
    host?: HostBridge;
    /**
     * Name of the global carrying the host bridge. Defaults to `RubricHost`.
     * Ignored when `host` is supplied directly.
     */
    hostGlobal?: string;
    /**
     * Called after every change to the rubric, including individual keystrokes
     * in a name, description or point field.
     *
     * This is how a host marks its form dirty, warns on unsaved navigation or
     * live-validates. It is deliberately chatty rather than debounced: only the
     * host knows what an appropriate settling delay is for its own UI.
     */
    onChange?: (criteria: Criterion[], editor: RubricEditorLike) => void;
}

/**
 * The part of the editor handed to `onChange`. Typed structurally so `types.ts`
 * stays free of an import cycle back to `RubricEditor.ts`.
 */
export interface RubricEditorLike {
    readonly criteria: Criterion[];
    readonly totalPoints: number;
    validate(): ValidationResult;
}

export type ProblemCode =
    /** The rubric has no criteria at all. */
    | 'empty-rubric'
    /** A criterion has no grading levels, so it can never be scored. */
    | 'criterion-without-levels'
    /** A criterion has no name. */
    | 'criterion-without-name'
    /** A level's point value is not a number. */
    | 'level-points-not-numeric';

export interface ValidationProblem {
    code: ProblemCode;
    /** Human-readable, safe to show to the person editing the rubric. */
    message: string;
    /** Index of the criterion at fault, when the problem is scoped to one. */
    criterionIndex?: number;
    /** Index of the level at fault, when the problem is scoped to one. */
    levelIndex?: number;
}

export interface ValidationResult {
    valid: boolean;
    problems: ValidationProblem[];
}

declare global {
    interface Window {
        /** Populated by the host template before the editor is constructed. */
        _criteria?: Criterion[];
    }
}
