import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://aurix:aurix_secret_2026@localhost:5432/aurix_dashboard',
  },
  verbose: true,
  strict: true,
});
