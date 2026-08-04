import Sortable from 'sortablejs';
import { DRAG_HANDLE_CLASS } from '../dom/CriterionRow';

export interface ReorderBinding {
    destroy(): void;
}

/**
 * Makes the criteria list drag-reorderable.
 *
 * Dragging is restricted to the grip in each row so that selecting text in a
 * name or description does not start a drag.
 *
 * Sortable moves the DOM node itself before `onEnd` fires, which is exactly
 * what the criterion-level `name[]` fields need — the server pairs those up by
 * document order. The callback then brings the model back in step, and the
 * editor re-indexes the rows so the level and standard field names follow.
 */
export function bindReorder(container: HTMLElement, onReorder: (from: number, to: number) => void): ReorderBinding {
    const sortable = Sortable.create(container, {
        handle: `.${DRAG_HANDLE_CLASS}`,
        onEnd(event) {
            const { oldIndex, newIndex } = event;
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
                return;
            }

            onReorder(oldIndex, newIndex);
        }
    });

    return {
        destroy(): void {
            sortable.destroy();
        }
    };
}
