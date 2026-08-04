import type { Criterion, Standard } from '../../src/types';

export function createStandard(overrides: Partial<Standard> = {}): Standard {
    return {
        standardId: 1,
        standardGuid: 'guid-1',
        standardDescription: 'Standard description',
        standardNumberEnhanced: 'S.1.1',
        ...overrides
    };
}

export function createCriterion(overrides: Partial<Criterion> = {}): Criterion {
    return {
        hash: 'hash-1',
        name: 'Test Criterion',
        description: 'Test description',
        levels: [
            { hash: 'level-1', points: 3, description: 'Excellent' },
            { hash: 'level-2', points: 2, description: 'Good' },
            { hash: 'level-3', points: 1, description: 'Fair' }
        ],
        standards: [],
        ...overrides
    };
}

export function createCriteriaList(count = 3): Criterion[] {
    return Array.from({ length: count }, (_, i) =>
        createCriterion({
            hash: `hash-${i + 1}`,
            name: `Criterion ${i + 1}`,
            levels: [
                { hash: `level-${i + 1}-1`, points: (i + 1) * 3, description: 'High' },
                { hash: `level-${i + 1}-2`, points: (i + 1) * 2, description: 'Medium' },
                { hash: `level-${i + 1}-3`, points: (i + 1) * 1, description: 'Low' }
            ]
        })
    );
}
