import { CriterionRow } from './dom/CriterionRow';
import { el } from './dom/element';
import { buildEmptyState, buildFooter, buildHeader, type Footer } from './dom/layout';
import { createGlobalHost } from './host/globalHost';
import { bindStandardsEvents, DEFAULT_STANDARDS_EVENTS } from './host/standardsEvents';
import { RubricState, type RubricChange } from './model/RubricState';
import { bindReorder, type ReorderBinding } from './sortable/reorder';
import type { Criterion, HostBridge, RubricEditorOptions, Standard } from './types';

export type {
    Criterion,
    HostBridge,
    Level,
    OverlayDisplayOptions,
    OverlayRequestOptions,
    PointValue,
    RubricEditorOptions,
    Standard
} from './types';

export const DEFAULT_CONTAINER = '#nt-rubric-app';
export const DEFAULT_STANDARDS_URL = '/standards/select';
export const DEFAULT_FIELD_PREFIX = 'criteria';
export const ROOT_CLASS = 'nt-rubric';

/**
 * A rubric editor.
 *
 * The editor renders form inputs into a container inside the host's own form
 * and has no save of its own — the host posts the fields. See
 * `dom/fieldNames.ts` for that contract.
 *
 * ```ts
 * const editor = new RubricEditor({ container: '#nt-rubric-app' });
 * editor.mount();
 * ```
 */
export class RubricEditor {
    private readonly options: RubricEditorOptions;

    private readonly host: HostBridge;

    private readonly state: RubricState;

    private readonly standardsUrl: string;

    private readonly prefix: string;

    private container: HTMLElement | null = null;

    private root: HTMLElement | null = null;

    private list: HTMLElement | null = null;

    private footer: Footer | null = null;

    private rows: CriterionRow[] = [];

    private reorder: ReorderBinding | null = null;

    private detachStandards: (() => void) | null = null;

    private unsubscribe: (() => void) | null = null;

    /**
     * Which row the standards picker was opened from.
     *
     * The picker is an overlay outside this component and its events carry only
     * the chosen standard, so the editor has to remember where to put it.
     */
    private activeCriterion = 0;

    constructor(options: RubricEditorOptions = {}) {
        this.options = options;
        this.host = options.host ?? createGlobalHost(options.hostGlobal);
        this.standardsUrl = options.standardsUrl ?? DEFAULT_STANDARDS_URL;
        this.prefix = options.fieldPrefix ?? DEFAULT_FIELD_PREFIX;
        this.state = new RubricState(options.criteria ?? window._criteria ?? []);
    }

    /** The live rubric. Mutations made through the editor land on this array. */
    get criteria(): Criterion[] {
        return this.state.all();
    }

    get totalPoints(): number {
        return this.state.total();
    }

    mount(): this {
        if (this.root) {
            return this;
        }

        this.container = this.resolveContainer();
        this.root = el('div', { class: ROOT_CLASS });

        this.list = el('div', { class: 'criteria-list' });
        this.footer = buildFooter(this.host, () => this.state.addCriterion());

        this.root.append(buildHeader(), this.list, this.footer.element);
        this.container.append(this.root);

        this.renderList();

        this.reorder = bindReorder(this.list, (from, to) => this.moveCriterion(from, to));

        this.detachStandards = bindStandardsEvents(
            {
                select: this.options.selectStandardEvent ?? DEFAULT_STANDARDS_EVENTS.select,
                remove: this.options.removeStandardEvent ?? DEFAULT_STANDARDS_EVENTS.remove
            },
            {
                onSelect: (standard) => this.state.addStandard(this.activeCriterion, standard),
                onRemove: (standardId) => this.state.removeStandard(this.activeCriterion, standardId)
            }
        );

        this.unsubscribe = this.state.subscribe((change) => this.apply(change));

        return this;
    }

    /**
     * Removes the editor's DOM and every listener it registered.
     *
     * The standards listeners live on `document`, so skipping this leaks them:
     * a second mount would then apply each chosen standard once per stale
     * listener.
     */
    destroy(): void {
        this.reorder?.destroy();
        this.detachStandards?.();
        this.unsubscribe?.();
        this.root?.remove();

        this.reorder = null;
        this.detachStandards = null;
        this.unsubscribe = null;
        this.root = null;
        this.list = null;
        this.footer = null;
        this.rows = [];
        this.container = null;
    }

    private resolveContainer(): HTMLElement {
        const target = this.options.container ?? DEFAULT_CONTAINER;

        if (target instanceof HTMLElement) {
            return target;
        }

        const found = document.querySelector<HTMLElement>(target);
        if (!found) {
            throw new Error(`RubricEditor cannot find its container element: ${target}`);
        }

        return found;
    }

    /**
     * Routes a state change to the narrowest render that covers it. Anything
     * broader than necessary would rebuild inputs out from under the caret.
     */
    private apply(change: RubricChange): void {
        switch (change.type) {
            case 'list':
                this.renderList();
                break;
            case 'levels':
                this.rows[change.index]?.renderLevels();
                this.refreshPoints();
                this.activate();
                break;
            case 'order':
                this.rows[change.index]?.syncLevelOrder();
                this.refreshPoints();
                break;
            case 'standards':
                this.rows[change.index]?.renderStandards();
                this.activate();
                break;
            case 'points':
                this.refreshPoints();
                break;
            default:
                break;
        }
    }

    private renderList(): void {
        if (!this.list) {
            return;
        }

        this.list.replaceChildren();
        this.rows = [];

        if (!this.state.count()) {
            this.list.append(buildEmptyState());
            this.refreshPoints();
            this.activate();

            return;
        }

        this.state.all().forEach((criterion, index) => {
            const row = new CriterionRow({
                criterion,
                index,
                prefix: this.prefix,
                host: this.host,
                callbacks: {
                    onRemove: () => this.state.removeCriterion(this.indexOf(row)),
                    onNameInput: (value) => this.state.setName(this.indexOf(row), value),
                    onDescriptionInput: (value) => this.state.setDescription(this.indexOf(row), value),
                    onAddLevel: () => this.state.addLevel(this.indexOf(row)),
                    onRemoveLevel: (levelIndex) => this.state.removeLevel(this.indexOf(row), levelIndex),
                    onLevelPointsInput: (levelIndex, value) =>
                        this.state.setLevelPoints(this.indexOf(row), levelIndex, value),
                    onLevelDescriptionInput: (levelIndex, value) =>
                        this.state.setLevelDescription(this.indexOf(row), levelIndex, value),
                    onAddStandard: () => this.openStandardsPicker(this.indexOf(row)),
                    onRemoveStandard: (standardId) => this.removeStandard(this.indexOf(row), standardId)
                }
            });

            this.rows.push(row);
            this.list?.append(row.element);
        });

        this.refreshPoints();
        this.activate();
    }

    /**
     * A row's position is looked up when a handler fires, not captured when it
     * is wired. Rows outlive their original index — deleting or dragging one
     * shifts every row after it — so a captured index would address the wrong
     * criterion after the first reorder.
     */
    private indexOf(row: CriterionRow): number {
        return this.rows.indexOf(row);
    }

    private refreshPoints(): void {
        this.rows.forEach((row, index) => row.updatePoints(this.state.maxFor(index)));
        this.footer?.setTotal(this.state.total());
    }

    /** Lets the host wire up tooltips on nodes that were just inserted. */
    private activate(): void {
        if (this.root) {
            this.host.activate(this.root);
        }
    }

    private openStandardsPicker(index: number): void {
        this.activeCriterion = index;

        this.host.loadOverlay(
            this.standardsPickerUrl(index),
            { cache: false },
            {
                className: 'overlay-xlarge-fullHeight'
            }
        );
    }

    /**
     * The picker needs the already-chosen ids so it can show them as selected
     * and dispatch a remove event when one is cleared.
     */
    standardsPickerUrl(index: number): string {
        return `${this.standardsUrl}?selected_standard_ids=${this.state.standardIds(index)}`;
    }

    private removeStandard(index: number, standardId: number | string): void {
        this.state.removeStandard(index, standardId);
        // The removed chip owned an open tooltip; without this it is orphaned
        // on screen with nothing under it.
        this.host.hideTooltips();
    }

    /** Adds a standard to a row directly, as the picker's select event does. */
    addStandard(index: number, standard: Standard): void {
        this.state.addStandard(index, standard);
    }

    /**
     * Moves a criterion, as a completed drag does.
     *
     * The drag binding is deliberately a one-line call to this rather than
     * holding reorder logic of its own, so the behaviour is reachable without
     * synthesising pointer events.
     */
    moveCriterion(from: number, to: number): void {
        this.state.moveCriterion(from, to);
    }
}
