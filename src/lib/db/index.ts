// Drizzle ORM Database Client
// PostgreSQL connection using postgres.js

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection URL
const connectionString = process.env.DATABASE_URL || 'postgresql://aurix:aurix_secret_2026@localhost:5432/aurix_dashboard';

// Create postgres connection
// Important: max 1 connection for Drizzle ORM (for serverless/edge)
const client = postgres(connectionString, {
  max: 10, // Max connections in pool
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from './schema';

// Helper function to close the connection (for graceful shutdown)
export async function closeDb() {
  await client.end();
}
