import type { CandidateStatus, Neighbourhood } from '@/domain/editorial/candidate';

const candidateStatuses = new Set<CandidateStatus>([
    'DISCOVERED',
    'NEEDS_REVIEW',
    'APPROVED',
    'REJECTED',
]);

const candidateNeighbourhoods = new Set<Neighbourhood>([
    'Clarkson',
    'Lorne Park',
    'Port Credit',
    'Lakeview',
]);

function isCandidateStatus(value: string): value is CandidateStatus {
    return candidateStatuses.has(value as CandidateStatus);
}

function isNeighbourhood(value: string): value is Neighbourhood {
    return candidateNeighbourhoods.has(value as Neighbourhood);
}

export interface CandidateFilters {
    readonly status?: CandidateStatus;
    readonly category?: string;
    readonly neighbourhood?: Neighbourhood;
}

export class CandidateFilterValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CandidateFilterValidationError';
    }
}

export function parseCandidateFilters(searchParams: URLSearchParams): CandidateFilters {
    const status = searchParams.get('status')?.trim();
    const category = searchParams.get('category')?.trim();
    const neighbourhood = searchParams.get('neighbourhood')?.trim();
    let parsedStatus: CandidateStatus | undefined;
    let parsedNeighbourhood: Neighbourhood | undefined;

    if (status) {
        if (!isCandidateStatus(status)) {
            throw new CandidateFilterValidationError('Invalid candidate status filter.');
        }
        parsedStatus = status;
    }
    if (neighbourhood) {
        if (!isNeighbourhood(neighbourhood)) {
            throw new CandidateFilterValidationError('Invalid neighbourhood filter.');
        }
        parsedNeighbourhood = neighbourhood;
    }

    return {
        ...(parsedStatus ? { status: parsedStatus } : {}),
        ...(category ? { category } : {}),
        ...(parsedNeighbourhood ? { neighbourhood: parsedNeighbourhood } : {}),
    };
}

export function buildCandidateListQuery(filters: CandidateFilters): {
    readonly text: string;
    readonly values: readonly string[];
} {
    const conditions: string[] = [];
    const values: string[] = [];

    if (filters.status) {
        values.push(filters.status);
        conditions.push(`c.status::text = $${values.length}`);
    }
    if (filters.category) {
        values.push(filters.category);
        conditions.push(`BTRIM(c.category) = $${values.length}`);
    }
    if (filters.neighbourhood) {
        values.push(filters.neighbourhood);
        conditions.push(
            `EXISTS (
                SELECT 1
                FROM editorial.candidate_neighbourhoods AS filtered_neighbourhood
                WHERE filtered_neighbourhood.candidate_id = c.id
                  AND filtered_neighbourhood.neighbourhood::text = $${values.length}
            )`,
        );
    }

    return {
        text: `
            SELECT
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
            ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
            ORDER BY c.discovered_at ASC, c.id ASC
        `,
        values,
    };
}
