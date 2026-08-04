import type { Criterion, ValidationProblem, ValidationResult } from '../types';

/**
 * Checks a rubric for the problems that make it unusable once saved.
 *
 * The editor deliberately does not block these itself — half-finished state is
 * normal while someone is still working, and a control that refuses input is
 * worse than one that reports. The rules here are the ones the UI already
 * states in its own empty messages, plus the two that silently corrupt scoring.
 *
 * The host owns what to do with the result: block submit, warn, or ignore.
 */
export function validateRubric(criteria: Criterion[]): ValidationResult {
    const problems: ValidationProblem[] = [];

    if (!criteria.length) {
        problems.push({
            code: 'empty-rubric',
            message: 'This rubric has no criteria. Add at least one before saving.'
        });
    }

    criteria.forEach((criterion, criterionIndex) => {
        const label = criterion.name.trim() || `Criteria ${criterionIndex + 1}`;

        if (!criterion.name.trim()) {
            problems.push({
                code: 'criterion-without-name',
                message: `Criteria ${criterionIndex + 1} has no name.`,
                criterionIndex
            });
        }

        // A criterion with no levels is worth zero and can never be scored,
        // which is exactly what the row's own empty state warns about.
        if (!criterion.levels.length) {
            problems.push({
                code: 'criterion-without-levels',
                message: `"${label}" has no grading scale. Add at least one before saving.`,
                criterionIndex
            });
        }

        criterion.levels.forEach((level, levelIndex) => {
            // Scored as zero at runtime so the running total stays sane while
            // typing, which means a value left unparseable would silently save
            // as a zero-point level rather than fail.
            if (Number.isNaN(parseFloat(String(level.points)))) {
                problems.push({
                    code: 'level-points-not-numeric',
                    message: `A grading scale in "${label}" has a point value that is not a number.`,
                    criterionIndex,
                    levelIndex
                });
            }
        });
    });

    return { valid: problems.length === 0, problems };
}
