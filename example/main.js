(function () {
    // A small, realistic rubric — enough to show multi-level scales, an aligned
    // standard, and a criterion whose scale is still empty.
    var SEED = [
        {
            hash: 'c-argument',
            name: 'Argument',
            description: 'Makes a clear claim and supports it with evidence.',
            levels: [
                { hash: 'l-a-4', points: 4, description: 'Claim is precise and every point is evidenced.' },
                { hash: 'l-a-3', points: 3, description: 'Clear claim with mostly relevant evidence.' },
                { hash: 'l-a-2', points: 2, description: 'Claim is present but thinly supported.' },
                { hash: 'l-a-1', points: 1, description: 'No discernible claim.' }
            ],
            standards: [
                {
                    standardId: 101,
                    standardGuid: 'ccss-ela-w-6-1',
                    standardNumberEnhanced: 'W.6.1',
                    standardDescription: 'Write arguments to support claims with clear reasons and relevant evidence.'
                }
            ]
        },
        {
            hash: 'c-organization',
            name: 'Organization',
            description: 'Ideas are sequenced so the reader can follow them.',
            levels: [
                { hash: 'l-o-3', points: 3, description: 'Structure actively helps the argument land.' },
                { hash: 'l-o-2', points: 2, description: 'Mostly logical, with a few detours.' },
                { hash: 'l-o-1', points: 1, description: 'Hard to follow.' }
            ],
            standards: []
        },
        {
            hash: 'c-conventions',
            name: 'Conventions',
            description: 'Spelling, punctuation and grammar.',
            levels: [],
            standards: []
        }
    ];

    var editor = null;
    var statusEl = document.getElementById('status');

    function setStatus(text) {
        statusEl.textContent = text;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function build(criteria) {
        if (editor) {
            editor.destroy();
        }

        editor = new RubricEditor({
            container: '#nt-rubric-app',
            criteria: criteria
        }).mount();

        setStatus('Total possible points: ' + editor.totalPoints);
    }

    /*
     * The editor posts through the host's form rather than saving itself, so
     * the most honest thing a demo can show is the form data that would be
     * submitted. This is the actual contract with the server.
     */
    function showPayload() {
        var form = document.getElementById('rubric-form');
        var rows = [];

        new FormData(form).forEach(function (value, key) {
            rows.push(key + ' = ' + value);
        });

        document.getElementById('payload').textContent = rows.length
            ? rows.join('\n')
            : 'Nothing to post — the rubric is empty.';
    }

    window.addEventListener('load', function () {
        build(clone(SEED));

        document.getElementById('reset').addEventListener('click', function () {
            build(clone(SEED));
            document.getElementById('payload').textContent = '';
            setStatus('Reset to the sample rubric.');
        });

        document.getElementById('empty').addEventListener('click', function () {
            build([]);
            document.getElementById('payload').textContent = '';
            setStatus('Started from an empty rubric.');
        });

        document.getElementById('show-payload').addEventListener('click', showPayload);

        // Any edit can change the totals, and the editor keeps its own readouts
        // current — this just mirrors the total into the status line.
        document.getElementById('nt-rubric-app').addEventListener('input', function () {
            setStatus('Total possible points: ' + editor.totalPoints);
        });

        document.getElementById('nt-rubric-app').addEventListener('click', function () {
            setStatus('Total possible points: ' + editor.totalPoints);
        });

        document.getElementById('close-picker').addEventListener('click', function () {
            document.getElementById('standards-picker').close();
        });
    });
})();
