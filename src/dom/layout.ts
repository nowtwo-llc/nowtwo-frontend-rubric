import type { HostBridge } from '../types';
import { el, html } from './element';

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
    return el('div', { class: 'criteria-container--empty' }, [
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
        el('span', { class: 'button-text' }, [html(host.icon('regular', 'fa-plus')), ' Add a Criteria'])
    ]);
    addButton.addEventListener('click', onAdd);

    const element = el('div', { class: 'rubric-footer-container' }, [
        el('div', { class: 'float--right' }, ['Total Possible Points: ', total]),
        addButton
    ]);

    return {
        element,
        setTotal(value: number): void {
            total.textContent = String(value);
        }
    };
}
