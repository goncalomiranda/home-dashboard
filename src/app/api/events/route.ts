import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/events - List events with optional date range filter
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        let sql = 'SELECT id, title, date_start, date_end, location, detailed_location, description, category, created_at, updated_at FROM core.event';
        const params: string[] = [];
        const conditions: string[] = [];

        if (dateFrom) {
            params.push(dateFrom);
            conditions.push(`date_start >= $${params.length}`);
        }
        if (dateTo) {
            params.push(dateTo);
            conditions.push(`(date_end <= $${params.length} OR (date_end IS NULL AND date_start <= $${params.length}))`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY date_start DESC NULLS LAST, created_at DESC';

        const result = await query(sql, params);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

// POST /api/events - Create a new event
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, date_start, date_end, location, detailed_location, description, category } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO core.event (title, date_start, date_end, location, detailed_location, description, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [title, date_start || null, date_end || null, location || '', detailed_location || '', description || '', category || '']
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        );
    }
}
