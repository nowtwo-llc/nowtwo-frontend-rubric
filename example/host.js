/*
 * A complete host bridge for this page.
 *
 * The editor takes everything host-specific through one object, so a page that
 * defines `window.RubricHost` before mounting gets full integration without
 * writing any module code. This file is both the demo's plumbing and a worked
 * example of what a real host supplies.
 */
(function () {
    var ICONS = {
        'fa-plus':
            '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 1h2v6h6v2H9v6H7V9H1V7h6z"/></svg>',
        'fa-trash':
            '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 1h4l1 1h3v2H2V2h3zM3 5h10l-1 10H4z"/></svg>',
        'fa-ellipsis-v':
            '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle fill="currentColor" cx="8" cy="3" r="1.6"/><circle fill="currentColor" cx="8" cy="8" r="1.6"/><circle fill="currentColor" cx="8" cy="13" r="1.6"/></svg>'
    };

    // Stands in for the host's standards library.
    var LIBRARY = [
        {
            standardId: 101,
            standardGuid: 'ccss-ela-w-6-1',
            standardNumberEnhanced: 'W.6.1',
            standardDescription: 'Write arguments to support claims with clear reasons and relevant evidence.'
        },
        {
            standardId: 102,
            standardGuid: 'ccss-ela-w-6-4',
            standardNumberEnhanced: 'W.6.4',
            standardDescription:
                'Produce clear and coherent writing in which the development, organization, and style are appropriate to task, purpose, and audience.'
        },
        {
            standardId: 103,
            standardGuid: 'ccss-ela-sl-6-4',
            standardNumberEnhanced: 'SL.6.4',
            standardDescription:
                'Present claims and findings, sequencing ideas logically and using pertinent descriptions, facts, and details.'
        },
        {
            standardId: 104,
            standardGuid: 'ccss-ela-l-6-2',
            standardNumberEnhanced: 'L.6.2',
            standardDescription:
                'Demonstrate command of the conventions of standard English capitalization, punctuation, and spelling when writing.'
        }
    ];

    function selectedIdsFrom(url) {
        var match = /selected_standard_ids=([^&]*)/.exec(url);
        if (!match || !match[1]) {
            return [];
        }

        return match[1].split(',');
    }

    /*
     * The real picker is a server-rendered overlay. It announces choices as
     * events on `document` rather than calling the editor, which is why the
     * editor listens for them — so the demo does exactly the same.
     */
    function openPicker(url) {
        var selected = selectedIdsFrom(url);
        var overlay = document.getElementById('standards-picker');
        var list = document.getElementById('standards-picker-list');

        list.replaceChildren();

        LIBRARY.forEach(function (standard) {
            var isSelected = selected.indexOf(String(standard.standardId)) !== -1;

            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'nt-btn' + (isSelected ? ' is-selected' : '');
            button.innerHTML =
                '<strong>' + standard.standardNumberEnhanced + '</strong> ' + standard.standardDescription;

            button.addEventListener('click', function () {
                document.dispatchEvent(
                    new CustomEvent(
                        isSelected ? 'HE:StandardsTool:RemoveStandard' : 'HE:StandardsTool:SelectStandard',
                        { detail: standard }
                    )
                );
                overlay.close();
            });

            list.append(button);
        });

        overlay.showModal();
    }

    /*
     * Shows a standard's description on hover by copying it out of the hidden
     * node the editor renders for it. A host with a real tooltip library would
     * return its own attributes from elementTooltipAttributes() and let the
     * library do this work instead.
     */
    function attachDescriptionTooltip(element) {
        var targetId = element.getAttribute('data-tooltip-target');
        var source = targetId && document.querySelector(targetId);
        if (source && !element.title) {
            element.title = source.textContent.trim();
        }
    }

    window.RubricHost = {
        icon: function (style, icon) {
            return ICONS[icon] || '';
        },

        // The editor already sets `title` on its controls, and this page is
        // happy with the browser's native tooltip — so there is nothing to add.
        tooltipAttributes: function () {
            return {};
        },

        elementTooltipAttributes: function (targetId) {
            return { 'data-tooltip-target': '#' + targetId };
        },

        // Called after the editor inserts nodes, which is where a host wires up
        // whatever its markup hooks imply.
        activate: function (root) {
            root.querySelectorAll('[data-tooltip-target]').forEach(attachDescriptionTooltip);
        },

        loadOverlay: function (url) {
            openPicker(url);
        },

        hideTooltips: function () {}
    };
})();
