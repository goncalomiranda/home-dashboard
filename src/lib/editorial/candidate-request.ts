import type {
    CandidateDetails,
    CandidateProvenance,
    Neighbourhood,
} from '@/domain/editorial/candidate';

const neighbourhoods = new Set<Neighbourhood>([
    'Clarkson',
    'Lorne Park',
    'Port Credit',
    'Lakeview',
]);

function isNeighbourhood(value: unknown): value is Neighbourhood {
    return typeof value === 'string' && neighbourhoods.has(value as Neighbourhood);
}

export class CandidateRequestValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CandidateRequestValidationError';
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(
    input: Record<string, unknown>,
    field: string,
): string | undefined {
    if (!(field in input)) return undefined;
    if (typeof input[field] !== 'string') {
        throw new CandidateRequestValidationError(`${field} must be a string.`);
    }
    return input[field];
}

function validateDate(value: string, field: string): void {
    if (!value) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) {
        throw new CandidateRequestValidationError(`${field} must be a date in YYYY-MM-DD format.`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw new CandidateRequestValidationError(`${field} must be a valid date.`);
    }
}

export function parseCandidateDetails(input: unknown): CandidateDetails {
    if (!isRecord(input)) {
        throw new CandidateRequestValidationError('Candidate details must be an object.');
    }

    const details: {
        headline?: string;
        summary?: string;
        category?: string;
        neighbourhoods?: readonly Neighbourhood[];
        provenance?: CandidateProvenance;
        startDate?: string;
        endDate?: string;
        venue?: string;
        location?: string;
    } = {};
    for (const field of [
        'headline',
        'summary',
        'category',
        'startDate',
        'endDate',
        'venue',
        'location',
    ] as const) {
        const value = optionalString(input, field);
        if (value !== undefined) {
            if (field === 'startDate' || field === 'endDate') validateDate(value, field);
            details[field] = value;
        }
    }

    if ('neighbourhoods' in input) {
        const values = input.neighbourhoods;
        if (
            !Array.isArray(values) ||
            !values.every(isNeighbourhood)
        ) {
            throw new CandidateRequestValidationError(
                'Neighbourhoods must contain only supported values.',
            );
        }
        if (new Set(values).size !== values.length) {
            throw new CandidateRequestValidationError(
                'Neighbourhoods cannot contain duplicates.',
            );
        }
        details.neighbourhoods = values;
    }

    if ('provenance' in input) {
        if (!isRecord(input.provenance)) {
            throw new CandidateRequestValidationError('Provenance must be an object.');
        }

        const sourceUrl = optionalString(input.provenance, 'sourceUrl');
        const snapshotId = optionalString(input.provenance, 'snapshotId');
        const fetchedAt = optionalString(input.provenance, 'fetchedAt');
        if (sourceUrl === undefined) {
            throw new CandidateRequestValidationError(
                'Provenance must include a source URL.',
            );
        }
        details.provenance = {
            sourceUrl,
            ...(snapshotId !== undefined ? { snapshotId } : {}),
            ...(fetchedAt !== undefined ? { fetchedAt } : {}),
        };
    }

    return details;
}

export function parseRejectionReason(input: unknown): string {
    if (!isRecord(input) || typeof input.reason !== 'string') {
        throw new CandidateRequestValidationError('A rejection reason is required.');
    }
    if (!input.reason.trim()) {
        throw new CandidateRequestValidationError('A rejection reason is required.');
    }
    return input.reason;
}
