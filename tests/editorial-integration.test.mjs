import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import pg from 'pg';

const databaseUrl = process.env.EDITORIAL_TEST_DATABASE_URL;
const baseUrl = process.env.EDITORIAL_TEST_BASE_URL;
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

test('editorial and newsletter migrations plus review API work against an isolated database', async () => {
    assert.ok(databaseUrl, 'Set EDITORIAL_TEST_DATABASE_URL to an empty test database.');
    assert.ok(baseUrl, 'Set EDITORIAL_TEST_BASE_URL to an app using that test database.');
    assert.ok(username && password, 'Set ADMIN_USERNAME and ADMIN_PASSWORD.');

    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
        const identity = await client.query('SELECT current_database() AS name');
        assert.match(identity.rows[0].name, /(^test_|_test$)/, 'Database name must identify a test database.');
        assert.equal(
            (await client.query("SELECT to_regnamespace('editorial') AS schema")).rows[0].schema,
            null,
            'The test database must not already contain the editorial schema.',
        );
        assert.equal(
            (await client.query("SELECT to_regnamespace('newsletter') AS schema")).rows[0].schema,
            null,
            'The test database must not already contain the newsletter schema.',
        );

        await client.query(`
            CREATE TABLE public.crawled_content (
                id integer PRIMARY KEY,
                url text NOT NULL,
                title text NOT NULL,
                content text NOT NULL
            )
        `);
        await client.query(
            'INSERT INTO public.crawled_content VALUES ($1, $2, $3, $4)',
            [1, 'https://example.com/source', 'Existing source', 'Original content'],
        );

        const migration = await readFile(
            new URL('../migrations/0001_editorial_candidates.sql', import.meta.url),
            'utf8',
        );
        await client.query(migration);
        const existing = await client.query('SELECT * FROM public.crawled_content WHERE id = 1');
        assert.equal(existing.rows[0].content, 'Original content');

        const newsletterMigration = await readFile(
            new URL('../migrations/0002_newsletter_issues.sql', import.meta.url),
            'utf8',
        );
        await client.query(newsletterMigration);

        await assert.rejects(
            client.query("INSERT INTO editorial.candidates (id, candidate_type, status) VALUES ('invalid', 'event', 'INVALID')"),
            { code: '23514' },
        );
        await assert.rejects(
            client.query("INSERT INTO editorial.candidates (id, candidate_type, status) VALUES ('invalid', 'event', 'REJECTED')"),
            { code: '23514' },
        );

        const eventId = randomUUID();
        const articleId = randomUUID();
        const discoveredId = randomUUID();
        await client.query(`
            INSERT INTO editorial.candidates
                (id, candidate_type, headline, category, status, provenance, crawled_content_id)
            VALUES
                ($1, 'event', 'Market', 'Events', 'NEEDS_REVIEW',
                 '{"sourceUrl":"https://example.com/source"}', 1),
                ($2, 'article', 'Food', 'Food', 'NEEDS_REVIEW',
                 '{"sourceUrl":"https://example.com/food"}', NULL),
                ($3, 'article', 'Discovered', NULL, 'DISCOVERED', NULL, NULL)
        `, [eventId, articleId, discoveredId]);
        await client.query(`
            INSERT INTO editorial.candidate_neighbourhoods (candidate_id, neighbourhood)
            VALUES ($1, 'Port Credit'), ($1, 'Lakeview'), ($2, 'Clarkson')
        `, [eventId, articleId]);
        await assert.rejects(
            client.query("INSERT INTO editorial.candidate_neighbourhoods VALUES ($1, 'Toronto')", [eventId]),
            { code: '23514' },
        );
        await assert.rejects(
            client.query("INSERT INTO editorial.candidate_neighbourhoods VALUES ($1, 'Port Credit')", [eventId]),
            { code: '23505' },
        );

        const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        async function request(path, options = {}) {
            const response = await fetch(new URL(path, baseUrl), {
                ...options,
                headers: { authorization, ...options.headers },
            });
            return { status: response.status, body: await response.json() };
        }

        const unauthenticated = await fetch(new URL('/api/editorial/candidates', baseUrl));
        assert.equal(unauthenticated.status, 401);

        const submitted = await request(`/api/editorial/candidates/${discoveredId}/submit`, { method: 'POST' });
        assert.equal(submitted.status, 200);
        assert.equal(submitted.body.status, 'NEEDS_REVIEW');

        const filtered = await request(
            '/api/editorial/candidates?status=NEEDS_REVIEW&category=Events&neighbourhood=Lakeview',
        );
        assert.equal(filtered.status, 200);
        assert.deepEqual(filtered.body.candidates.map((candidate) => candidate.candidateId), [eventId]);
        assert.deepEqual(filtered.body.candidates[0].neighbourhoods, ['Lakeview', 'Port Credit']);

        const invalidApproval = await request(`/api/editorial/candidates/${eventId}/approve`, { method: 'POST' });
        assert.equal(invalidApproval.status, 422);
        assert.ok(invalidApproval.body.invalidFields.includes('startDate'));
        assert.ok(invalidApproval.body.invalidFields.includes('summary'));

        const update = await request(`/api/editorial/candidates/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: 'A local market.',
                startDate: '2027-06-05',
                endDate: '',
                venue: 'Memorial Park',
                location: 'Port Credit',
            }),
        });
        assert.equal(update.status, 200);
        const saved = await client.query(
            'SELECT start_date::text, end_date, crawled_content_id FROM editorial.candidates WHERE id = $1',
            [eventId],
        );
        assert.deepEqual(saved.rows[0], {
            start_date: '2027-06-05',
            end_date: null,
            crawled_content_id: 1,
        });
        const invalidDate = await request(`/api/editorial/candidates/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: '2027-02-29' }),
        });
        assert.equal(invalidDate.status, 400);

        const approval = await request(`/api/editorial/candidates/${eventId}/approve`, { method: 'POST' });
        assert.equal(approval.status, 200);
        assert.equal(approval.body.status, 'APPROVED');
        const approved = await request('/api/editorial/candidates?status=APPROVED');
        assert.equal(approved.status, 200);
        assert.equal(approved.body.candidates[0].startDate, '2027-06-05');

        const issueId = randomUUID();
        await client.query(`
            INSERT INTO newsletter.issues
                (id, title, publication_date, window_start, window_end)
            VALUES ($1, 'June issue', '2027-06-12', '2027-06-07', '2027-06-13')
        `, [issueId]);
        const issue = await client.query(`
            SELECT title, publication_date::text, window_start::text, window_end::text,
                   status, created_at, updated_at
            FROM newsletter.issues
            WHERE id = $1
        `, [issueId]);
        assert.deepEqual(
            {
                title: issue.rows[0].title,
                publication_date: issue.rows[0].publication_date,
                window_start: issue.rows[0].window_start,
                window_end: issue.rows[0].window_end,
                status: issue.rows[0].status,
            },
            {
                title: 'June issue',
                publication_date: '2027-06-12',
                window_start: '2027-06-07',
                window_end: '2027-06-13',
                status: 'DRAFT',
            },
        );
        assert.ok(issue.rows[0].created_at);
        assert.ok(issue.rows[0].updated_at);
        await client.query(`
            INSERT INTO newsletter.issue_items
                (issue_id, candidate_id, headline_snapshot, summary_snapshot, section, position)
            VALUES ($1, $2, 'Edited market headline', 'Edited market summary', 'Events', 1)
        `, [issueId, eventId]);
        const issueItem = await client.query(`
            SELECT candidate_id, candidate_status, headline_snapshot, summary_snapshot,
                   section, position, created_at, updated_at
            FROM newsletter.issue_items
            WHERE issue_id = $1
        `, [issueId]);
        assert.deepEqual(
            {
                candidate_id: issueItem.rows[0].candidate_id,
                candidate_status: issueItem.rows[0].candidate_status,
                headline_snapshot: issueItem.rows[0].headline_snapshot,
                summary_snapshot: issueItem.rows[0].summary_snapshot,
                section: issueItem.rows[0].section,
                position: issueItem.rows[0].position,
            },
            {
                candidate_id: eventId,
                candidate_status: 'APPROVED',
                headline_snapshot: 'Edited market headline',
                summary_snapshot: 'Edited market summary',
                section: 'Events',
                position: 1,
            },
        );
        assert.ok(issueItem.rows[0].created_at);
        assert.ok(issueItem.rows[0].updated_at);
        await assert.rejects(
            client.query(`
                INSERT INTO newsletter.issue_items
                    (issue_id, candidate_id, headline_snapshot, summary_snapshot, section, position)
                VALUES ($1, $2, 'Draft candidate', 'Not approved', 'Events', 2)
            `, [issueId, discoveredId]),
            { code: '23503' },
        );
        await assert.rejects(
            client.query(`
                INSERT INTO newsletter.issue_items
                    (issue_id, candidate_id, headline_snapshot, summary_snapshot, section, position)
                VALUES ($1, $2, 'Duplicate candidate', 'Already included', 'Events', 2)
            `, [issueId, eventId]),
            { code: '23505' },
        );
        await client.query(`
            INSERT INTO newsletter.publications
                (issue_id, beehiiv_url, beehiiv_external_id, published_at)
            VALUES ($1, 'https://alongthelake.beehiiv.com/p/june', 'pub-june', now())
        `, [issueId]);
        const publication = await client.query(
            'SELECT beehiiv_url, beehiiv_external_id, published_at FROM newsletter.publications WHERE issue_id = $1',
            [issueId],
        );
        assert.deepEqual(
            {
                beehiiv_url: publication.rows[0].beehiiv_url,
                beehiiv_external_id: publication.rows[0].beehiiv_external_id,
            },
            {
                beehiiv_url: 'https://alongthelake.beehiiv.com/p/june',
                beehiiv_external_id: 'pub-june',
            },
        );
        assert.ok(publication.rows[0].published_at);

        const rejection = await request(`/api/editorial/candidates/${articleId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Outside the editorial scope' }),
        });
        assert.equal(rejection.status, 200);
        assert.equal(rejection.body.status, 'REJECTED');
        assert.equal(rejection.body.rejectionReason, 'Outside the editorial scope');

        // Test creating a candidate from crawled content
        const createFromCrawled = await request('/api/editorial/candidates/from-crawled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                crawledContentId: 1,
                headline: 'Community Gathering',
                summary: 'Join us for a local community gathering.',
                category: 'Community',
                neighbourhoods: ['Port Credit', 'Lakeview'],
                startDate: '2027-07-15',
                venue: 'Community Hall',
                location: 'Port Credit',
            }),
        });
        assert.equal(createFromCrawled.status, 201);
        assert.ok(createFromCrawled.body.candidateId);
        assert.equal(createFromCrawled.body.status, 'DISCOVERED');
        assert.equal(createFromCrawled.body.headline, 'Community Gathering');
        assert.equal(createFromCrawled.body.category, 'Community');
        assert.deepEqual(createFromCrawled.body.neighbourhoods, ['Lakeview', 'Port Credit']);
        assert.equal(createFromCrawled.body.provenance.sourceUrl, 'https://example.com/source');
        assert.equal(createFromCrawled.body.provenance.snapshotId, '1');
        assert.ok(createFromCrawled.body.candidateType);

        // Verify crawled content record still exists
        const still_exists = await client.query('SELECT * FROM public.crawled_content WHERE id = 1');
        assert.equal(still_exists.rows[0].title, 'Existing source');
    } finally {
        await client.end();
    }
});
