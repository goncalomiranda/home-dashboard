import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';

export function proxy(request: NextRequest) {
    const authResponse = requireAdminAuth(request);
    if (authResponse) {
        return authResponse;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/:path*'],
};
