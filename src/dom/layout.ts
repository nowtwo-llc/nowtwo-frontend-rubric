import type { HostBridge } from '../types';
import { el, hostMarkup } from './element';

/**
 * The column header. It is a table purely so it inherits the host's `dataList`
 * styling and lines up with the rows underneath, which are flex.
 */
export function buildHeader(): HTMLElement {
    const columns = el('colgroup', {}, [
        el('col', { style: 'width: 20%' }),
        el('col'),
        el('col', { style: 'width: 10%' })
    ]);

    const headings = el('tr', { class: 'dataList-row dataList-row--header dataList-row--noHover' }, [
        el('th', { class: 'dataList-cell' }, ['Criteria']),
        el('th', { class: 'dataList-cell' }, ['Grading Scale']),
        el('th', { class: 'dataList-cell align--right' }, ['Max Points'])
    ]);

    return el('div', { class: 'dataList' }, [
        el('div', { class: 'dataList-table' }, [
            el('table', { class: 'dataList-table' }, [columns, el('tbody', {}, [headings])])
        ])
    ]);
}

export function buildEmptyState(): HTMLElement {
    // role="status" so the transition to and from empty is announced; it is the
    // only feedback that deleting the last criterion did anything.
    return el('div', { class: 'criteria-container--empty', role: 'status' }, [
        'This rubric has no criteria. In order to proceed please add one.',
        el('br'),
        'Use the "Add a Criteria" button below to add your first one.'
    ]);
}

export interface Footer {
    element: HTMLElement;
    setTotal(total: number): void;
}

export function buildFooter(host: HostBridge, onAdd: () => void): Footer {
    const total = el('span');
    const addButton = el('button', { type: 'button', class: 'button button--link' }, [
        el('span', { class: 'button-text' }, [hostMarkup(host.icon('regular', 'fa-plus')), ' Add a Criteria'])
    ]);
    addButton.addEventListener('click', onAdd);

    // The total is the one number that changes as a result of edits made
    // elsewhere on the page, so it is the one thing worth announcing. Polite,
    // because it updates on every keystroke in a point field.
    const element = el('div', { class: 'rubric-footer-container' }, [
        el('div', { class: 'float--right', role: 'status', 'aria-live': 'polite' }, ['Total Possible Points: ', total]),
        addButton
    ]);

    return {
        element,
        setTotal(value: number): void {
            total.textContent = String(value);
        }
    };
}
