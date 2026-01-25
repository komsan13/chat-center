import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - check both locations
const rootDbPath = path.join(process.cwd(), 'dev.db');
const prismaDbPath = path.join(process.cwd(), 'prisma', 'dev.db');

let dbPath = prismaDbPath; // Default to prisma folder
if (fs.existsSync(rootDbPath) && !fs.existsSync(prismaDbPath)) {
  dbPath = rootDbPath;
}

console.log('Using database at:', dbPath);

const adapter = new PrismaBetterSqlite3({ url: dbPath });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// @ts-expect-error - Prisma 7 adapter type issue
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
