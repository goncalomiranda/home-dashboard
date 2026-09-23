import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PUT /api/events/[id] - Update an event
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, date_start, date_end, location, detailed_location, description, category } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const result = await query(
            `UPDATE core.event
       SET title = $1, date_start = $2, date_end = $3, location = $4, detailed_location = $5, description = $6, category = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
            [title, date_start || null, date_end || null, location || '', detailed_location || '', description || '', category || '', id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to update event' },
            { status: 500 }
        );
    }
}

// DELETE /api/events/[id] - Delete an event
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await query(
            'DELETE FROM core.event WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to delete event' },
            { status: 500 }
        );
    }
}
