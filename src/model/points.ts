import type { Criterion, Level, PointValue } from '../types';

/**
 * Resolves a point value to a number, treating anything unparseable as zero.
 *
 * Text inputs hand back strings, and a half-typed value like `-` or `` is a
 * normal intermediate state rather than an error — scoring it as zero keeps
 * the running total sane while someone is still typing.
 */
export function toPoints(value: PointValue): number {
    const parsed = parseFloat(String(value));

    return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * A criterion is worth its best level. The floor of zero is deliberate: a
 * rubric with only negative levels contributes nothing rather than subtracting
 * from the total.
 */
export function maxPoints(criterion: Criterion): number {
    return criterion.levels.reduce((max, level) => Math.max(max, toPoints(level.points)), 0);
}

export function totalPoints(criteria: Criterion[]): number {
    return criteria.reduce((total, criterion) => total + maxPoints(criterion), 0);
}

/**
 * Sorts levels best-first, in place.
 *
 * Comparison goes through `toPoints` rather than the raw values, so a rubric
 * loaded with string points ('10', '5', '1') sorts numerically instead of
 * lexicographically.
 */
export function sortLevels(levels: Level[]): Level[] {
    levels.sort((a, b) => toPoints(b.points) - toPoints(a.points));

    return levels;
}

/**
 * The point value a newly added level should get: one better than the current
 * best, so it sorts to the front and reads as the new top of the scale. An
 * empty scale starts at zero.
 */
export function nextLevelPoints(levels: Level[]): number {
    if (!levels.length) {
        return 0;
    }

    return levels.reduce((max, level) => Math.max(max, toPoints(level.points)), toPoints(levels[0].points)) + 1;
}
