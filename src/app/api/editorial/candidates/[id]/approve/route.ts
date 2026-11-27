import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { candidateApiErrorResponse } from '@/lib/editorial/candidate-api-error';
import { approveCandidate } from '@/lib/editorial/candidates';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const authResponse = requireAdminAuth(request);
    if (authResponse) return authResponse;

    try {
        const { id } = await params;
        const candidate = await approveCandidate(id);
        if (!candidate) {
            return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
        }
        return NextResponse.json(candidate);
    } catch (error) {
        return candidateApiErrorResponse(error);
    }
}
