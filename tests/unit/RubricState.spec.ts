import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RubricState, type RubricChange } from '../../src/model/RubricState';
import { createCriteriaList, createCriterion, createStandard } from '../fixtures/criteria';

describe('RubricState', () => {
    let changes: RubricChange[];

    function stateWith(criteria = createCriteriaList(3)): RubricState {
        const state = new RubricState(criteria);
        state.subscribe((change) => changes.push(change));

        return state;
    }

    beforeEach(() => {
        changes = [];
    });

    describe('construction', () => {
        it('defaults to an empty rubric', () => {
            expect(new RubricState().count()).to.equal(0);
        });

        it('adopts the array it is given rather than copying it', () => {
            const criteria = createCriteriaList(2);

            expect(new RubricState(criteria).all()).to.equal(criteria);
        });
    });

    describe('addCriterion', () => {
        it('appends a criterion', () => {
            const state = stateWith(createCriteriaList(2));
            state.addCriterion();

            expect(state.count()).to.equal(3);
        });

        it('seeds the new criterion with one empty level', () => {
            const state = stateWith([]);
            const criterion = state.addCriterion();

            expect(criterion.hash).to.equal('');
            expect(criterion.name).to.equal('');
            expect(criterion.description).to.equal('');
            expect(criterion.standards).to.deep.equal([]);
            expect(criterion.levels).to.deep.equal([{ hash: '', points: 0, description: '' }]);
        });

        it('reports a list change', () => {
            stateWith([]).addCriterion();

            expect(changes).to.deep.equal([{ type: 'list' }]);
        });
    });

    describe('removeCriterion', () => {
        it('removes by index', () => {
            const state = stateWith();
            state.removeCriterion(1);

            expect(state.all().map((criterion) => criterion.name)).to.deep.equal(['Criterion 1', 'Criterion 3']);
        });

        it('ignores an out-of-range index', () => {
            const state = stateWith();
            state.removeCriterion(99);

            expect(state.count()).to.equal(3);
            expect(changes).to.deep.equal([]);
        });
    });

    describe('moveCriterion', () => {
        it('moves a criterion forward', () => {
            const state = stateWith();
            state.moveCriterion(0, 2);

            expect(state.all().map((criterion) => criterion.name)).to.deep.equal([
                'Criterion 2',
                'Criterion 3',
                'Criterion 1'
            ]);
        });

        it('moves a criterion backward', () => {
            const state = stateWith();
            state.moveCriterion(2, 0);

            expect(state.all().map((criterion) => criterion.name)).to.deep.equal([
                'Criterion 3',
                'Criterion 1',
                'Criterion 2'
            ]);
        });

        it('does nothing when the position is unchanged', () => {
            const state = stateWith();
            state.moveCriterion(1, 1);

            expect(changes).to.deep.equal([]);
        });

        it('ignores an out-of-range source', () => {
            const state = stateWith();
            state.moveCriterion(99, 0);

            expect(state.count()).to.equal(3);
            expect(changes).to.deep.equal([]);
        });
    });

    describe('levels', () => {
        it('adds a level worth one more than the current best', () => {
            const state = stateWith([createCriterion({ levels: [{ hash: 'a', points: 5, description: '' }] })]);
            state.addLevel(0);

            expect(state.at(0)?.levels.map((level) => level.points)).to.deep.equal([6, 5]);
        });

        it('adds a zero-point level to an empty scale', () => {
            const state = stateWith([createCriterion({ levels: [] })]);
            state.addLevel(0);

            expect(state.at(0)?.levels).to.deep.equal([{ hash: '', points: 0, description: '' }]);
        });

        it('reports a levels change scoped to the criterion', () => {
            const state = stateWith();
            state.addLevel(1);

            expect(changes).to.deep.equal([{ type: 'levels', index: 1 }]);
        });

        it('removes a level from the right criterion', () => {
            const state = stateWith();
            state.removeLevel(0, 1);

            expect(state.at(0)?.levels).to.have.lengthOf(2);
            expect(state.at(1)?.levels).to.have.lengthOf(3);
        });

        it('ignores removing a level that is not there', () => {
            const state = stateWith();
            state.removeLevel(0, 99);

            expect(state.at(0)?.levels).to.have.lengthOf(3);
            expect(changes).to.deep.equal([]);
        });

        it('ignores level changes on a missing criterion', () => {
            const state = stateWith();
            state.addLevel(99);
            state.removeLevel(99, 0);
            state.setLevelPoints(99, 0, 5);
            state.setLevelDescription(99, 0, 'x');

            expect(changes).to.deep.equal([]);
        });
    });

    describe('setLevelPoints', () => {
        it('writes the value', () => {
            const state = stateWith();
            state.setLevelPoints(0, 0, '4');

            expect(state.at(0)?.levels.map((level) => level.points)).to.contain('4');
        });

        it('re-sorts the scale when the new value changes the order', () => {
            const state = stateWith([
                createCriterion({
                    levels: [
                        { hash: 'a', points: 5, description: '' },
                        { hash: 'b', points: 1, description: '' }
                    ]
                })
            ]);
            state.setLevelPoints(0, 1, '9');

            expect(state.at(0)?.levels.map((level) => level.hash)).to.deep.equal(['b', 'a']);
        });

        it('reports an order change only when something actually moved', () => {
            const state = stateWith([
                createCriterion({
                    levels: [
                        { hash: 'a', points: 5, description: '' },
                        { hash: 'b', points: 1, description: '' }
                    ]
                })
            ]);

            state.setLevelPoints(0, 0, '4');
            expect(changes).to.deep.equal([{ type: 'points' }]);

            changes = [];
            state.setLevelPoints(0, 1, '9');
            expect(changes).to.deep.equal([{ type: 'order', index: 0 }]);
        });
    });

    describe('standards', () => {
        it('adds a standard', () => {
            const state = stateWith([createCriterion({ standards: [] })]);
            state.addStandard(0, createStandard({ standardId: 42 }));

            expect(state.at(0)?.standards).to.have.lengthOf(1);
            expect(changes).to.deep.equal([{ type: 'standards', index: 0 }]);
        });

        it('removes a standard by id', () => {
            const state = stateWith([
                createCriterion({ standards: [createStandard({ standardId: 1 }), createStandard({ standardId: 2 })] })
            ]);
            state.removeStandard(0, 1);

            expect(state.at(0)?.standards.map((standard) => standard.standardId)).to.deep.equal([2]);
        });

        it('matches ids across the number/string boundary', () => {
            const state = stateWith([createCriterion({ standards: [createStandard({ standardId: '5' })] })]);
            state.removeStandard(0, 5);

            expect(state.at(0)?.standards).to.have.lengthOf(0);
        });

        it('ignores standards on a missing criterion', () => {
            const state = stateWith();
            state.addStandard(99, createStandard());
            state.removeStandard(99, 1);

            expect(changes).to.deep.equal([]);
        });

        it('joins ids for the hidden field', () => {
            const state = stateWith([
                createCriterion({ standards: [createStandard({ standardId: 1 }), createStandard({ standardId: 2 })] })
            ]);

            expect(state.standardIds(0)).to.equal('1,2');
        });

        it('returns an empty id list for a missing criterion', () => {
            expect(stateWith().standardIds(99)).to.equal('');
        });
    });

    describe('text fields', () => {
        it('writes name and description without reporting a change', () => {
            const state = stateWith();
            state.setName(0, 'Updated');
            state.setDescription(0, 'Updated description');
            state.setLevelDescription(0, 0, 'Level description');

            expect(state.at(0)?.name).to.equal('Updated');
            expect(state.at(0)?.description).to.equal('Updated description');
            expect(state.at(0)?.levels[0].description).to.equal('Level description');
            // Text edits are already visible in the DOM the user typed into;
            // re-rendering for them would move the caret.
            expect(changes).to.deep.equal([]);
        });

        it('ignores writes to a missing criterion', () => {
            const state = stateWith();
            state.setName(99, 'x');
            state.setDescription(99, 'x');

            expect(state.count()).to.equal(3);
        });
    });

    describe('totals', () => {
        it('sums the best level of every criterion', () => {
            const state = stateWith([
                createCriterion({ levels: [{ hash: 'a', points: 5, description: '' }] }),
                createCriterion({ levels: [{ hash: 'b', points: 10, description: '' }] })
            ]);

            expect(state.total()).to.equal(15);
            expect(state.maxFor(0)).to.equal(5);
        });

        it('reports zero for a missing criterion', () => {
            expect(stateWith().maxFor(99)).to.equal(0);
        });
    });

    describe('subscribe', () => {
        it('stops delivering after unsubscribe', () => {
            const state = new RubricState(createCriteriaList(1));
            const listener = vi.fn();
            const unsubscribe = state.subscribe(listener);

            state.addCriterion();
            unsubscribe();
            state.addCriterion();

            expect(listener).toHaveBeenCalledOnce();
        });
    });
});
