import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { candidateApiErrorResponse } from '@/lib/editorial/candidate-api-error';
import { updateCandidateDetails } from '@/lib/editorial/candidates';
import { parseCandidateDetails } from '@/lib/editorial/candidate-request';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const authResponse = requireAdminAuth(request);
    if (authResponse) return authResponse;

    try {
        const { id } = await params;
        const details = parseCandidateDetails(await request.json());
        const candidate = await updateCandidateDetails(id, details);
        if (!candidate) {
            return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
        }
        return NextResponse.json(candidate);
    } catch (error) {
        return candidateApiErrorResponse(error);
    }
}
