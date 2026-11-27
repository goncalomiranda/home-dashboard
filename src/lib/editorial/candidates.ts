import {
    Candidate,
    type CandidateCreation,
    type CandidateDetails,
    type CandidateProvenance,
    type CandidateSnapshot,
    type CandidateStatus,
    type Neighbourhood,
} from '@/domain/editorial/candidate';
import { getPool } from '@/lib/db';
import type { PoolClient } from 'pg';
import {
    buildCandidateListQuery,
    type CandidateFilters,
} from './candidate-filters';

interface CandidateRow {
    id: string | number;
    candidate_type: string;
    headline: string | null;
    summary: string | null;
    category: string | null;
    status: string;
    provenance: unknown;
    start_date: string | null;
    end_date: string | null;
    venue: string | null;
    location: string | null;
    discovered_at: string | Date;
    reviewed_at: string | Date | null;
    rejection_reason: string | null;
    neighbourhoods: string[];
}

const statuses = new Set<CandidateStatus>([
    'DISCOVERED',
    'NEEDS_REVIEW',
    'APPROVED',
    'REJECTED',
]);

const neighbourhoodValues = new Set<Neighbourhood>([
    'Clarkson',
    'Lorne Park',
    'Port Credit',
    'Lakeview',
]);

function isNeighbourhood(value: string): value is Neighbourhood {
    return neighbourhoodValues.has(value as Neighbourhood);
}

function toDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseProvenance(value: unknown): CandidateProvenance | undefined {
    if (value === null || value === undefined) return undefined;
    if (!isRecord(value)) {
        throw new Error('Candidate provenance has an invalid database shape.');
    }

    const provenance = value;
    if (typeof provenance.sourceUrl !== 'string') {
        throw new Error('Candidate provenance is missing its source URL.');
    }
    if (
        provenance.snapshotId !== undefined &&
        typeof provenance.snapshotId !== 'string'
    ) {
        throw new Error('Candidate provenance has an invalid snapshot ID.');
    }
    if (
        provenance.fetchedAt !== undefined &&
        typeof provenance.fetchedAt !== 'string'
    ) {
        throw new Error('Candidate provenance has an invalid fetch time.');
    }

    return {
        sourceUrl: provenance.sourceUrl,
        ...(typeof provenance.snapshotId === 'string'
            ? { snapshotId: provenance.snapshotId }
            : {}),
        ...(typeof provenance.fetchedAt === 'string'
            ? { fetchedAt: provenance.fetchedAt }
            : {}),
    };
}

function toNeighbourhoods(values: readonly string[]): Neighbourhood[] {
    return values.map((value) => {
        if (!isNeighbourhood(value)) {
            throw new Error(`Unsupported candidate neighbourhood in database: ${value}`);
        }
        return value;
    });
}

function isCandidateStatus(value: string): value is CandidateStatus {
    return statuses.has(value as CandidateStatus);
}

function toCandidate(row: CandidateRow): Candidate {
    if (!isCandidateStatus(row.status)) {
        throw new Error(`Unsupported candidate status in database: ${row.status}`);
    }

    const creation: CandidateCreation = {
        candidateId: String(row.id),
        candidateType: row.candidate_type,
        headline: row.headline ?? undefined,
        summary: row.summary ?? undefined,
        category: row.category ?? undefined,
        neighbourhoods: toNeighbourhoods(row.neighbourhoods),
        provenance: parseProvenance(row.provenance),
        startDate: row.start_date ?? undefined,
        endDate: row.end_date ?? undefined,
        venue: row.venue ?? undefined,
        location: row.location ?? undefined,
    };

    let candidate = Candidate.discover(creation, toDate(row.discovered_at));

    if (row.status !== 'DISCOVERED') {
        candidate = candidate.submitForReview();
    }
    if (row.status === 'APPROVED') {
        candidate = candidate.approve(
            row.reviewed_at ? toDate(row.reviewed_at) : new Date(row.discovered_at),
        );
    } else if (row.status === 'REJECTED') {
        if (!row.rejection_reason) {
            throw new Error('Rejected candidate is missing its rejection reason.');
        }
        candidate = candidate.reject(
            row.rejection_reason,
            row.reviewed_at ? toDate(row.reviewed_at) : new Date(row.discovered_at),
        );
    }

    return candidate;
}

function toSnapshot(row: CandidateRow): CandidateSnapshot {
    return toCandidate(row).state;
}

function snapshotToRow(candidate: CandidateSnapshot): CandidateRow {
    return {
        id: candidate.candidateId,
        candidate_type: candidate.candidateType,
        headline: candidate.headline ?? null,
        summary: candidate.summary ?? null,
        category: candidate.category ?? null,
        status: candidate.status,
        provenance: candidate.provenance ?? null,
        start_date: candidate.startDate ?? null,
        end_date: candidate.endDate ?? null,
        venue: candidate.venue ?? null,
        location: candidate.location ?? null,
        discovered_at: candidate.discoveredAt,
        reviewed_at: candidate.reviewedAt ?? null,
        rejection_reason: candidate.rejectionReason ?? null,
        neighbourhoods: [...(candidate.neighbourhoods ?? [])],
    };
}

async function findCandidate(
    client: PoolClient,
    candidateId: string,
): Promise<CandidateSnapshot | null> {
    const result = await client.query<CandidateRow>(
        `SELECT
            c.id,
            c.candidate_type,
            c.headline,
            c.summary,
            c.category,
            c.status::text AS status,
            c.provenance,
            c.start_date,
            c.end_date,
            c.venue,
            c.location,
            c.discovered_at,
            c.reviewed_at,
            c.rejection_reason,
            ARRAY(
                SELECT candidate_neighbourhood.neighbourhood::text
                FROM editorial.candidate_neighbourhoods AS candidate_neighbourhood
                WHERE candidate_neighbourhood.candidate_id = c.id
                ORDER BY candidate_neighbourhood.neighbourhood::text
            ) AS neighbourhoods
        FROM editorial.candidates AS c
        WHERE c.id = $1
        FOR UPDATE`,
        [candidateId],
    );

    return result.rows[0] ? toSnapshot(result.rows[0]) : null;
}

async function inTransaction<T>(
    work: (client: PoolClient) => Promise<T>,
): Promise<T> {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function persistCandidateDetails(
    client: PoolClient,
    candidate: CandidateSnapshot,
): Promise<void> {
    await client.query(
        `UPDATE editorial.candidates
        SET headline = $2,
            summary = $3,
            category = $4,
            provenance = $5::jsonb,
            start_date = $6,
            end_date = $7,
            venue = $8,
            location = $9
        WHERE id = $1`,
        [
            candidate.candidateId,
            candidate.headline ?? null,
            candidate.summary ?? null,
            candidate.category ?? null,
            JSON.stringify(candidate.provenance ?? null),
            candidate.startDate ?? null,
            candidate.endDate ?? null,
            candidate.venue ?? null,
            candidate.location ?? null,
        ],
    );

    await client.query(
        'DELETE FROM editorial.candidate_neighbourhoods WHERE candidate_id = $1',
        [candidate.candidateId],
    );
    for (const neighbourhood of candidate.neighbourhoods ?? []) {
        await client.query(
            `INSERT INTO editorial.candidate_neighbourhoods (candidate_id, neighbourhood)
            VALUES ($1, $2)`,
            [candidate.candidateId, neighbourhood],
        );
    }
}

async function persistStatus(
    client: PoolClient,
    candidate: CandidateSnapshot,
): Promise<void> {
    await client.query(
        `UPDATE editorial.candidates
        SET status = $2,
            reviewed_at = $3,
            rejection_reason = $4
        WHERE id = $1`,
        [
            candidate.candidateId,
            candidate.status,
            candidate.reviewedAt ?? null,
            candidate.rejectionReason ?? null,
        ],
    );
}

export async function listCandidates(
    filters: CandidateFilters,
): Promise<CandidateSnapshot[]> {
    const { text, values } = buildCandidateListQuery(filters);
    const result = await getPool().query<CandidateRow>(text, [...values]);
    return result.rows.map(toSnapshot);
}

export async function listCandidateCategories(): Promise<string[]> {
    const result = await getPool().query<{ category: string }>(
        `SELECT DISTINCT BTRIM(category) AS category
        FROM editorial.candidates
        WHERE category IS NOT NULL AND BTRIM(category) <> ''
        ORDER BY BTRIM(category)`,
    );
    return result.rows.map((row) => row.category);
}

export async function updateCandidateDetails(
    candidateId: string,
    details: CandidateDetails,
): Promise<CandidateSnapshot | null> {
    return inTransaction(async (client) => {
        const current = await findCandidate(client, candidateId);
        if (!current) return null;

        const row = snapshotToRow(current);
        const correctedCandidate = toCandidate(row).correctDetails(details);
        await persistCandidateDetails(client, correctedCandidate.state);
        return correctedCandidate.state;
    });
}

export async function submitCandidateForReview(
    candidateId: string,
): Promise<CandidateSnapshot | null> {
    return inTransaction(async (client) => {
        const current = await findCandidate(client, candidateId);
        if (!current) return null;

        const candidate = toCandidate(snapshotToRow(current)).submitForReview();

        await persistStatus(client, candidate.state);
        return candidate.state;
    });
}

export async function approveCandidate(
    candidateId: string,
): Promise<CandidateSnapshot | null> {
    return inTransaction(async (client) => {
        const current = await findCandidate(client, candidateId);
        if (!current) return null;

        const approved = toCandidate(snapshotToRow(current)).approve();
        await persistStatus(client, approved.state);
        return approved.state;
    });
}

export async function rejectCandidate(
    candidateId: string,
    reason: string,
): Promise<CandidateSnapshot | null> {
    return inTransaction(async (client) => {
        const current = await findCandidate(client, candidateId);
        if (!current) return null;

        const rejected = toCandidate(snapshotToRow(current)).reject(reason);
        await persistStatus(client, rejected.state);
        return rejected.state;
    });
}
