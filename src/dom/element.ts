export type Attributes = Record<string, string | number | boolean | null | undefined>;

export type Child = Node | string | null | undefined;

/**
 * Minimal element builder.
 *
 * `false`, `null` and `undefined` attribute values are dropped rather than
 * stringified, so conditional attributes read as `{ disabled: isLocked }`.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: Attributes = {},
    children: Child[] = []
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);

    Object.entries(attributes).forEach(([name, value]) => {
        if (value === null || value === undefined || value === false) {
            return;
        }

        node.setAttribute(name, value === true ? '' : String(value));
    });

    children.forEach((child) => {
        if (child === null || child === undefined) {
            return;
        }

        node.append(child);
    });

    return node;
}

/**
 * Inserts host-supplied markup.
 *
 * The two values that reach this are icon markup from the host's icon helper
 * and a standard's description, both of which are rendered as HTML by design —
 * see SECURITY.md. Nothing the person editing the rubric types ever goes
 * through here; their input is set with `value`/`textContent`.
 */
export function html(markup: string, className?: string): HTMLSpanElement {
    const node = document.createElement('span');
    if (className) {
        node.className = className;
    }
    node.innerHTML = markup;

    return node;
}

export function clear(node: HTMLElement): void {
    node.replaceChildren();
}

/**
 * Runs a DOM mutation without losing the caret.
 *
 * Moving an element with `append` detaches and reinserts it, which blurs it.
 * The scale re-sorts while someone is typing a point value, so without this the
 * field they are in loses focus on the keystroke that changes the order.
 */
export function preserveFocus(mutate: () => void): void {
    const active = document.activeElement;
    const isTextField = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
    const start = isTextField ? active.selectionStart : null;
    const end = isTextField ? active.selectionEnd : null;

    mutate();

    if (!isTextField || !active.isConnected) {
        return;
    }

    active.focus();

    if (start !== null && end !== null) {
        active.setSelectionRange(start, end);
    }
}
