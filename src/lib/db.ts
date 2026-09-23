import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        pool = new Pool({
            host: process.env.POSTGRES_HOST,
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DATABASE,
        });
    }
    return pool;
}

export async function query(text: string, params?: any[]) {
    const pool = getPool();
    const result = await pool.query(text, params);
    return result;
}

export default { query, getPool };
