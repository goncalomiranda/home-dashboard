import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildCandidateListQuery,
    CandidateFilterValidationError,
    parseCandidateFilters,
} from './candidate-filters.ts';

test('parses supported candidate filters and trims category values', () => {
    const filters = parseCandidateFilters(new URLSearchParams(
        'status=NEEDS_REVIEW&category=%20Events%20&neighbourhood=Port+Credit',
    ));

    assert.deepEqual(filters, {
        status: 'NEEDS_REVIEW',
        category: 'Events',
        neighbourhood: 'Port Credit',
    });
});

test('rejects unknown status and neighbourhood filters', () => {
    assert.throws(
        () => parseCandidateFilters(new URLSearchParams('status=INVALID')),
        CandidateFilterValidationError,
    );
    assert.throws(
        () => parseCandidateFilters(new URLSearchParams('neighbourhood=Toronto')),
        CandidateFilterValidationError,
    );
});

test('uses bound parameters for category and neighbourhood filters', () => {
    const category = "Events' OR 1=1 --";
    const query = buildCandidateListQuery({
        status: 'NEEDS_REVIEW',
        category,
        neighbourhood: 'Lakeview',
    });

    assert.deepEqual(query.values, ['NEEDS_REVIEW', category, 'Lakeview']);
    assert.equal(query.text.includes(category), false);
    assert.match(query.text, /c\.status::text = \$1/);
    assert.match(query.text, /BTRIM\(c\.category\) = \$2/);
    assert.match(query.text, /neighbourhood::text = \$3/);
    assert.match(query.text, /candidate_neighbourhoods/);
});
