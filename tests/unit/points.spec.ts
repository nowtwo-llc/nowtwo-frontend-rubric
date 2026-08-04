import { describe, expect, it } from 'vitest';
import { maxPoints, nextLevelPoints, sortLevels, toPoints, totalPoints } from '../../src/model/points';
import type { Level } from '../../src/types';
import { createCriterion } from '../fixtures/criteria';

function levels(...points: (number | string)[]): Level[] {
    return points.map((value, index) => ({ hash: `l-${index}`, points: value, description: '' }));
}

describe('toPoints', () => {
    it('passes numbers through', () => {
        expect(toPoints(7)).to.equal(7);
    });

    it('parses numeric strings', () => {
        expect(toPoints('10')).to.equal(10);
    });

    it('parses decimals', () => {
        expect(toPoints('2.5')).to.equal(2.5);
    });

    it('treats unparseable values as zero', () => {
        expect(toPoints('abc')).to.equal(0);
    });

    it('treats an empty string as zero', () => {
        expect(toPoints('')).to.equal(0);
    });
});

describe('maxPoints', () => {
    it('returns the highest level value', () => {
        expect(maxPoints(createCriterion({ levels: levels(5, 3, 1) }))).to.equal(5);
    });

    it('returns zero for an empty scale', () => {
        expect(maxPoints(createCriterion({ levels: [] }))).to.equal(0);
    });

    it('scores unparseable values as zero', () => {
        expect(maxPoints(createCriterion({ levels: levels('abc') }))).to.equal(0);
    });

    it('compares string values numerically', () => {
        expect(maxPoints(createCriterion({ levels: levels('10', '5') }))).to.equal(10);
    });

    it('floors at zero when every level is negative', () => {
        expect(maxPoints(createCriterion({ levels: levels(-5, -2) }))).to.equal(0);
    });

    it('handles a single level', () => {
        expect(maxPoints(createCriterion({ levels: levels(7) }))).to.equal(7);
    });
});

describe('totalPoints', () => {
    it('sums the best level of each criterion', () => {
        const criteria = [createCriterion({ levels: levels(5) }), createCriterion({ levels: levels(10) })];

        expect(totalPoints(criteria)).to.equal(15);
    });

    it('returns zero for an empty rubric', () => {
        expect(totalPoints([])).to.equal(0);
    });
});

describe('sortLevels', () => {
    it('sorts descending by points', () => {
        const scale = levels(1, 3, 2);
        sortLevels(scale);

        expect(scale.map((level) => level.points)).to.deep.equal([3, 2, 1]);
    });

    it('sorts string values numerically rather than lexicographically', () => {
        const scale = levels('1', '10', '5');
        sortLevels(scale);

        expect(scale.map((level) => level.points)).to.deep.equal(['10', '5', '1']);
    });

    it('leaves equal values intact', () => {
        const scale = levels(5, 5);
        sortLevels(scale);

        expect(scale).to.have.lengthOf(2);
        expect(scale[0].points).to.equal(5);
    });

    it('handles an empty scale', () => {
        const scale: Level[] = [];
        sortLevels(scale);

        expect(scale).to.deep.equal([]);
    });

    it('sorts in place and returns the same array', () => {
        const scale = levels(1, 2);

        expect(sortLevels(scale)).to.equal(scale);
    });
});

describe('nextLevelPoints', () => {
    it('returns one above the current best', () => {
        expect(nextLevelPoints(levels(5, 3))).to.equal(6);
    });

    it('returns zero for an empty scale', () => {
        expect(nextLevelPoints([])).to.equal(0);
    });

    it('uses numeric comparison for string values', () => {
        expect(nextLevelPoints(levels('9', '10'))).to.equal(11);
    });
});
