import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { candidateApiErrorResponse } from '@/lib/editorial/candidate-api-error';
import { parseCandidateFilters } from '@/lib/editorial/candidate-filters';
import {
    listCandidateCategories,
    listCandidates,
} from '@/lib/editorial/candidates';

export async function GET(request: Request) {
    const authResponse = requireAdminAuth(request);
    if (authResponse) return authResponse;

    try {
        const { searchParams } = new URL(request.url);
        const filters = parseCandidateFilters(searchParams);
        const [candidates, categories] = await Promise.all([
            listCandidates(filters),
            listCandidateCategories(),
        ]);
        return NextResponse.json({ candidates, categories });
    } catch (error) {
        return candidateApiErrorResponse(error);
    }
}
