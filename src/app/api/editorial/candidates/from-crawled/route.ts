import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { candidateApiErrorResponse } from '@/lib/editorial/candidate-api-error';
import { parseCandidateDetails } from '@/lib/editorial/candidate-request';
import { createCandidateFromCrawledContent } from '@/lib/editorial/candidates';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
    const authResponse = requireAdminAuth(request);
    if (authResponse) return authResponse;

    try {
        const body = await request.json() as unknown;

        if (!isRecord(body)) {
            return NextResponse.json(
                { error: 'Request body must be an object.' },
                { status: 400 }
            );
        }

        const crawledContentId = body.crawledContentId;
        if (typeof crawledContentId !== 'number' || crawledContentId <= 0) {
            return NextResponse.json(
                { error: 'crawledContentId must be a positive number.' },
                { status: 400 }
            );
        }

        const details = parseCandidateDetails(body);
        const candidate = await createCandidateFromCrawledContent(
            crawledContentId,
            details,
        );

        return NextResponse.json(candidate, { status: 201 });
    } catch (error) {
        return candidateApiErrorResponse(error);
    }
}
