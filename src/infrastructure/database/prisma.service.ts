import { Injectable, InternalServerErrorException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma?: PrismaClient;

  get client(): PrismaClient {
    if (this.prisma) return this.prisma;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new InternalServerErrorException('DATABASE_URL is not configured');
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: this.connectionTimeoutMillis,
      // Supabase requires TLS. `sslmode=require` in DATABASE_URL is preferred;
      // retain a safe compatibility default for its direct database endpoint.
      ssl: this.requiresSupabaseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
    this.prisma = new PrismaClient({ adapter: new PrismaPg(pool, { disposeExternalPool: true }) });
    return this.prisma;
  }

  async onModuleInit() {
    try {
      // Prisma driver adapters connect lazily. Run a harmless query now so an
      // unavailable database prevents the app from accepting requests.
      await this.client.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error('Database unavailable at startup. Check DATABASE_URL and database connectivity.', error);
      throw error;
    }
  }

  async onModuleDestroy() { await this.prisma?.$disconnect(); }

  private get connectionTimeoutMillis(): number {
    const configured = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS);
    return Number.isFinite(configured) && configured > 0 ? configured : 5_000;
  }

  private requiresSupabaseSsl(connectionString: string): boolean {
    const url = new URL(connectionString);
    return url.hostname.endsWith('.supabase.co') && !url.searchParams.has('sslmode');
  }
}
