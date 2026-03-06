import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// For serverless, use postgres.js with max 1 in dev to avoid connection exhaustion
const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema });
export * from './schema';
