import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const AUTH_REALM = 'Home Dashboard Admin';

export function requireAdminAuth(request: Request): NextResponse | null {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        console.error('Admin authentication is unavailable: ADMIN_USERNAME and ADMIN_PASSWORD must be configured');
        return NextResponse.json(
            { error: 'Admin authentication is not configured' },
            { status: 503 }
        );
    }

    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Basic ')) {
        return unauthorizedResponse();
    }

    const received = Buffer.from(authorization.slice('Basic '.length), 'base64');
    const expected = Buffer.from(`${username}:${password}`);

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        return unauthorizedResponse();
    }

    return null;
}

function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        { error: 'Authentication required' },
        {
            status: 401,
            headers: {
                'WWW-Authenticate': `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
            },
        }
    );
}
