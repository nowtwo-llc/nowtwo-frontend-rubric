import { describe, expect, it, vi } from 'vitest';
import { bindStandardsEvents, DEFAULT_STANDARDS_EVENTS } from '../../src/host/standardsEvents';

describe('bindStandardsEvents', () => {
    const names = DEFAULT_STANDARDS_EVENTS;

    function bind() {
        const handlers = { onSelect: vi.fn(), onRemove: vi.fn() };
        const detach = bindStandardsEvents(names, handlers);

        return { handlers, detach };
    }

    it('uses the host tool event names by default', () => {
        expect(names.select).to.equal('HE:StandardsTool:SelectStandard');
        expect(names.remove).to.equal('HE:StandardsTool:RemoveStandard');
    });

    it('forwards the selected standard', () => {
        const { handlers, detach } = bind();

        document.dispatchEvent(
            new CustomEvent(names.select, {
                detail: {
                    standardId: 7,
                    standardGuid: 'guid-7',
                    standardDescription: 'Description',
                    standardNumberEnhanced: 'S.7.1'
                }
            })
        );

        expect(handlers.onSelect).toHaveBeenCalledWith({
            standardId: 7,
            standardGuid: 'guid-7',
            standardDescription: 'Description',
            standardNumberEnhanced: 'S.7.1'
        });

        detach();
    });

    it('ignores extra properties on the event detail', () => {
        const { handlers, detach } = bind();

        document.dispatchEvent(
            new CustomEvent(names.select, {
                detail: {
                    standardId: 1,
                    standardGuid: 'g',
                    standardDescription: 'd',
                    standardNumberEnhanced: 'S.1',
                    unexpected: 'dropped'
                }
            })
        );

        expect(handlers.onSelect.mock.calls[0][0]).to.not.have.property('unexpected');

        detach();
    });

    it('forwards the removed standard id', () => {
        const { handlers, detach } = bind();

        document.dispatchEvent(new CustomEvent(names.remove, { detail: { standardId: '3' } }));

        expect(handlers.onRemove).toHaveBeenCalledWith('3');

        detach();
    });

    it('ignores events with no detail', () => {
        const { handlers, detach } = bind();

        document.dispatchEvent(new CustomEvent(names.select));
        document.dispatchEvent(new CustomEvent(names.remove));

        expect(handlers.onSelect).not.toHaveBeenCalled();
        expect(handlers.onRemove).not.toHaveBeenCalled();

        detach();
    });

    it('stops listening once detached', () => {
        const { handlers, detach } = bind();
        detach();

        document.dispatchEvent(new CustomEvent(names.remove, { detail: { standardId: 1 } }));

        expect(handlers.onRemove).not.toHaveBeenCalled();
    });

    it('honours custom event names', () => {
        const handlers = { onSelect: vi.fn(), onRemove: vi.fn() };
        const detach = bindStandardsEvents({ select: 'demo:select', remove: 'demo:remove' }, handlers);

        document.dispatchEvent(new CustomEvent('demo:remove', { detail: { standardId: 2 } }));

        expect(handlers.onRemove).toHaveBeenCalledWith(2);

        detach();
    });
});
