import type { Criterion, HostBridge, Level, Standard } from '../types';
import { clear, el, html, preserveFocus } from './element';
import { criterionFields, levelFields, standardIdsField, standardTooltipId } from './fieldNames';

export const DRAG_HANDLE_CLASS = 'criteria-container--drag-handle';

export interface CriterionRowCallbacks {
    onRemove(): void;
    onNameInput(value: string): void;
    onDescriptionInput(value: string): void;
    onAddLevel(): void;
    onRemoveLevel(levelIndex: number): void;
    onLevelPointsInput(levelIndex: number, value: string): void;
    onLevelDescriptionInput(levelIndex: number, value: string): void;
    onAddStandard(): void;
    onRemoveStandard(standardId: number | string): void;
}

export interface CriterionRowConfig {
    criterion: Criterion;
    index: number;
    prefix: string;
    host: HostBridge;
    callbacks: CriterionRowCallbacks;
}

/**
 * One criterion: its name and description, its grading scale, its aligned
 * standards and its point total.
 *
 * The row is built once and then patched. It never rebuilds the criterion's own
 * name/description inputs, because those are what someone is usually typing
 * into — only the scale, the standards and the point readout are re-rendered,
 * and each of those has a method that touches nothing else.
 */
export class CriterionRow {
    readonly element: HTMLElement;

    private index: number;

    private readonly criterion: Criterion;

    private readonly prefix: string;

    private readonly host: HostBridge;

    private readonly callbacks: CriterionRowCallbacks;

    private readonly hashField: HTMLInputElement;

    private readonly levelsContainer: HTMLElement;

    private readonly standardsContainer: HTMLElement;

    private readonly standardIdsField: HTMLInputElement;

    private readonly pointsReadout: HTMLElement;

    private readonly nameField: HTMLInputElement;

    private readonly descriptionField: HTMLTextAreaElement;

    /**
     * Maps a level in the model to the node rendering it, so a re-sort can move
     * the existing nodes instead of rebuilding the scale. Weak so that removed
     * levels do not pin their nodes.
     */
    private readonly levelNodes = new WeakMap<Level, HTMLElement>();

    constructor({ criterion, index, prefix, host, callbacks }: CriterionRowConfig) {
        this.criterion = criterion;
        this.index = index;
        this.prefix = prefix;
        this.host = host;
        this.callbacks = callbacks;

        const fields = criterionFields(prefix);

        this.hashField = el('input', { type: 'hidden', name: fields.hash, value: criterion.hash });

        this.nameField = el('input', {
            type: 'text',
            class: 'input',
            name: fields.name,
            placeholder: 'Criteria name',
            value: criterion.name
        });
        this.nameField.addEventListener('input', () => this.callbacks.onNameInput(this.nameField.value));

        this.descriptionField = el('textarea', {
            class: 'input',
            name: fields.description,
            placeholder: 'Criteria description'
        });
        this.descriptionField.value = criterion.description;
        this.descriptionField.addEventListener('input', () =>
            this.callbacks.onDescriptionInput(this.descriptionField.value)
        );

        this.levelsContainer = el('div', { class: 'criteria-container--level-inner' });
        this.standardsContainer = el('div', { class: 'criteria-container--standards' });
        this.standardIdsField = el('input', { type: 'hidden', name: standardIdsField(prefix, index) });
        this.pointsReadout = el('span');

        this.element = this.build();

        this.renderLevels();
        this.renderStandards();
    }

    private build(): HTMLElement {
        const removeButton = this.iconButton('fa-trash', 'Remove criteria', () => this.callbacks.onRemove());

        const content = el('div', { class: 'criteria-container--content' }, [
            el('div', { class: 'criteria-container--content-inner' }, [
                el('div', { class: 'content-inner--name' }, [
                    el('div', { class: 'inputGroup inputGroup--joined' }, [this.nameField, removeButton])
                ]),
                el('div', { class: 'content-inner--description' }, [this.descriptionField])
            ])
        ]);

        const level = el('div', { class: 'criteria-container--level' }, [
            this.levelsContainer,
            this.standardIdsField,
            this.standardsContainer
        ]);

        return el('div', { class: 'criteria-container' }, [
            this.hashField,
            el('div', { class: DRAG_HANDLE_CLASS }, [html(this.host.icon('regular', 'fa-ellipsis-v'))]),
            content,
            level,
            el('div', { class: 'criteria-container--points' }, [this.pointsReadout])
        ]);
    }

    /**
     * `title` is set unconditionally so the control is labelled even with no
     * host at all; the bridge only adds whatever upgrades that to a styled
     * tooltip.
     */
    private iconButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
        const button = el(
            'button',
            {
                type: 'button',
                class: 'button button--link',
                title,
                ...this.host.tooltipAttributes()
            },
            [html(this.host.icon('regular', icon))]
        );
        button.addEventListener('click', onClick);

        return button;
    }

    /** Rebuilds the grading scale. Used when a level is added or removed. */
    renderLevels(): void {
        clear(this.levelsContainer);

        this.levelsContainer.append(
            el('div', { class: 'level-add-handler-container' }, [
                this.iconButton('fa-plus', 'Add a grading scale', () => this.callbacks.onAddLevel())
            ])
        );

        if (!this.criterion.levels.length) {
            this.levelsContainer.append(
                el('div', { class: 'criteria-container--level-empty' }, [
                    'There are no grading scales for this criteria.',
                    el('br'),
                    'Please add one before saving this rubric.'
                ])
            );

            return;
        }

        this.criterion.levels.forEach((level) => {
            const node = this.buildLevel(level);
            this.levelNodes.set(level, node);
            this.levelsContainer.append(node);
        });
    }

    /**
     * Reorders the existing level nodes to match the model.
     *
     * `append` moves a node that is already a child, so the field being typed
     * into travels with its own value rather than having a neighbour's value
     * written over it. `preserveFocus` puts the caret back, because that move
     * detaches and reinserts the node.
     */
    syncLevelOrder(): void {
        preserveFocus(() => {
            this.criterion.levels.forEach((level) => {
                const node = this.levelNodes.get(level);
                if (node) {
                    this.levelsContainer.append(node);
                }
            });
        });
    }

    private buildLevel(level: Level): HTMLElement {
        const names = levelFields(this.prefix, this.index);
        const levelIndex = () => this.criterion.levels.indexOf(level);

        const hash = el('input', { type: 'hidden', name: names.hash, value: level.hash });

        const points = el('input', {
            type: 'text',
            class: 'input',
            name: names.points,
            placeholder: 'Point value',
            value: String(level.points)
        });
        points.addEventListener('input', () => this.callbacks.onLevelPointsInput(levelIndex(), points.value));

        const description = el('textarea', {
            class: 'input',
            name: names.description,
            placeholder: 'Scale description'
        });
        description.value = level.description;
        description.addEventListener('input', () =>
            this.callbacks.onLevelDescriptionInput(levelIndex(), description.value)
        );

        const remove = this.iconButton('fa-trash', 'Remove grading scale', () =>
            this.callbacks.onRemoveLevel(levelIndex())
        );

        return el('div', { class: 'criteria-container--level-item' }, [
            hash,
            el('div', { class: 'level-inner--points' }, [
                el('div', { class: 'inputGroup inputGroup--joined' }, [points, remove])
            ]),
            el('div', { class: 'level-inner--description' }, [description])
        ]);
    }

    /** Rebuilds the standards strip and the hidden id list the host posts. */
    renderStandards(): void {
        clear(this.standardsContainer);

        this.standardIdsField.value = this.criterion.standards.map((standard) => standard.standardId).join(',');

        const addButton = el('button', { type: 'button', class: 'btnAddStandards button button--link button--small' }, [
            html(this.host.icon('regular', 'fa-plus')),
            ' Add standard'
        ]);
        addButton.addEventListener('click', () => this.callbacks.onAddStandard());

        this.standardsContainer.append(
            el('div', { class: 'criteria-container--standards-label' }, [
                el('small', {}, ['Selected Standard(s):', el('br')]),
                addButton
            ])
        );

        this.criterion.standards.forEach((standard) => {
            this.standardsContainer.append(this.buildStandard(standard));
        });
    }

    private buildStandard(standard: Standard): HTMLElement {
        const tooltipId = standardTooltipId(this.prefix, this.index, standard.standardId);

        const number = el(
            'div',
            {
                class: 'enhanced-number',
                ...this.host.elementTooltipAttributes(tooltipId)
            },
            [el('b', {}, [standard.standardNumberEnhanced])]
        );

        // Standard descriptions are authored in the host's standards library and
        // may carry markup, so they are rendered as HTML — as they always have
        // been. See SECURITY.md.
        const tooltip = el('div', { id: tooltipId, class: 'is-hidden' }, [
            html(standard.standardDescription, 'align--left')
        ]);

        const remove = this.iconButton('fa-trash', 'Remove standard', () =>
            this.callbacks.onRemoveStandard(standard.standardId)
        );

        return el('span', { class: 'criteria-container--standards-output' }, [
            el('div', { class: 'selected-standard' }, [number, tooltip, remove])
        ]);
    }

    /** Updates just the point readout. Safe to call on every keystroke. */
    updatePoints(points: number): void {
        this.pointsReadout.textContent = String(points);
    }
}
