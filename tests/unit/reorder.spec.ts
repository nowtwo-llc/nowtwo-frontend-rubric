import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAG_HANDLE_CLASS } from '../../src/dom/CriterionRow';
import { bindReorder } from '../../src/sortable/reorder';

/**
 * Sortable is mocked rather than driven, because a real drag needs pointer
 * events and layout that jsdom does not provide. What matters here is the
 * contract either side of it: the options handed to Sortable, and what the
 * `onEnd` callback does with the indices it reports.
 */
interface SortableEvent {
    oldIndex?: number;
    newIndex?: number;
}

interface SortableOptions {
    handle: string;
    onEnd(event: SortableEvent): void;
}

const destroy = vi.fn<() => void>();
const create = vi.fn<(container: HTMLElement, options: SortableOptions) => { destroy: () => void }>(() => ({
    destroy
}));

vi.mock('sortablejs', () => ({
    default: {
        create: (container: HTMLElement, options: SortableOptions) => create(container, options)
    }
}));

describe('bindReorder', () => {
    let container: HTMLElement;
    let onReorder: ReturnType<typeof vi.fn<(from: number, to: number) => void>>;

    function options(): SortableOptions {
        return create.mock.calls[0][1];
    }

    beforeEach(() => {
        create.mockClear();
        destroy.mockClear();
        container = document.createElement('div');
        onReorder = vi.fn<(from: number, to: number) => void>();
        bindReorder(container, onReorder);
    });

    it('makes the given container sortable', () => {
        expect(create).toHaveBeenCalledOnce();
        expect(create.mock.calls[0][0]).to.equal(container);
    });

    it('restricts dragging to the row grip', () => {
        // Otherwise selecting text in a name or description starts a drag.
        expect(options().handle).to.equal(`.${DRAG_HANDLE_CLASS}`);
        expect(DRAG_HANDLE_CLASS).to.equal('criteria-container--drag-handle');
    });

    it('reports a completed move', () => {
        options().onEnd({ oldIndex: 0, newIndex: 2 });

        expect(onReorder).toHaveBeenCalledWith(0, 2);
    });

    it('ignores a drag that ended where it started', () => {
        options().onEnd({ oldIndex: 1, newIndex: 1 });

        expect(onReorder).not.toHaveBeenCalled();
    });

    it('ignores a drag with no reported indices', () => {
        options().onEnd({});
        options().onEnd({ oldIndex: 0 });
        options().onEnd({ newIndex: 0 });

        expect(onReorder).not.toHaveBeenCalled();
    });

    it('tears the Sortable instance down', () => {
        bindReorder(container, onReorder).destroy();

        expect(destroy).toHaveBeenCalled();
    });
});
