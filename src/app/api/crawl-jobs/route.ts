import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

// GET /api/crawl-jobs - List all crawl jobs
export async function GET(request: Request) {
    const authResponse = requireAdminAuth(request);
    if (authResponse) {
        return authResponse;
    }

    try {
        const result = await query(
            'SELECT id, status, error, created_at, started_at, finished_at FROM core.crawl_jobs ORDER BY created_at DESC'
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch crawl jobs' },
            { status: 500 }
        );
    }
}
