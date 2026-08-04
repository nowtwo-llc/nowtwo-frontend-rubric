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
    /** Returns icon markup. The result is inserted as HTML, so it must be trusted. */
    icon(style: string, name: string): string;
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
}

declare global {
    interface Window {
        /** Populated by the host template before the editor is constructed. */
        _criteria?: Criterion[];
    }
}
