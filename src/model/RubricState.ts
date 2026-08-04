import type { Criterion, PointValue, Standard } from '../types';
import { createCriterion, createLevel } from './factories';
import { maxPoints, nextLevelPoints, sortLevels, totalPoints } from './points';

/**
 * What changed, so the view can patch the smallest possible part of the DOM.
 *
 * This exists because the editor is a form: re-rendering a row wholesale would
 * destroy the caret of whoever is typing in it. Every mutation therefore says
 * how far the damage spreads.
 *
 * - `list`      — criteria added, removed or reordered. Rows must be rebuilt
 *                 and re-indexed, because field names embed the row index.
 * - `levels`    — one criterion's scale gained or lost a level.
 * - `order`     — one criterion's levels changed position but not membership.
 * - `standards` — one criterion's standards changed.
 * - `points`    — values only; nothing structural moved.
 */
export type RubricChange =
    | { type: 'list' }
    | { type: 'levels'; index: number }
    | { type: 'order'; index: number }
    | { type: 'standards'; index: number }
    | { type: 'points' };

export type RubricListener = (change: RubricChange) => void;

/**
 * Owns the rubric array and every mutation to it.
 *
 * The array passed in is adopted rather than copied: the host page hands over
 * `window._criteria` and expects the edits to land on that same object.
 */
export class RubricState {
    private readonly criteria: Criterion[];

    private readonly listeners = new Set<RubricListener>();

    constructor(criteria: Criterion[] = []) {
        this.criteria = criteria;
    }

    all(): Criterion[] {
        return this.criteria;
    }

    at(index: number): Criterion | undefined {
        return this.criteria[index];
    }

    count(): number {
        return this.criteria.length;
    }

    total(): number {
        return totalPoints(this.criteria);
    }

    maxFor(index: number): number {
        const criterion = this.at(index);

        return criterion ? maxPoints(criterion) : 0;
    }

    subscribe(listener: RubricListener): () => void {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    private emit(change: RubricChange): void {
        this.listeners.forEach((listener) => listener(change));
    }

    addCriterion(): Criterion {
        const criterion = createCriterion();
        this.criteria.push(criterion);
        this.emit({ type: 'list' });

        return criterion;
    }

    removeCriterion(index: number): void {
        if (!this.at(index)) {
            return;
        }

        this.criteria.splice(index, 1);
        this.emit({ type: 'list' });
    }

    /**
     * Moves a criterion, mirroring a completed drag. Sortable has already moved
     * the DOM node by the time this runs; this brings the model back in step.
     */
    moveCriterion(from: number, to: number): void {
        const criterion = this.at(from);
        if (!criterion || from === to) {
            return;
        }

        this.criteria.splice(from, 1);
        this.criteria.splice(to, 0, criterion);
        this.emit({ type: 'list' });
    }

    setName(index: number, name: string): void {
        const criterion = this.at(index);
        if (criterion) {
            criterion.name = name;
        }
    }

    setDescription(index: number, description: string): void {
        const criterion = this.at(index);
        if (criterion) {
            criterion.description = description;
        }
    }

    addLevel(index: number): void {
        const criterion = this.at(index);
        if (!criterion) {
            return;
        }

        criterion.levels.unshift(createLevel(nextLevelPoints(criterion.levels)));
        sortLevels(criterion.levels);
        this.emit({ type: 'levels', index });
    }

    removeLevel(index: number, levelIndex: number): void {
        const criterion = this.at(index);
        if (!criterion || !criterion.levels[levelIndex]) {
            return;
        }

        criterion.levels.splice(levelIndex, 1);
        this.emit({ type: 'levels', index });
    }

    /**
     * Writes a point value and re-sorts the scale.
     *
     * Sorting on every keystroke is the behaviour this editor has always had —
     * the scale is meant to read best-first at all times. The view reorders the
     * existing level nodes rather than rebuilding them, so the field being
     * typed into moves with its value instead of having a neighbour's value
     * swapped underneath the caret.
     */
    setLevelPoints(index: number, levelIndex: number, points: PointValue): void {
        const criterion = this.at(index);
        const level = criterion?.levels[levelIndex];
        if (!criterion || !level) {
            return;
        }

        level.points = points;

        const before = criterion.levels.slice();
        sortLevels(criterion.levels);
        const reordered = criterion.levels.some((current, position) => current !== before[position]);

        this.emit(reordered ? { type: 'order', index } : { type: 'points' });
    }

    setLevelDescription(index: number, levelIndex: number, description: string): void {
        const level = this.at(index)?.levels[levelIndex];
        if (level) {
            level.description = description;
        }
    }

    addStandard(index: number, standard: Standard): void {
        const criterion = this.at(index);
        if (!criterion) {
            return;
        }

        criterion.standards.push(standard);
        this.emit({ type: 'standards', index });
    }

    /**
     * Standard ids cross the wire as both numbers and strings depending on
     * whether they came from the saved rubric or a DOM attribute, so matching
     * is done on the string form.
     */
    removeStandard(index: number, standardId: number | string): void {
        const criterion = this.at(index);
        if (!criterion) {
            return;
        }

        criterion.standards = criterion.standards.filter(
            (standard) => String(standard.standardId) !== String(standardId)
        );
        this.emit({ type: 'standards', index });
    }

    standardIds(index: number): string {
        const criterion = this.at(index);

        return criterion ? criterion.standards.map((standard) => standard.standardId).join(',') : '';
    }
}
