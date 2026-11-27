import assert from 'node:assert/strict';
import test from 'node:test';
import {
    Candidate,
    CandidateApprovalError,
    CandidateTransitionError,
} from './candidate.ts';

const details = {
    headline: 'Summer market',
    summary: 'A neighbourhood market this weekend.',
    category: 'Events',
    neighbourhoods: ['Port Credit'],
    provenance: { sourceUrl: 'https://example.com/market' },
};

function discover(overrides = {}) {
    return Candidate.discover({
        candidateId: 'candidate-1',
        candidateType: 'event',
        ...details,
        startDate: '2026-07-12',
        ...overrides,
    }, new Date('2026-06-01T12:00:00.000Z'));
}

test('approves a complete candidate after submission for review', () => {
    const discovered = discover();
    const submitted = discovered.submitForReview();
    const approved = submitted.approve(new Date('2026-06-02T12:00:00.000Z'));

    assert.equal(discovered.state.status, 'DISCOVERED');
    assert.equal(submitted.state.status, 'NEEDS_REVIEW');
    assert.equal(approved.state.status, 'APPROVED');
    assert.equal(approved.state.reviewedAt, '2026-06-02T12:00:00.000Z');
});

test('approval rejects each missing required field', () => {
    const missingFields = [
        ['headline', undefined],
        ['summary', undefined],
        ['category', undefined],
        ['provenance', undefined],
        ['neighbourhoods', []],
    ];

    for (const [field, value] of missingFields) {
        const candidate = discover({ [field]: value }).submitForReview();

        assert.throws(
            () => candidate.approve(),
            (error) =>
                error instanceof CandidateApprovalError &&
                error.invalidFields.includes(field),
            `expected ${field} to be required`,
        );
    }
});

test('event candidates require a start date before approval', () => {
    const candidate = discover({ startDate: undefined }).submitForReview();

    assert.throws(
        () => candidate.approve(),
        (error) =>
            error instanceof CandidateApprovalError &&
            error.invalidFields.includes('startDate'),
    );
});

test('corrects candidate and event details while in review', () => {
    const corrected = discover()
        .submitForReview()
        .correctDetails({
            headline: 'Updated summer market',
            venue: 'Port Credit Memorial Park',
            location: 'Port Credit',
        });

    assert.equal(corrected.state.status, 'NEEDS_REVIEW');
    assert.equal(corrected.state.headline, 'Updated summer market');
    assert.equal(corrected.state.venue, 'Port Credit Memorial Park');
    assert.equal(corrected.state.location, 'Port Credit');
});

test('rejects a candidate with a non-empty reason and records the decision time', () => {
    const rejected = discover()
        .submitForReview()
        .reject('  Outside the coverage area.  ', new Date('2026-06-02T12:00:00.000Z'));

    assert.equal(rejected.state.status, 'REJECTED');
    assert.equal(rejected.state.rejectionReason, 'Outside the coverage area.');
    assert.equal(rejected.state.reviewedAt, '2026-06-02T12:00:00.000Z');
});

test('does not allow empty rejection reasons or transitions from terminal states', () => {
    const inReview = discover().submitForReview();

    assert.throws(
        () => inReview.reject('  '),
        CandidateTransitionError,
    );
    assert.throws(() => discover().approve(), CandidateTransitionError);
    assert.throws(
        () => inReview.approve().correctDetails({ headline: 'Changed' }),
        CandidateTransitionError,
    );
    assert.throws(
        () => inReview.reject('Not suitable').submitForReview(),
        CandidateTransitionError,
    );
});

test('candidate neighbourhoods and provenance cannot be mutated through the snapshot', () => {
    const candidate = discover();

    assert.throws(
        () => candidate.state.neighbourhoods.push('Lakeview'),
        TypeError,
    );
    assert.throws(
        () => {
            candidate.state.provenance.sourceUrl = 'https://example.org';
        },
        TypeError,
    );
});
