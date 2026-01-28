// Drizzle ORM Database Client
// PostgreSQL connection using postgres.js

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection URL - MUST be set via environment variable
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

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
