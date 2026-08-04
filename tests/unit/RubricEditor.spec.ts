import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RubricEditor } from '../../src/RubricEditor';
import type { Criterion, HostBridge } from '../../src/types';
import { DEFAULT_HOST_GLOBAL } from '../../src/host/globalHost';
import { createCriteriaList, createCriterion, createStandard } from '../fixtures/criteria';
import { createMockHost } from '../setup';

const SELECT_EVENT = 'HE:StandardsTool:SelectStandard';
const REMOVE_EVENT = 'HE:StandardsTool:RemoveStandard';

describe('RubricEditor', () => {
    let container: HTMLElement;
    let host: HostBridge;
    let editor: RubricEditor | null;

    function mount(criteria: Criterion[] = []): RubricEditor {
        editor = new RubricEditor({ container, criteria, host }).mount();

        return editor;
    }

    function rows(): HTMLElement[] {
        return Array.from(container.querySelectorAll<HTMLElement>('.criteria-container'));
    }

    function field(name: string): HTMLInputElement | null {
        return container.querySelector<HTMLInputElement>(`[name="${name}"]`);
    }

    function fields(name: string): HTMLInputElement[] {
        return Array.from(container.querySelectorAll<HTMLInputElement>(`[name="${name}"]`));
    }

    function type(node: HTMLInputElement | HTMLTextAreaElement, value: string): void {
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function click(node: Element | null): void {
        (node as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'nt-rubric-app';
        document.body.append(container);
        host = createMockHost();
        editor = null;
    });

    afterEach(() => {
        editor?.destroy();
        container.remove();
        window._criteria = [];
    });

    // ── Mounting ───────────────────────────────────────────────

    describe('mounting', () => {
        it('renders into the container', () => {
            mount();

            expect(container.querySelector('.nt-rubric')).to.not.equal(null);
        });

        it('accepts a selector as well as an element', () => {
            editor = new RubricEditor({ container: '#nt-rubric-app', host }).mount();

            expect(container.querySelector('.nt-rubric')).to.not.equal(null);
        });

        it('throws when the container is missing', () => {
            expect(() => new RubricEditor({ container: '#nope', host }).mount()).to.throw(
                'RubricEditor cannot find its container element: #nope'
            );
        });

        it('falls back to window._criteria', () => {
            window._criteria = createCriteriaList(2);
            editor = new RubricEditor({ container, host }).mount();

            expect(editor.criteria).to.have.lengthOf(2);
        });

        it('falls back to an empty rubric when no data is present', () => {
            delete window._criteria;
            editor = new RubricEditor({ container, host }).mount();

            expect(editor.criteria).to.deep.equal([]);
        });

        it('is idempotent', () => {
            const instance = mount();
            instance.mount();

            expect(container.querySelectorAll('.nt-rubric')).to.have.lengthOf(1);
        });

        it('edits the array it was handed rather than a copy', () => {
            const criteria = createCriteriaList(1);
            const instance = mount(criteria);
            click(container.querySelector('.rubric-footer-container button'));

            expect(criteria).to.have.lengthOf(2);
            expect(instance.criteria).to.equal(criteria);
        });
    });

    // ── Rendering ──────────────────────────────────────────────

    describe('rendering', () => {
        it('shows the empty state for an empty rubric', () => {
            mount();

            expect(container.querySelector('.criteria-container--empty')?.textContent).to.contain(
                'This rubric has no criteria'
            );
        });

        it('always renders the column header', () => {
            mount();

            expect(container.querySelector('.dataList-table')).to.not.equal(null);
        });

        it('renders one row per criterion', () => {
            mount(createCriteriaList(3));

            expect(rows()).to.have.lengthOf(3);
        });

        it('renders the footer with the running total', () => {
            mount(createCriteriaList(2));

            // Best levels are 3 and 6.
            expect(container.querySelector('.rubric-footer-container')?.textContent).to.contain(
                'Total Possible Points: 9'
            );
        });

        it('shows each criterion max in its own row', () => {
            mount(createCriteriaList(2));
            const readouts = Array.from(container.querySelectorAll('.criteria-container--points')).map(
                (node) => node.querySelector('span:not(.nt-rubric-sr-only)')?.textContent
            );

            expect(readouts).to.deep.equal(['3', '6']);
        });

        it('gives the bare points number a hidden label so it is not announced alone', () => {
            mount(createCriteriaList(1));

            expect(container.querySelector('.criteria-container--points')?.textContent).to.equal('Maximum points: 3');
        });

        it('renders existing values into the inputs', () => {
            mount([createCriterion({ name: 'Clarity', description: 'How clear' })]);

            expect(field('criteria_name[]')?.value).to.equal('Clarity');
            expect(container.querySelector<HTMLTextAreaElement>('[name="criteria_description[]"]')?.value).to.equal(
                'How clear'
            );
        });

        it('renders the per-criterion empty scale message', () => {
            mount([createCriterion({ levels: [] })]);

            expect(container.querySelector('.criteria-container--level-empty')?.textContent).to.contain(
                'There are no grading scales'
            );
        });

        it('asks the host to activate tooltips after rendering', () => {
            mount(createCriteriaList(1));

            expect(host.activate).toHaveBeenCalled();
        });
    });

    // ── Form contract ──────────────────────────────────────────

    describe('form fields', () => {
        it('emits positional arrays for criterion fields', () => {
            mount(createCriteriaList(2));

            expect(fields('criteria_hash[]').map((node) => node.value)).to.deep.equal(['hash-1', 'hash-2']);
        });

        it('scopes level fields to their criterion index', () => {
            mount(createCriteriaList(2));

            expect(fields('criteria_0_level_points[]')).to.have.lengthOf(3);
            expect(fields('criteria_1_level_points[]')).to.have.lengthOf(3);
        });

        it('emits the joined standard ids per criterion', () => {
            mount([
                createCriterion({
                    standards: [createStandard({ standardId: 4 }), createStandard({ standardId: 7 })]
                })
            ]);

            expect(field('criteria_0_standard_ids')?.value).to.equal('4,7');
        });

        it('re-indexes level fields after a criterion is deleted', () => {
            mount(createCriteriaList(3));
            click(rows()[0].querySelector('.content-inner--name button'));

            expect(rows()).to.have.lengthOf(2);
            expect(fields('criteria_0_level_points[]')).to.have.lengthOf(3);
            expect(fields('criteria_1_level_points[]')).to.have.lengthOf(3);
            expect(fields('criteria_2_level_points[]')).to.have.lengthOf(0);
        });

        it('keeps criterion hashes in document order after a delete', () => {
            mount(createCriteriaList(3));
            click(rows()[1].querySelector('.content-inner--name button'));

            expect(fields('criteria_hash[]').map((node) => node.value)).to.deep.equal(['hash-1', 'hash-3']);
        });
    });

    // ── Editing text ───────────────────────────────────────────

    describe('editing text', () => {
        it('writes the name through to the model', () => {
            const instance = mount(createCriteriaList(1));
            type(field('criteria_name[]')!, 'Updated');

            expect(instance.criteria[0].name).to.equal('Updated');
        });

        it('writes the description through to the model', () => {
            const instance = mount(createCriteriaList(1));
            type(container.querySelector<HTMLTextAreaElement>('[name="criteria_description[]"]')!, 'Updated');

            expect(instance.criteria[0].description).to.equal('Updated');
        });

        it('writes a level description through to the model', () => {
            const instance = mount(createCriteriaList(1));
            type(container.querySelector<HTMLTextAreaElement>('[name="criteria_0_level_description[]"]')!, 'Updated');

            expect(instance.criteria[0].levels[0].description).to.equal('Updated');
        });

        it('does not rebuild the row while the name is being typed', () => {
            mount(createCriteriaList(1));
            const input = field('criteria_name[]')!;
            type(input, 'Still typing');

            expect(field('criteria_name[]')).to.equal(input);
        });
    });

    // ── Points ─────────────────────────────────────────────────

    describe('points', () => {
        it('recalculates the row and the total as points are typed', () => {
            mount([createCriterion({ levels: [{ hash: 'a', points: 3, description: '' }] })]);
            type(fields('criteria_0_level_points[]')[0], '12');

            expect(
                container.querySelector('.criteria-container--points span:not(.nt-rubric-sr-only)')?.textContent
            ).to.equal('12');
            expect(container.querySelector('.rubric-footer-container')?.textContent).to.contain(
                'Total Possible Points: 12'
            );
        });

        it('re-sorts the scale when a value overtakes another', () => {
            mount([
                createCriterion({
                    levels: [
                        { hash: 'a', points: 5, description: '' },
                        { hash: 'b', points: 1, description: '' }
                    ]
                })
            ]);
            type(fields('criteria_0_level_points[]')[1], '9');

            expect(fields('criteria_0_level_hash[]').map((node) => node.value)).to.deep.equal(['b', 'a']);
        });

        it('keeps the caret in the field being typed into while the scale re-sorts', () => {
            mount([
                createCriterion({
                    levels: [
                        { hash: 'a', points: 5, description: '' },
                        { hash: 'b', points: 1, description: '' }
                    ]
                })
            ]);

            const input = fields('criteria_0_level_points[]')[1];
            input.focus();
            input.value = '9';
            input.setSelectionRange(1, 1);
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(document.activeElement).to.equal(input);
            expect(input.value).to.equal('9');
            expect(input.selectionStart).to.equal(1);
        });

        it('scores a half-typed value as zero rather than breaking the total', () => {
            const instance = mount([createCriterion({ levels: [{ hash: 'a', points: 5, description: '' }] })]);
            type(fields('criteria_0_level_points[]')[0], '-');

            expect(instance.totalPoints).to.equal(0);
            expect(instance.criteria[0].levels[0].points).to.equal('-');
        });
    });

    // ── Criteria and levels ────────────────────────────────────

    describe('adding and removing', () => {
        it('adds a criterion from the footer button', () => {
            const instance = mount([]);
            click(container.querySelector('.rubric-footer-container button'));

            expect(instance.criteria).to.have.lengthOf(1);
            expect(rows()).to.have.lengthOf(1);
            expect(container.querySelector('.criteria-container--empty')).to.equal(null);
        });

        it('returns to the empty state when the last criterion goes', () => {
            mount(createCriteriaList(1));
            click(rows()[0].querySelector('.content-inner--name button'));

            expect(container.querySelector('.criteria-container--empty')).to.not.equal(null);
            expect(container.querySelector('.rubric-footer-container')?.textContent).to.contain(
                'Total Possible Points: 0'
            );
        });

        it('adds a level worth one more than the current best', () => {
            const instance = mount([createCriterion({ levels: [{ hash: 'a', points: 5, description: '' }] })]);
            click(container.querySelector('.level-add-handler-container button'));

            expect(instance.criteria[0].levels.map((level) => level.points)).to.deep.equal([6, 5]);
            expect(fields('criteria_0_level_points[]').map((node) => node.value)).to.deep.equal(['6', '5']);
        });

        it('removes the level whose button was clicked, not the first one', () => {
            const instance = mount(createCriteriaList(1));
            const removeButtons = container.querySelectorAll('.level-inner--points button');
            click(removeButtons[1]);

            expect(instance.criteria[0].levels.map((level) => level.hash)).to.deep.equal(['level-1-1', 'level-1-3']);
        });

        it('deletes the row whose button was clicked after a reorder', () => {
            const instance = mount(createCriteriaList(3));
            // What a completed drag does: the first criterion moves to the end.
            instance.moveCriterion(0, 2);

            expect(instance.criteria.map((criterion) => criterion.name)).to.deep.equal([
                'Criterion 2',
                'Criterion 3',
                'Criterion 1'
            ]);

            // Row handlers resolve their index when clicked rather than
            // capturing it at render time, so this deletes what it points at.
            click(rows()[2].querySelector('.content-inner--name button'));

            expect(instance.criteria.map((criterion) => criterion.name)).to.deep.equal(['Criterion 2', 'Criterion 3']);
        });

        it('re-indexes level and standard fields after a reorder', () => {
            const instance = mount([
                createCriterion({ name: 'First', levels: [{ hash: 'a', points: 1, description: '' }] }),
                createCriterion({
                    name: 'Second',
                    levels: [{ hash: 'b', points: 2, description: '' }],
                    standards: [createStandard({ standardId: 6 })]
                })
            ]);
            instance.moveCriterion(1, 0);

            // The standards-bearing criterion is now row 0, so its indexed
            // fields and tooltip id have to follow it.
            expect(field('criteria_0_standard_ids')?.value).to.equal('6');
            expect(field('criteria_1_standard_ids')?.value).to.equal('');
            expect(container.querySelector('#criteria-0-standard-6-tooltip')).to.not.equal(null);
            expect(fields('criteria_0_level_hash[]').map((node) => node.value)).to.deep.equal(['b']);
            expect(fields('criteria_hash[]')).to.have.lengthOf(2);
        });
    });

    // ── Standards ──────────────────────────────────────────────

    describe('standards', () => {
        it('opens the picker with the already-selected ids', () => {
            mount([createCriterion({ standards: [createStandard({ standardId: 3 })] })]);
            click(container.querySelector('.btnAddStandards'));

            expect(host.loadOverlay).toHaveBeenCalledWith(
                '/standards/select?selected_standard_ids=3',
                { cache: false },
                { className: 'overlay-xlarge-fullHeight' }
            );
        });

        it('builds the picker url with no ids when none are selected', () => {
            const instance = mount([createCriterion({ standards: [] })]);

            expect(instance.standardsPickerUrl(0)).to.equal('/standards/select?selected_standard_ids=');
        });

        it('builds the picker url for an out-of-range row without throwing', () => {
            const instance = mount([]);

            expect(instance.standardsPickerUrl(99)).to.equal('/standards/select?selected_standard_ids=');
        });

        it('adds a standard chosen in the picker to the row it was opened from', () => {
            const instance = mount(createCriteriaList(3));
            click(rows()[2].querySelector('.btnAddStandards'));

            document.dispatchEvent(
                new CustomEvent(SELECT_EVENT, {
                    detail: {
                        standardId: 42,
                        standardGuid: 'guid-42',
                        standardDescription: 'New standard',
                        standardNumberEnhanced: 'S.42.1'
                    }
                })
            );

            expect(instance.criteria[2].standards).to.have.lengthOf(1);
            expect(instance.criteria[2].standards[0].standardId).to.equal(42);
            expect(field('criteria_2_standard_ids')?.value).to.equal('42');
        });

        it('removes a standard cleared in the picker', () => {
            const instance = mount([createCriterion({ standards: [createStandard({ standardId: 10 })] })]);
            click(container.querySelector('.btnAddStandards'));

            document.dispatchEvent(new CustomEvent(REMOVE_EVENT, { detail: { standardId: '10' } }));

            expect(instance.criteria[0].standards).to.have.lengthOf(0);
        });

        it('removes a standard from its chip and dismisses the tooltip', () => {
            const instance = mount([
                createCriterion({ standards: [createStandard({ standardId: 1 }), createStandard({ standardId: 2 })] })
            ]);
            click(container.querySelector('.selected-standard button'));

            expect(instance.criteria[0].standards.map((standard) => standard.standardId)).to.deep.equal([2]);
            expect(host.hideTooltips).toHaveBeenCalledOnce();
        });

        it('parses a string description as HTML, preserving authored formatting', () => {
            mount([
                createCriterion({
                    standards: [createStandard({ standardDescription: 'Write <b>arguments</b>' })]
                })
            ]);

            expect(container.querySelector('#criteria-0-standard-1-tooltip b')?.textContent).to.equal('arguments');
        });

        it('lets a host render the description as a Node so nothing is HTML-parsed', () => {
            const safe = createMockHost();
            safe.renderStandardDescription = (description: string) => document.createTextNode(description);

            editor = new RubricEditor({
                container,
                host: safe,
                criteria: [
                    createCriterion({
                        standards: [createStandard({ standardDescription: '<img src=x onerror=alert(1)>' })]
                    })
                ]
            }).mount();

            const tooltip = container.querySelector('#criteria-0-standard-1-tooltip')!;
            expect(tooltip.querySelector('img')).to.equal(null);
            expect(tooltip.textContent).to.equal('<img src=x onerror=alert(1)>');
        });

        it('renders a hidden description node scoped to the criterion and standard', () => {
            mount([createCriterion({ standards: [createStandard({ standardId: 8 })] })]);
            const tooltip = container.querySelector('#criteria-0-standard-8-tooltip');

            expect(tooltip).to.not.equal(null);
            expect(tooltip?.textContent).to.contain('Standard description');
            // The editor asks the host what to put on the chip; it hardcodes
            // no host-specific markup hook of its own.
            expect(host.elementTooltipAttributes).toHaveBeenCalledWith('criteria-0-standard-8-tooltip');
        });

        it('re-scopes tooltip ids when the row index changes', () => {
            mount([createCriterion(), createCriterion({ standards: [createStandard({ standardId: 8 })] })]);
            click(rows()[0].querySelector('.content-inner--name button'));

            expect(container.querySelector('#criteria-0-standard-8-tooltip')).to.not.equal(null);
            expect(container.querySelector('#criteria-1-standard-8-tooltip')).to.equal(null);
        });

        it('adds a standard through the public method', () => {
            const instance = mount(createCriteriaList(1));
            instance.addStandard(0, createStandard({ standardId: 99 }));

            expect(instance.criteria[0].standards[0].standardId).to.equal(99);
        });
    });

    // ── Teardown ───────────────────────────────────────────────

    describe('destroy', () => {
        it('removes the rendered DOM', () => {
            const instance = mount(createCriteriaList(2));
            instance.destroy();

            expect(container.querySelector('.nt-rubric')).to.equal(null);
        });

        it('stops listening for standards events', () => {
            const instance = mount(createCriteriaList(1));
            click(container.querySelector('.btnAddStandards'));
            instance.destroy();

            document.dispatchEvent(
                new CustomEvent(SELECT_EVENT, {
                    detail: {
                        standardId: 1,
                        standardGuid: 'g',
                        standardDescription: 'd',
                        standardNumberEnhanced: 'S.1'
                    }
                })
            );

            expect(instance.criteria[0].standards).to.have.lengthOf(0);
        });

        it('is safe to call before mounting and more than once', () => {
            const instance = new RubricEditor({ container, host });

            expect(() => {
                instance.destroy();
                instance.destroy();
            }).to.not.throw();
        });

        it('can be mounted again after being destroyed', () => {
            const instance = mount(createCriteriaList(1));
            instance.destroy();
            instance.mount();

            expect(container.querySelectorAll('.criteria-container')).to.have.lengthOf(1);
        });
    });

    // ── Configuration ──────────────────────────────────────────

    describe('options', () => {
        it('honours a custom field prefix', () => {
            editor = new RubricEditor({
                container,
                host,
                criteria: createCriteriaList(1),
                fieldPrefix: 'rubric'
            }).mount();

            expect(field('rubric_name[]')).to.not.equal(null);
            expect(fields('rubric_0_level_points[]')).to.have.lengthOf(3);
        });

        it('honours a custom standards url', () => {
            editor = new RubricEditor({
                container,
                host,
                criteria: createCriteriaList(1),
                standardsUrl: '/custom/picker'
            }).mount();

            expect(editor.standardsPickerUrl(0)).to.equal('/custom/picker?selected_standard_ids=');
        });

        it('honours custom standards event names', () => {
            editor = new RubricEditor({
                container,
                host,
                criteria: createCriteriaList(1),
                selectStandardEvent: 'demo:select'
            }).mount();

            click(container.querySelector('.btnAddStandards'));
            document.dispatchEvent(
                new CustomEvent('demo:select', {
                    detail: {
                        standardId: 5,
                        standardGuid: 'g',
                        standardDescription: 'd',
                        standardNumberEnhanced: 'S.5'
                    }
                })
            );

            expect(editor.criteria[0].standards).to.have.lengthOf(1);
        });

        it('falls back to the global host bridge when none is supplied', () => {
            const globalHost = (globalThis as Record<string, unknown>)[DEFAULT_HOST_GLOBAL] as {
                activate: ReturnType<typeof vi.fn>;
            };
            editor = new RubricEditor({ container, criteria: createCriteriaList(1) }).mount();

            expect(globalHost.activate).toHaveBeenCalled();
        });

        it('reads a custom host global when named', () => {
            const activate = vi.fn();
            (globalThis as Record<string, unknown>).MyHost = { activate };

            editor = new RubricEditor({
                container,
                criteria: createCriteriaList(1),
                hostGlobal: 'MyHost'
            }).mount();

            expect(activate).toHaveBeenCalled();

            delete (globalThis as Record<string, unknown>).MyHost;
        });

        it('accepts a Node from the host icon helper', () => {
            const nodeHost = createMockHost();
            nodeHost.icon = () => {
                const svg = document.createElement('svg');
                svg.setAttribute('data-icon', 'true');

                return svg;
            };

            editor = new RubricEditor({ container, host: nodeHost, criteria: createCriteriaList(2) }).mount();

            // Cloned per call, so one cached node still renders on every control.
            expect(container.querySelectorAll('[data-icon]').length).to.be.greaterThan(2);
        });

        it('applies host tooltip attributes to the standard chips', () => {
            editor = new RubricEditor({
                container,
                host,
                criteria: [createCriterion({ standards: [createStandard({ standardId: 8 })] })]
            }).mount();

            // The attribute itself is the host's choice; the editor only asks
            // for it and applies whatever comes back.
            expect(container.querySelector('.enhanced-number')?.getAttribute('data-tooltip-target')).to.equal(
                '#criteria-0-standard-8-tooltip'
            );
        });
    });
});
