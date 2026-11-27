import { NextResponse } from 'next/server';
import {
    CandidateApprovalError,
    CandidateTransitionError,
} from '@/domain/editorial/candidate';
import {
    CandidateFilterValidationError,
} from './candidate-filters';
import { CandidateRequestValidationError } from './candidate-request';

export function candidateApiErrorResponse(error: unknown): NextResponse {
    if (error instanceof CandidateApprovalError) {
        return NextResponse.json(
            { error: error.message, invalidFields: error.invalidFields },
            { status: 422 },
        );
    }
    if (error instanceof CandidateTransitionError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
        error instanceof CandidateFilterValidationError ||
        error instanceof CandidateRequestValidationError
    ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    console.error('Editorial candidate API error:', error);
    return NextResponse.json(
        { error: 'Failed to process editorial candidate request.' },
        { status: 500 },
    );
}
