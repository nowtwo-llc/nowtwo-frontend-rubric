import { describe, expect, it } from 'vitest';
import { validateRubric } from '../../src/model/validate';
import type { ProblemCode } from '../../src/types';
import { createCriteriaList, createCriterion } from '../fixtures/criteria';

function codes(criteria: Parameters<typeof validateRubric>[0]): ProblemCode[] {
    return validateRubric(criteria).problems.map((problem) => problem.code);
}

describe('validateRubric', () => {
    it('passes a complete rubric', () => {
        const result = validateRubric(createCriteriaList(2));

        expect(result.valid).to.equal(true);
        expect(result.problems).to.deep.equal([]);
    });

    it('reports an empty rubric', () => {
        const result = validateRubric([]);

        expect(result.valid).to.equal(false);
        expect(result.problems[0].code).to.equal('empty-rubric');
    });

    it('reports a criterion with no grading scale', () => {
        // The row's own empty state already says this; validate() is what lets
        // the host act on it.
        const problems = validateRubric([createCriterion({ name: 'Clarity', levels: [] })]).problems;
        const problem = problems.find((p) => p.code === 'criterion-without-levels');

        expect(problem).to.not.equal(undefined);
        expect(problem?.criterionIndex).to.equal(0);
        expect(problem?.message).to.contain('Clarity');
    });

    it('reports a criterion with no name', () => {
        expect(codes([createCriterion({ name: '   ' })])).to.contain('criterion-without-name');
    });

    it('falls back to a positional label when the name is blank', () => {
        const problems = validateRubric([createCriterion({ name: '', levels: [] })]).problems;
        const problem = problems.find((p) => p.code === 'criterion-without-levels');

        expect(problem?.message).to.contain('Criteria 1');
    });

    it('reports a point value that is not a number', () => {
        const problems = validateRubric([
            createCriterion({ name: 'Clarity', levels: [{ hash: 'a', points: 'abc', description: '' }] })
        ]).problems;
        const problem = problems.find((p) => p.code === 'level-points-not-numeric');

        expect(problem?.criterionIndex).to.equal(0);
        expect(problem?.levelIndex).to.equal(0);
    });

    it('reports an empty point value, which would otherwise save as zero', () => {
        expect(
            codes([createCriterion({ name: 'Clarity', levels: [{ hash: 'a', points: '', description: '' }] })])
        ).to.contain('level-points-not-numeric');
    });

    it('accepts numeric strings', () => {
        expect(
            codes([createCriterion({ name: 'Clarity', levels: [{ hash: 'a', points: '2.5', description: '' }] })])
        ).to.not.contain('level-points-not-numeric');
    });

    it('accepts a negative point value', () => {
        expect(
            codes([createCriterion({ name: 'Clarity', levels: [{ hash: 'a', points: -1, description: '' }] })])
        ).to.not.contain('level-points-not-numeric');
    });

    it('reports every problem rather than stopping at the first', () => {
        const result = validateRubric([createCriterion({ name: '', levels: [] })]);

        expect(result.problems).to.have.lengthOf(2);
        expect(result.problems.map((p) => p.code)).to.deep.equal([
            'criterion-without-name',
            'criterion-without-levels'
        ]);
    });

    it('scopes problems to the right criterion', () => {
        const problems = validateRubric([
            createCriterion({ name: 'Fine' }),
            createCriterion({ name: 'Broken', levels: [] })
        ]).problems;

        expect(problems).to.have.lengthOf(1);
        expect(problems[0].criterionIndex).to.equal(1);
    });
});
