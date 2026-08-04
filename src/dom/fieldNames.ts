/**
 * The form field naming scheme.
 *
 * This editor has no save button of its own — it renders inputs into the host's
 * form and the host posts them. These names are therefore a wire contract with
 * the server, and changing one silently drops that field on save.
 *
 * Two different shapes are in play, and the difference matters:
 *
 * - Criterion-level fields are plain `name[]` arrays. The server pairs them up
 *   by position, so **DOM order is the source of truth** for them. After a drag
 *   the rows must sit in the same order as the model.
 * - Level and standard fields embed the criterion's index (`criteria_0_...`),
 *   which is what associates a scale with its criterion. That index must be
 *   rewritten on every row whenever the list changes — see `CriterionRow.setIndex`.
 *
 * Level fields are `[]` arrays *within* a criterion, so reordering a scale needs
 * no renaming; the three fields of a level travel together inside its own node.
 */

export interface CriterionFieldNames {
    hash: string;
    name: string;
    description: string;
}

export interface LevelFieldNames {
    hash: string;
    points: string;
    description: string;
}

export function criterionFields(prefix: string): CriterionFieldNames {
    return {
        hash: `${prefix}_hash[]`,
        name: `${prefix}_name[]`,
        description: `${prefix}_description[]`
    };
}

export function levelFields(prefix: string, index: number): LevelFieldNames {
    return {
        hash: `${prefix}_${index}_level_hash[]`,
        points: `${prefix}_${index}_level_points[]`,
        description: `${prefix}_${index}_level_description[]`
    };
}

export function standardIdsField(prefix: string, index: number): string {
    return `${prefix}_${index}_standard_ids`;
}

/**
 * Id of the hidden element a standard's tooltip reads its content from. The
 * host's tooltip initialiser resolves it by selector, so it has to be unique
 * across the page and stable across re-renders of the same standard.
 */
export function standardTooltipId(prefix: string, index: number, standardId: number | string): string {
    return `${prefix}-${index}-standard-${standardId}-tooltip`;
}
