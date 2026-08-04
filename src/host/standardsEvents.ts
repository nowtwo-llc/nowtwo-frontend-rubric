import type { Standard } from '../types';

export interface StandardsEventNames {
    select: string;
    remove: string;
}

export interface StandardsEventHandlers {
    onSelect(standard: Standard): void;
    onRemove(standardId: number | string): void;
}

export const DEFAULT_STANDARDS_EVENTS: StandardsEventNames = {
    select: 'HE:StandardsTool:SelectStandard',
    remove: 'HE:StandardsTool:RemoveStandard'
};

interface SelectDetail extends Standard {}

interface RemoveDetail {
    standardId: number | string;
}

/**
 * Listens for the host's standards picker.
 *
 * The picker is a separate host component rendered into an overlay, so it
 * cannot call back into the editor directly — it announces choices as events on
 * `document` instead. Both are dispatched by the host; the editor only reads
 * them.
 *
 * Returns the detach function. Call it on teardown, otherwise a re-mounted
 * editor accumulates listeners and applies each selection more than once.
 */
export function bindStandardsEvents(names: StandardsEventNames, handlers: StandardsEventHandlers): () => void {
    const onSelect = (event: Event): void => {
        const detail = (event as CustomEvent<SelectDetail>).detail;
        if (!detail) {
            return;
        }

        handlers.onSelect({
            standardId: detail.standardId,
            standardGuid: detail.standardGuid,
            standardDescription: detail.standardDescription,
            standardNumberEnhanced: detail.standardNumberEnhanced
        });
    };

    const onRemove = (event: Event): void => {
        const detail = (event as CustomEvent<RemoveDetail>).detail;
        if (!detail) {
            return;
        }

        handlers.onRemove(detail.standardId);
    };

    document.addEventListener(names.select, onSelect);
    document.addEventListener(names.remove, onRemove);

    return () => {
        document.removeEventListener(names.select, onSelect);
        document.removeEventListener(names.remove, onRemove);
    };
}
