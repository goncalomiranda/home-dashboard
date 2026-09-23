import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// DELETE /api/crawl-jobs/[id] - Delete a crawl job
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await query(
            'DELETE FROM core.crawl_jobs WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to delete job' },
            { status: 500 }
        );
    }
}
