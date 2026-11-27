import assert from 'node:assert/strict';
import test from 'node:test';
import {
    CandidateRequestValidationError,
    parseCandidateDetails,
    parseRejectionReason,
} from './candidate-request.ts';

test('candidate detail updates preserve omitted fields', () => {
    assert.deepEqual(
        parseCandidateDetails({ headline: 'A corrected headline' }),
        { headline: 'A corrected headline' },
    );
});

test('candidate detail updates reject unsupported neighbourhoods and incomplete provenance', () => {
    assert.throws(
        () => parseCandidateDetails({ neighbourhoods: ['Toronto'] }),
        CandidateRequestValidationError,
    );
    assert.throws(
        () => parseCandidateDetails({ provenance: {} }),
        CandidateRequestValidationError,
    );
});

test('rejection requires a non-empty reason', () => {
    assert.equal(parseRejectionReason({ reason: '  Not relevant  ' }), '  Not relevant  ');
    assert.throws(
        () => parseRejectionReason({ reason: '   ' }),
        CandidateRequestValidationError,
    );
});
