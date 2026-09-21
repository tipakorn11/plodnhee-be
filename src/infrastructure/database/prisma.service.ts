import { Injectable, InternalServerErrorException, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private prisma?: PrismaClient;

  get client(): PrismaClient {
    if (this.prisma) return this.prisma;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new InternalServerErrorException('DATABASE_URL is not configured');
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    return this.prisma;
  }

  async onModuleDestroy() { await this.prisma?.$disconnect(); }
}
