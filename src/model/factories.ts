import type { Criterion, Level, PointValue } from '../types';

/**
 * A new level. The empty `hash` is what tells the host this row is new and
 * needs an identifier assigned on save — an existing level always carries the
 * hash it was loaded with.
 */
export function createLevel(points: PointValue = 0): Level {
    return { hash: '', points, description: '' };
}

/**
 * A new criterion, seeded with a single level so the row is immediately usable
 * and never renders its own empty state on creation.
 */
export function createCriterion(): Criterion {
    return {
        hash: '',
        name: '',
        description: '',
        levels: [createLevel()],
        standards: []
    };
}
