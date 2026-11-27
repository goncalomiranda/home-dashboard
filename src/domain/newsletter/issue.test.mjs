import assert from 'node:assert/strict';
import test from 'node:test';
import { Candidate } from '../editorial/candidate.ts';
import {
    NewsletterIssue,
    NewsletterIssueInvariantError,
    NewsletterIssueTransitionError,
} from './issue.ts';

const issueCreation = {
    issueId: 'issue-1',
    title: 'Along the Lake - Week 28',
    publicationDate: '2026-07-12',
    windowStart: '2026-07-06',
    windowEnd: '2026-07-12',
};

function candidate(candidateId, overrides = {}) {
    return Candidate.discover({
        candidateId,
        candidateType: 'event',
        headline: `Headline ${candidateId}`,
        summary: `Summary ${candidateId}`,
        category: 'Events',
        neighbourhoods: ['Port Credit'],
        provenance: { sourceUrl: `https://example.com/${candidateId}` },
        startDate: '2026-07-10',
        ...overrides,
    })
        .submitForReview()
        .approve(new Date('2026-07-01T10:00:00.000Z'));
}

function issue() {
    return NewsletterIssue.create(
        issueCreation,
        new Date('2026-07-01T09:00:00.000Z'),
    );
}

function add(issueToChange, candidateId, section = 'Events') {
    return issueToChange.addCandidate(candidate(candidateId), section);
}

function itemsIn(issueSnapshot, section = 'Events') {
    return issueSnapshot.state.sections.find((value) => value.name === section)?.items ?? [];
}

test('creates a draft and validates issue metadata and publication window', () => {
    const created = issue();

    assert.equal(created.state.status, 'DRAFT');
    assert.equal(created.state.createdAt, '2026-07-01T09:00:00.000Z');
    assert.deepEqual(created.state.sections, []);
    assert.throws(
        () => NewsletterIssue.create({ ...issueCreation, title: '  ' }),
        NewsletterIssueInvariantError,
    );
    assert.throws(
        () => NewsletterIssue.create({
            ...issueCreation,
            windowStart: '2026-07-13',
        }),
        NewsletterIssueInvariantError,
    );
    assert.throws(
        () => NewsletterIssue.create({
            ...issueCreation,
            publicationDate: '2026-02-30',
        }),
        NewsletterIssueInvariantError,
    );
});

test('admits only approved candidates and prevents duplicates across sections', () => {
    const unapproved = Candidate.discover({
        candidateId: 'candidate-unapproved',
        candidateType: 'event',
        headline: 'Unapproved event',
        summary: 'Not approved.',
    });
    assert.throws(
        () => issue().addCandidate(unapproved, 'Events'),
        NewsletterIssueInvariantError,
    );

    const approved = candidate('candidate-1');
    const withCandidate = issue().addCandidate(approved, 'Events');
    assert.throws(
        () => withCandidate.addCandidate(approved, 'Food'),
        NewsletterIssueInvariantError,
    );
});

test('snapshots candidate content and allows issue-specific edits while draft', () => {
    const approved = candidate('candidate-1');
    const draft = issue().addCandidate(approved, 'Events');
    const [item] = itemsIn(draft);

    assert.equal(item.candidateId, 'candidate-1');
    assert.equal(item.headline, 'Headline candidate-1');
    assert.equal(item.summary, 'Summary candidate-1');

    const edited = draft.editItem(item.issueItemId, 'Issue headline', 'Issue summary');
    assert.equal(itemsIn(edited)[0].headline, 'Issue headline');
    assert.equal(itemsIn(edited)[0].summary, 'Issue summary');
    assert.equal(itemsIn(draft)[0].headline, 'Headline candidate-1');
    assert.equal(approved.state.headline, 'Headline candidate-1');
    assert.throws(
        () => draft.editItem(item.issueItemId, '  ', 'Summary'),
        NewsletterIssueInvariantError,
    );
});

test('removes and reorders items while maintaining continuous section positions', () => {
    const withItems = add(add(add(issue(), 'candidate-1'), 'candidate-2'), 'candidate-3');
    const [first, second, third] = itemsIn(withItems);

    const moved = withItems.moveItem(third.issueItemId, 1);
    assert.deepEqual(
        itemsIn(moved).map((item) => [item.candidateId, item.position]),
        [
            ['candidate-3', 1],
            ['candidate-1', 2],
            ['candidate-2', 3],
        ],
    );

    const removed = moved.removeItem(itemsIn(moved)[1].issueItemId);
    assert.deepEqual(
        itemsIn(removed).map((item) => [item.candidateId, item.position]),
        [
            ['candidate-3', 1],
            ['candidate-2', 2],
        ],
    );
    assert.deepEqual(
        withItems.state.sections[0].items.map((item) => item.position),
        [1, 2, 3],
    );
    assert.throws(
        () => withItems.moveItem(first.issueItemId, 0),
        NewsletterIssueInvariantError,
    );
    assert.throws(
        () => withItems.removeItem('missing-item'),
        NewsletterIssueInvariantError,
    );
    assert.equal(second.position, 2);
});

test('keeps positions independent between sections', () => {
    const withItems = add(add(issue(), 'candidate-1', 'Events'), 'candidate-2', 'Food');
    assert.equal(itemsIn(withItems, 'Events')[0].position, 1);
    assert.equal(itemsIn(withItems, 'Food')[0].position, 1);
});

test('enforces readiness and legal issue lifecycle transitions', () => {
    const draft = issue();
    assert.throws(
        () => draft.markReady(),
        NewsletterIssueInvariantError,
    );

    const ready = add(draft, 'candidate-1').markReady(
        new Date('2026-07-02T09:00:00.000Z'),
    );
    assert.equal(ready.state.status, 'READY');

    const returnedToDraft = ready.returnToDraft();
    assert.equal(returnedToDraft.state.status, 'DRAFT');
    const publishing = returnedToDraft.markReady().markPublishing();
    assert.equal(publishing.state.status, 'PUBLISHING');
    const published = publishing.markPublished({
        beehiivUrl: 'https://example.com/newsletter/1',
        beehiivExternalId: 'external-1',
    }, new Date('2026-07-03T09:00:00.000Z'));
    assert.equal(published.state.status, 'PUBLISHED');
    assert.deepEqual(published.state.publication, {
        beehiivUrl: 'https://example.com/newsletter/1',
        beehiivExternalId: 'external-1',
        publishedAt: '2026-07-03T09:00:00.000Z',
    });
    assert.throws(
        () => published.markPublishing(),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => publishing.markPublished({ beehiivUrl: 'ftp://invalid.example' }),
        NewsletterIssueInvariantError,
    );
});

test('allows publishing failure and draft cancellation only in their valid states', () => {
    const failed = add(issue(), 'candidate-1')
        .markReady()
        .markPublishing()
        .markFailed();
    assert.equal(failed.state.status, 'FAILED');
    assert.throws(
        () => failed.markPublishing(),
        NewsletterIssueTransitionError,
    );

    assert.equal(issue().cancel().state.status, 'CANCELLED');
    assert.throws(
        () => add(issue(), 'candidate-1').markReady().cancel(),
        NewsletterIssueTransitionError,
    );
});

test('prevents item changes after an issue becomes ready', () => {
    const ready = add(issue(), 'candidate-1').markReady();
    const [item] = itemsIn(ready);

    assert.throws(
        () => ready.removeItem(item.issueItemId),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => ready.moveItem(item.issueItemId, 1),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => ready.editItem(item.issueItemId, 'Changed', 'Changed'),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => ready.addCandidate(candidate('candidate-2'), 'Events'),
        NewsletterIssueTransitionError,
    );
});

test('makes published issue state and item snapshots immutable', () => {
    const draft = add(issue(), 'candidate-1');
    const item = itemsIn(draft)[0];
    const published = draft
        .markReady()
        .markPublishing()
        .markPublished({ beehiivUrl: 'https://example.com/published' });

    assert.throws(
        () => published.removeItem(item.issueItemId),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => published.moveItem(item.issueItemId, 1),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => published.editItem(item.issueItemId, 'Changed', 'Changed'),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => published.addCandidate(candidate('candidate-2'), 'Events'),
        NewsletterIssueTransitionError,
    );
    assert.throws(
        () => published.state.sections.push({ name: 'Food', items: [] }),
        TypeError,
    );
    assert.throws(
        () => {
            published.state.sections[0].items[0].headline = 'Changed';
        },
        TypeError,
    );
    assert.throws(
        () => {
            published.state.publication.beehiivUrl = 'https://changed.example';
        },
        TypeError,
    );
});
