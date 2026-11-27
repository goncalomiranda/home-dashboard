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

test('accepts empty or valid event dates and rejects malformed dates', () => {
    assert.deepEqual(
        parseCandidateDetails({ startDate: '2028-02-29', endDate: '' }),
        { startDate: '2028-02-29', endDate: '' },
    );
    for (const date of ['2027-02-29', '2027-13-01', '0000-01-01', 'not-a-date']) {
        assert.throws(
            () => parseCandidateDetails({ startDate: date }),
            CandidateRequestValidationError,
        );
    }
});
