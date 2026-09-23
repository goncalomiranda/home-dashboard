import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/newsletter/[id] - Get a single crawled content item
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await query(
            'SELECT id, url, title, "content", created_at FROM public.crawled_content WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Content not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch content' },
            { status: 500 }
        );
    }
}

// DELETE /api/newsletter/[id] - Delete a crawled content item
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await query(
            'DELETE FROM public.crawled_content WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Content not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Content deleted successfully' });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to delete content' },
            { status: 500 }
        );
    }
}
