import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHANGE_EVENT, RubricEditor } from '../../src/RubricEditor';
import type { Criterion, HostBridge, RubricEditorLike } from '../../src/types';
import { createCriteriaList, createCriterion, createStandard } from '../fixtures/criteria';
import { createMockHost } from '../setup';

type ChangeHandler = (criteria: Criterion[], editor: RubricEditorLike) => void;

describe('change notification', () => {
    let container: HTMLElement;
    let host: HostBridge;
    let editor: RubricEditor | null;
    let onChange: ReturnType<typeof vi.fn<ChangeHandler>>;

    function mount(criteria: Criterion[] = createCriteriaList(1)): RubricEditor {
        editor = new RubricEditor({ container, criteria, host, onChange }).mount();
        onChange.mockClear();

        return editor;
    }

    function type(selector: string, value: string): void {
        const node = container.querySelector<HTMLInputElement>(selector)!;
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function click(selector: string): void {
        container.querySelector<HTMLElement>(selector)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.append(container);
        host = createMockHost();
        onChange = vi.fn<ChangeHandler>();
        editor = null;
    });

    afterEach(() => {
        editor?.destroy();
        container.remove();
    });

    describe('onChange option', () => {
        it('fires when a name is typed', () => {
            // The whole point: text edits render nothing, but the host still
            // needs to know the form is dirty.
            const instance = mount();
            type('[name="criteria_name[]"]', 'Updated');

            expect(onChange).toHaveBeenCalledOnce();
            expect(onChange.mock.calls[0][0]).to.equal(instance.criteria);
        });

        it('fires when a description is typed', () => {
            mount();
            type('[name="criteria_description[]"]', 'Updated');

            expect(onChange).toHaveBeenCalledOnce();
        });

        it('fires when a level description is typed', () => {
            mount();
            type('[name="criteria_0_level_description[]"]', 'Updated');

            expect(onChange).toHaveBeenCalledOnce();
        });

        it('fires on every keystroke rather than debouncing', () => {
            mount();
            type('[name="criteria_name[]"]', 'a');
            type('[name="criteria_name[]"]', 'ab');
            type('[name="criteria_name[]"]', 'abc');

            expect(onChange).toHaveBeenCalledTimes(3);
        });

        it('fires when points change', () => {
            mount();
            type('[name="criteria_0_level_points[]"]', '9');

            expect(onChange).toHaveBeenCalled();
        });

        it('fires when a criterion is added or removed', () => {
            mount();
            click('.rubric-footer-container button');
            expect(onChange).toHaveBeenCalledOnce();

            onChange.mockClear();
            click('.content-inner--name button');
            expect(onChange).toHaveBeenCalledOnce();
        });

        it('fires when a level is added or removed', () => {
            mount();
            click('.level-add-handler-container button');
            expect(onChange).toHaveBeenCalledOnce();

            onChange.mockClear();
            click('.level-inner--points button');
            expect(onChange).toHaveBeenCalledOnce();
        });

        it('fires when a standard is added or removed', () => {
            const instance = mount([createCriterion({ standards: [] })]);
            instance.addStandard(0, createStandard({ standardId: 5 }));
            expect(onChange).toHaveBeenCalledOnce();

            onChange.mockClear();
            click('.selected-standard button');
            expect(onChange).toHaveBeenCalledOnce();
        });

        it('fires when criteria are reordered', () => {
            const instance = mount(createCriteriaList(2));
            instance.moveCriterion(0, 1);

            expect(onChange).toHaveBeenCalledOnce();
        });

        it('hands over the editor so the host can validate in place', () => {
            mount([createCriterion({ name: '' })]);
            type('[name="criteria_name[]"]', 'x');

            const passed = onChange.mock.calls[0][1];
            expect(passed.totalPoints).to.be.a('number');
            expect(passed.validate().valid).to.equal(true);
        });

        it('does not fire on mount', () => {
            editor = new RubricEditor({ container, criteria: createCriteriaList(1), host, onChange }).mount();

            expect(onChange).not.toHaveBeenCalled();
        });

        it('is optional', () => {
            expect(() => {
                editor = new RubricEditor({ container, criteria: createCriteriaList(1), host }).mount();
                container.querySelector<HTMLElement>('.rubric-footer-container button')!.click();
            }).to.not.throw();
        });
    });

    describe('DOM event', () => {
        it('dispatches a bubbling nt-rubric:change event', () => {
            // Script-tag consumers never hold the instance, so the same news has
            // to be available from the DOM.
            const listener = vi.fn();
            container.addEventListener(CHANGE_EVENT, listener);

            const instance = mount();
            type('[name="criteria_name[]"]', 'Updated');

            expect(listener).toHaveBeenCalledOnce();
            const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
            expect(detail.criteria).to.equal(instance.criteria);
            expect(detail.totalPoints).to.equal(instance.totalPoints);
        });

        it('reports the total after the change, not before', () => {
            const seen: number[] = [];
            container.addEventListener(CHANGE_EVENT, (event) => {
                seen.push((event as CustomEvent).detail.totalPoints);
            });

            mount([createCriterion({ levels: [{ hash: 'a', points: 1, description: '' }] })]);
            type('[name="criteria_0_level_points[]"]', '42');

            // Index access rather than .at(): the library targets ES2020.
            expect(seen[seen.length - 1]).to.equal(42);
        });

        it('stops once destroyed', () => {
            const listener = vi.fn();
            container.addEventListener(CHANGE_EVENT, listener);

            const instance = mount();
            instance.destroy();
            instance.addStandard(0, createStandard());

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('validate() on the editor', () => {
        it('reports a complete rubric as valid', () => {
            expect(mount(createCriteriaList(2)).validate().valid).to.equal(true);
        });

        it('reports the problems of the live rubric', () => {
            const instance = mount([createCriterion({ name: 'Clarity', levels: [] })]);
            const result = instance.validate();

            expect(result.valid).to.equal(false);
            expect(result.problems.map((p) => p.code)).to.contain('criterion-without-levels');
        });

        it('reflects edits made since mounting', () => {
            const instance = mount([createCriterion({ name: 'Clarity' })]);
            expect(instance.validate().valid).to.equal(true);

            type('[name="criteria_name[]"]', '');
            expect(instance.validate().valid).to.equal(false);
        });
    });
});
