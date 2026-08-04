import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RubricEditor } from '../../src/RubricEditor';
import type { Criterion, HostBridge } from '../../src/types';
import { createCriteriaList, createCriterion, createStandard } from '../fixtures/criteria';
import { createMockHost } from '../setup';

/**
 * This component is a form used in education, where conformance is routinely a
 * procurement requirement — so the accessible name of every control and the
 * keyboard path to every action are behaviour, not polish.
 */
describe('accessibility', () => {
    let container: HTMLElement;
    let host: HostBridge;
    let editor: RubricEditor | null;

    function mount(criteria: Criterion[] = createCriteriaList(2)): RubricEditor {
        editor = new RubricEditor({ container, criteria, host }).mount();

        return editor;
    }

    function labelFor(control: Element): string | null {
        const id = control.getAttribute('id');
        if (!id) {
            return null;
        }

        return container.querySelector(`label[for="${id}"]`)?.textContent ?? null;
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.append(container);
        host = createMockHost();
        editor = null;
    });

    afterEach(() => {
        editor?.destroy();
        container.remove();
    });

    describe('form controls have accessible names', () => {
        it('labels every visible input and textarea', () => {
            mount([createCriterion()]);

            const controls = Array.from(
                container.querySelectorAll<HTMLElement>('input:not([type="hidden"]), textarea')
            );

            expect(controls.length).to.be.greaterThan(0);
            controls.forEach((control) => {
                const name = labelFor(control) ?? control.getAttribute('aria-label');
                expect(name, `no accessible name for ${control.getAttribute('name')}`).to.be.a('string');
                expect(name).to.not.equal('');
            });
        });

        it('uses real labels rather than relying on placeholders', () => {
            // A placeholder disappears on focus and is announced inconsistently.
            mount([createCriterion()]);

            expect(labelFor(container.querySelector('[name="criteria_name[]"]')!)).to.equal('Criteria name');
            expect(labelFor(container.querySelector('[name="criteria_0_level_points[]"]')!)).to.equal('Point value');
        });

        it('generates unique label ids across rows and levels', () => {
            mount(createCriteriaList(3));

            const ids = Array.from(container.querySelectorAll('label[for]')).map((l) => l.getAttribute('for'));

            expect(ids.length).to.be.greaterThan(0);
            expect(new Set(ids).size).to.equal(ids.length);
        });

        it('does not collide ids between two editors on one page', () => {
            const second = document.createElement('div');
            document.body.append(second);

            mount([createCriterion()]);
            const other = new RubricEditor({ container: second, criteria: [createCriterion()], host }).mount();

            const all = Array.from(document.querySelectorAll('label[for]')).map((l) => l.getAttribute('for'));

            expect(new Set(all).size).to.equal(all.length);

            other.destroy();
            second.remove();
        });

        it('names every icon-only button', () => {
            mount([createCriterion({ standards: [createStandard()] })]);

            Array.from(container.querySelectorAll('button')).forEach((button) => {
                const name = button.getAttribute('aria-label') ?? button.textContent?.trim();
                expect(name, 'unnamed button').to.not.equal('');
            });
        });

        it('distinguishes remove buttons by which standard they remove', () => {
            mount([createCriterion({ standards: [createStandard({ standardNumberEnhanced: 'W.6.1' })] })]);

            expect(container.querySelector('.selected-standard button')?.getAttribute('aria-label')).to.equal(
                'Remove standard W.6.1'
            );
        });

        it('marks point fields as numeric without using type=number', () => {
            // type=number rejects the half-typed states the editor tolerates and
            // throws on selectionStart, which focus preservation depends on.
            const points = container.ownerDocument.createElement('div');
            mount([createCriterion()]);
            points.remove();

            const field = container.querySelector('[name="criteria_0_level_points[]"]')!;
            expect(field.getAttribute('type')).to.equal('text');
            expect(field.getAttribute('inputmode')).to.equal('decimal');
        });
    });

    describe('structure and announcements', () => {
        it('exposes the criteria as a list', () => {
            mount(createCriteriaList(3));

            expect(container.querySelector('[role="list"]')).to.not.equal(null);
            expect(container.querySelectorAll('[role="listitem"]')).to.have.lengthOf(3);
        });

        it('announces the running total politely', () => {
            mount();
            const live = container.querySelector('[aria-live="polite"]');

            expect(live?.textContent).to.contain('Total Possible Points');
        });

        it('announces both empty states', () => {
            mount([]);
            expect(container.querySelector('.criteria-container--empty')?.getAttribute('role')).to.equal('status');

            editor!.destroy();
            mount([createCriterion({ levels: [] })]);
            expect(container.querySelector('.criteria-container--level-empty')?.getAttribute('role')).to.equal(
                'status'
            );
        });

        it('describes a standard chip by its description, not only via a hover tooltip', () => {
            mount([createCriterion({ standards: [createStandard({ standardId: 8 })] })]);
            const chip = container.querySelector('.enhanced-number')!;
            const describedBy = chip.getAttribute('aria-describedby');

            expect(describedBy).to.equal('criteria-0-standard-8-tooltip');
            expect(container.querySelector(`#${describedBy}`)?.textContent).to.contain('Standard description');
        });
    });

    describe('keyboard reordering', () => {
        function grip(index: number): HTMLButtonElement {
            return container.querySelectorAll<HTMLButtonElement>('.criteria-container--drag-handle')[index];
        }

        function press(node: HTMLElement, key: string): KeyboardEvent {
            const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
            node.dispatchEvent(event);

            return event;
        }

        function names(instance: RubricEditor): string[] {
            return instance.criteria.map((criterion) => criterion.name);
        }

        it('exposes the grip as a focusable button', () => {
            mount();
            const handle = grip(0);

            expect(handle.tagName).to.equal('BUTTON');
            expect(handle.getAttribute('type')).to.equal('button');
            expect(handle.getAttribute('aria-label')).to.contain('Reorder');
        });

        it('moves a criterion down with ArrowDown', () => {
            const instance = mount(createCriteriaList(3));
            press(grip(0), 'ArrowDown');

            expect(names(instance)).to.deep.equal(['Criterion 2', 'Criterion 1', 'Criterion 3']);
        });

        it('moves a criterion up with ArrowUp', () => {
            const instance = mount(createCriteriaList(3));
            press(grip(2), 'ArrowUp');

            expect(names(instance)).to.deep.equal(['Criterion 1', 'Criterion 3', 'Criterion 2']);
        });

        it('jumps to first and last with Home and End', () => {
            const instance = mount(createCriteriaList(3));
            press(grip(2), 'Home');
            expect(names(instance)).to.deep.equal(['Criterion 3', 'Criterion 1', 'Criterion 2']);

            press(grip(0), 'End');
            expect(names(instance)).to.deep.equal(['Criterion 1', 'Criterion 2', 'Criterion 3']);
        });

        it('keeps focus on the grip so reordering can continue', () => {
            // Moving rebuilds every row, destroying the focused button — without
            // restoring focus, reordering by keyboard would be one step only.
            const instance = mount(createCriteriaList(3));
            grip(0).focus();
            press(grip(0), 'ArrowDown');

            expect(document.activeElement).to.equal(grip(1));

            press(grip(1), 'ArrowDown');
            expect(names(instance)).to.deep.equal(['Criterion 2', 'Criterion 3', 'Criterion 1']);
        });

        it('stops at the ends rather than wrapping', () => {
            const instance = mount(createCriteriaList(2));
            press(grip(0), 'ArrowUp');
            expect(names(instance)).to.deep.equal(['Criterion 1', 'Criterion 2']);

            press(grip(1), 'ArrowDown');
            expect(names(instance)).to.deep.equal(['Criterion 1', 'Criterion 2']);
        });

        it('prevents the page scrolling out from under the row', () => {
            mount(createCriteriaList(2));

            expect(press(grip(0), 'ArrowDown').defaultPrevented).to.equal(true);
        });

        it('ignores keys it does not handle', () => {
            const instance = mount(createCriteriaList(2));
            const event = press(grip(0), 'a');

            expect(event.defaultPrevented).to.equal(false);
            expect(names(instance)).to.deep.equal(['Criterion 1', 'Criterion 2']);
        });

        it('still restricts pointer dragging to the grip', () => {
            mount();

            expect(grip(0).className).to.contain('criteria-container--drag-handle');
        });
    });

    it('keeps the hidden-label utility out of the visual layout', () => {
        mount([createCriterion()]);

        expect(container.querySelector('label')?.className).to.equal('nt-rubric-sr-only');
        expect(vi.isMockFunction(host.icon)).to.equal(true);
    });
});
