/**
 * High Availability PostgreSQL Database Configuration
 *
 * Supports read/write separation for HA PostgreSQL setups:
 * - Write operations: Primary node (POSTGRES_PRISMA_URL)
 * - Read operations: Read replica(s) (POSTGRES_READ_URL or falls back to primary)
 *
 * Environment Variables:
 * - POSTGRES_PRISMA_URL: Primary database URL for writes (with connection pooling)
 * - POSTGRES_URL_NON_POOLING: Direct connection for migrations
 * - POSTGRES_READ_URL: Read replica URL (optional, falls back to primary)
 *
 * Usage:
 * - Import { prismaDb } for write operations (INSERT, UPDATE, DELETE)
 * - Import { prismaDbRead } for read operations (SELECT)
 * - Import { db } for automatic routing based on operation type
 */
import { PrismaClient } from '@prisma/client';


// Global cache for Prisma clients (prevents multiple instances in dev)
const globalForPrisma = globalThis as unknown as {
  prismaWrite: PrismaClient | undefined;
  prismaRead: PrismaClient | undefined;
};


// Logging configuration
const logConfig = process.env.NODE_ENV === 'development'
  ? ['query', 'error', 'warn'] as const
  : ['error'] as const;


/**
 * Primary Prisma Client (Write Operations)
 *
 * Use this for all write operations: INSERT, UPDATE, DELETE, CREATE
 * Connects to the primary PostgreSQL node
 */
export const prismaDb =
  globalForPrisma.prismaWrite ??
  new PrismaClient({
    log: [...logConfig],
    datasources: {
      db: {
        url: process.env.POSTGRES_PRISMA_URL,
      },
    },
  });


/**
 * Read Replica Prisma Client (Read Operations)
 *
 * Use this for read-heavy operations: SELECT, findMany, findUnique, count, aggregate
 * Connects to read replica if POSTGRES_READ_URL is set, otherwise falls back to primary
 *
 * Benefits:
 * - Distributes read load across replicas
 * - Improves performance for read-heavy workloads
 * - Provides failover capability
 */
export const prismaDbRead =
  globalForPrisma.prismaRead ??
  new PrismaClient({
    log: [...logConfig],
    datasources: {
      db: {
        // Use read replica URL if available, otherwise fall back to primary
        url: process.env.POSTGRES_READ_URL || process.env.POSTGRES_PRISMA_URL,
      },
    },
  });


// Cache clients in development to prevent connection exhaustion
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaWrite = prismaDb;
  globalForPrisma.prismaRead = prismaDbRead;
}


/**
 * Database Router
 *
 * Provides a convenient interface for automatic read/write routing.
 *
 * Usage:
 *   // Explicit read operation (uses replica)
 *   const users = await db.read.user.findMany();
 *
 *   // Explicit write operation (uses primary)
 *   const user = await db.write.user.create({ data: {...} });
 *
 *   // Get specific client
 *   const readClient = db.getReadClient();
 *   const writeClient = db.getWriteClient();
 */
export const db = {
  /**
   * Read client - routes to replica
   * Use for: findMany, findUnique, findFirst, count, aggregate, groupBy
   */
  read: prismaDbRead,

  /**
   * Write client - routes to primary
   * Use for: create, createMany, update, updateMany, upsert, delete, deleteMany
   */
  write: prismaDb,

  /**
   * Get the read client instance
   */
  getReadClient: () => prismaDbRead,

  /**
   * Get the write client instance
   */
  getWriteClient: () => prismaDb,

  /**
   * Check if read replica is configured
   */
  hasReadReplica: () => !!process.env.POSTGRES_READ_URL,

  /**
   * Get connection status
   */
  getConnectionInfo: () => ({
    primaryUrl: process.env.POSTGRES_PRISMA_URL ? '[configured]' : '[not configured]',
    readReplicaUrl: process.env.POSTGRES_READ_URL ? '[configured]' : '[using primary]',
    directUrl: process.env.POSTGRES_URL_NON_POOLING ? '[configured]' : '[not configured]',
    hasReadReplica: !!process.env.POSTGRES_READ_URL,
  }),
};


/**
 * Health check for database connections
 *
 * Returns status of both primary and replica connections
 */
export async function checkDatabaseHealth(): Promise<{
  primary: { healthy: boolean; latencyMs: number; error?: string };
  replica: { healthy: boolean; latencyMs: number; error?: string };
}> {
  const checkConnection = async (client: PrismaClient, name: string) => {
    const start = Date.now();
    try {
      await client.$queryRaw`SELECT 1`;
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : `${name} connection failed`,
      };
    }
  };

  const [primary, replica] = await Promise.all([
    checkConnection(prismaDb, 'Primary'),
    checkConnection(prismaDbRead, 'Replica'),
  ]);

  return { primary, replica };
}


/**
 * Graceful shutdown handler
 *
 * Disconnects both Prisma clients properly
 */
export async function disconnectDatabase(): Promise<void> {
  await Promise.all([
    prismaDb.$disconnect(),
    prismaDbRead.$disconnect(),
  ]);
}


// Type exports for convenience
export type { PrismaClient };
