import { defineConfig } from 'drizzle-kit';

// In Docker, use 'db' as hostname; locally use 'localhost'
const defaultUrl = process.env.NODE_ENV === 'production' 
  ? 'postgresql://aurix:aurix_secret_2026@db:5432/aurix_dashboard'
  : 'postgresql://aurix:aurix_secret_2026@localhost:5432/aurix_dashboard';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || defaultUrl,
  },
  verbose: true,
  strict: true,
});
