import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

// GET /api/newsletter - List all crawled content
export async function GET(request: Request) {
  const authResponse = requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const result = await query(
      'SELECT id, url, title, "content", created_at FROM public.crawled_content ORDER BY created_at DESC'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crawled content' },
      { status: 500 }
    );
  }
}
