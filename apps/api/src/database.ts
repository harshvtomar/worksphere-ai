import { PrismaClient, Prisma } from '../../../packages/database/generated/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

let client: PrismaClient | undefined;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for authenticated features');
  return client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 }) });
}
export type Transaction = Prisma.TransactionClient;
