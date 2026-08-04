import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGlobalHost, DEFAULT_HOST_GLOBAL } from '../../src/host/globalHost';
import { installHostGlobal, removeHostGlobal } from '../setup';

type MockedHost = Record<string, ReturnType<typeof vi.fn>>;

function hostGlobal(): MockedHost {
    return (globalThis as Record<string, unknown>)[DEFAULT_HOST_GLOBAL] as MockedHost;
}

describe('createGlobalHost', () => {
    afterEach(() => {
        installHostGlobal();
    });

    it('reads a global named RubricHost by default', () => {
        expect(DEFAULT_HOST_GLOBAL).to.equal('RubricHost');
    });

    describe('with a host global present', () => {
        it('delegates icon lookups', () => {
            expect(createGlobalHost().icon('regular', 'fa-plus')).to.equal('<i class="regular fa-plus"></i>');
        });

        it('delegates tooltip attributes', () => {
            expect(createGlobalHost().tooltipAttributes()).to.deep.equal({ 'data-tooltip': 'true' });
        });

        it('delegates element tooltip attributes', () => {
            expect(createGlobalHost().elementTooltipAttributes('abc')).to.deep.equal({
                'data-tooltip-target': '#abc'
            });
        });

        it('delegates activate', () => {
            const root = document.createElement('div');
            createGlobalHost().activate(root);

            expect(hostGlobal().activate).toHaveBeenCalledWith(root);
        });

        it('delegates loadOverlay', () => {
            createGlobalHost().loadOverlay('/url', { cache: false }, { className: 'wide' });

            expect(hostGlobal().loadOverlay).toHaveBeenCalledWith('/url', { cache: false }, { className: 'wide' });
        });

        it('delegates hideTooltips', () => {
            createGlobalHost().hideTooltips();

            expect(hostGlobal().hideTooltips).toHaveBeenCalled();
        });
    });

    describe('with a custom global name', () => {
        it('reads the named global instead', () => {
            (globalThis as Record<string, unknown>).MyHost = {
                icon: () => '<svg></svg>'
            };

            expect(createGlobalHost('MyHost').icon('regular', 'fa-plus')).to.equal('<svg></svg>');

            delete (globalThis as Record<string, unknown>).MyHost;
        });
    });

    describe('without a host global', () => {
        it('degrades to no-ops rather than throwing', () => {
            removeHostGlobal();
            const host = createGlobalHost();

            expect(host.icon('regular', 'fa-plus')).to.equal('');
            expect(host.tooltipAttributes()).to.deep.equal({});
            expect(host.elementTooltipAttributes('abc')).to.deep.equal({});
            expect(() => host.activate(document.createElement('div'))).to.not.throw();
            expect(() => host.loadOverlay('/url', {}, {})).to.not.throw();
            expect(() => host.hideTooltips()).to.not.throw();
        });

        it('tolerates a partially implemented host', () => {
            (globalThis as Record<string, unknown>)[DEFAULT_HOST_GLOBAL] = { icon: () => '<svg></svg>' };
            const host = createGlobalHost();

            expect(host.icon('regular', 'fa-plus')).to.equal('<svg></svg>');
            expect(host.tooltipAttributes()).to.deep.equal({});
            expect(() => host.hideTooltips()).to.not.throw();
        });

        /**
         * The bundle is routinely loaded before the host page finishes wiring
         * itself up, so the bridge has to pick the global up whenever it
         * appears rather than capturing it at construction.
         */
        it('picks the global up if it appears after the bridge is created', () => {
            removeHostGlobal();
            const host = createGlobalHost();

            installHostGlobal();

            expect(host.icon('regular', 'fa-trash')).to.equal('<i class="regular fa-trash"></i>');
        });
    });
});
