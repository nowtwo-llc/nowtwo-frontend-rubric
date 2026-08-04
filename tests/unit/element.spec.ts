import { describe, expect, it } from 'vitest';
import { clear, el, html, preserveFocus } from '../../src/dom/element';

describe('el', () => {
    it('creates an element with attributes', () => {
        const node = el('input', { type: 'text', name: 'field' });

        expect(node.tagName).to.equal('INPUT');
        expect(node.getAttribute('name')).to.equal('field');
    });

    it('stringifies numeric attribute values', () => {
        expect(el('div', { 'data-index': 3 }).getAttribute('data-index')).to.equal('3');
    });

    it('renders true as a bare attribute', () => {
        expect(el('input', { disabled: true }).getAttribute('disabled')).to.equal('');
    });

    it('drops false, null and undefined attributes', () => {
        const node = el('div', { a: false, b: null, c: undefined });

        expect(node.hasAttribute('a')).to.equal(false);
        expect(node.hasAttribute('b')).to.equal(false);
        expect(node.hasAttribute('c')).to.equal(false);
    });

    it('appends string and node children', () => {
        const node = el('div', {}, ['text', el('span', {}, ['inner'])]);

        expect(node.textContent).to.equal('textinner');
    });

    it('skips null and undefined children', () => {
        expect(el('div', {}, [null, undefined, 'only']).textContent).to.equal('only');
    });
});

describe('html', () => {
    it('parses markup', () => {
        expect(html('<i class="fa"></i>').querySelector('i')).to.not.equal(null);
    });

    it('applies an optional class name', () => {
        expect(html('x', 'align--left').className).to.equal('align--left');
    });
});

describe('clear', () => {
    it('removes every child', () => {
        const node = el('div', {}, ['a', el('span')]);
        clear(node);

        expect(node.childNodes).to.have.lengthOf(0);
    });
});

describe('preserveFocus', () => {
    it('restores focus and selection after the node is moved', () => {
        const container = el('div');
        const first = el('input', { type: 'text', value: 'first' });
        const second = el('input', { type: 'text', value: 'second' });
        container.append(first, second);
        document.body.append(container);

        second.focus();
        second.setSelectionRange(2, 4);

        preserveFocus(() => {
            // Re-appending an attached node moves it, which detaches and
            // reinserts it — the thing that would otherwise drop focus.
            container.append(second);
            container.append(first);
        });

        expect(document.activeElement).to.equal(second);
        expect(second.selectionStart).to.equal(2);
        expect(second.selectionEnd).to.equal(4);

        container.remove();
    });

    it('does nothing when focus is not in a text field', () => {
        const button = el('button');
        document.body.append(button);
        button.focus();

        expect(() => preserveFocus(() => {})).to.not.throw();

        button.remove();
    });

    it('does not restore focus to a node the mutation removed', () => {
        const input = el('input', { type: 'text' });
        document.body.append(input);
        input.focus();

        preserveFocus(() => input.remove());

        expect(document.activeElement).to.not.equal(input);
    });
});
