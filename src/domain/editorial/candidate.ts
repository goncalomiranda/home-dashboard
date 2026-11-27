export const EVENT_CANDIDATE_TYPE = 'event';

export type CandidateStatus =
    | 'DISCOVERED'
    | 'NEEDS_REVIEW'
    | 'APPROVED'
    | 'REJECTED';

export type Neighbourhood =
    | 'Clarkson'
    | 'Lorne Park'
    | 'Port Credit'
    | 'Lakeview';

export interface CandidateProvenance {
    readonly sourceUrl: string;
    readonly snapshotId?: string;
    readonly fetchedAt?: string;
}

export interface CandidateDetails {
    readonly headline?: string;
    readonly summary?: string;
    readonly category?: string;
    readonly neighbourhoods?: readonly Neighbourhood[];
    readonly provenance?: CandidateProvenance;
    readonly startDate?: string;
}

export interface CandidateCreation extends CandidateDetails {
    readonly candidateId: string;
    readonly candidateType: string;
}

export interface CandidateSnapshot extends CandidateCreation {
    readonly status: CandidateStatus;
    readonly discoveredAt: string;
    readonly reviewedAt?: string;
    readonly rejectionReason?: string;
}

export class CandidateTransitionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CandidateTransitionError';
    }
}

export class CandidateApprovalError extends Error {
    readonly invalidFields: readonly string[];

    constructor(invalidFields: readonly string[]) {
        super(`Candidate cannot be approved: ${invalidFields.join(', ')}`);
        this.name = 'CandidateApprovalError';
        this.invalidFields = Object.freeze([...invalidFields]);
    }
}

const neighbourhoods = new Set<Neighbourhood>([
    'Clarkson',
    'Lorne Park',
    'Port Credit',
    'Lakeview',
]);

function isNonEmpty(value: string | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function freezeSnapshot(snapshot: CandidateSnapshot): CandidateSnapshot {
    return Object.freeze({
        ...snapshot,
        neighbourhoods: snapshot.neighbourhoods
            ? Object.freeze([...snapshot.neighbourhoods])
            : undefined,
        provenance: snapshot.provenance
            ? Object.freeze({ ...snapshot.provenance })
            : undefined,
    });
}

function toIsoString(at: Date): string {
    return at.toISOString();
}

export class Candidate {
    readonly state: CandidateSnapshot;

    private constructor(state: CandidateSnapshot) {
        this.state = state;
    }

    static discover(
        creation: CandidateCreation,
        discoveredAt: Date = new Date(),
    ): Candidate {
        if (!isNonEmpty(creation.candidateId)) {
            throw new Error('Candidate ID is required.');
        }
        if (!isNonEmpty(creation.candidateType)) {
            throw new Error('Candidate type is required.');
        }

        return new Candidate(freezeSnapshot({
            ...creation,
            status: 'DISCOVERED',
            discoveredAt: toIsoString(discoveredAt),
        }));
    }

    submitForReview(): Candidate {
        if (this.state.status !== 'DISCOVERED') {
            throw new CandidateTransitionError(
                `Cannot submit a ${this.state.status} candidate for review.`,
            );
        }

        return this.withState({ status: 'NEEDS_REVIEW' });
    }

    correctDetails(details: CandidateDetails): Candidate {
        if (
            this.state.status !== 'DISCOVERED' &&
            this.state.status !== 'NEEDS_REVIEW'
        ) {
            throw new CandidateTransitionError(
                `Cannot edit a ${this.state.status} candidate.`,
            );
        }

        return this.withState(details);
    }

    approve(reviewedAt: Date = new Date()): Candidate {
        if (this.state.status !== 'NEEDS_REVIEW') {
            throw new CandidateTransitionError(
                `Cannot approve a ${this.state.status} candidate.`,
            );
        }

        const invalidFields: string[] = [];

        if (!isNonEmpty(this.state.headline)) invalidFields.push('headline');
        if (!isNonEmpty(this.state.summary)) invalidFields.push('summary');
        if (!isNonEmpty(this.state.category)) invalidFields.push('category');
        if (!isNonEmpty(this.state.provenance?.sourceUrl)) {
            invalidFields.push('provenance');
        }
        if (
            !this.state.neighbourhoods?.length ||
            this.state.neighbourhoods.some((value) => !neighbourhoods.has(value))
        ) {
            invalidFields.push('neighbourhoods');
        }
        if (
            this.state.candidateType === EVENT_CANDIDATE_TYPE &&
            !isNonEmpty(this.state.startDate)
        ) {
            invalidFields.push('startDate');
        }

        if (invalidFields.length > 0) {
            throw new CandidateApprovalError(invalidFields);
        }

        return this.withState({
            status: 'APPROVED',
            reviewedAt: toIsoString(reviewedAt),
        });
    }

    reject(reason: string, reviewedAt: Date = new Date()): Candidate {
        if (this.state.status !== 'NEEDS_REVIEW') {
            throw new CandidateTransitionError(
                `Cannot reject a ${this.state.status} candidate.`,
            );
        }
        if (!isNonEmpty(reason)) {
            throw new CandidateTransitionError(
                'A rejection reason is required.',
            );
        }

        return this.withState({
            status: 'REJECTED',
            rejectionReason: reason.trim(),
            reviewedAt: toIsoString(reviewedAt),
        });
    }

    private withState(changes: Partial<CandidateSnapshot>): Candidate {
        return new Candidate(freezeSnapshot({
            ...this.state,
            ...changes,
        }));
    }
}
