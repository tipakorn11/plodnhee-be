import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { PublicUser, User } from '../../domain/auth/user.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

interface Credentials { email: string; password: string }

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService, private readonly database: PrismaService) {}

  async register(input: Credentials) {
    const email = this.email(input.email);
    const password = this.password(input.password);
    const user: User = { id: randomUUID(), email, passwordHash: await hash(password, 12), createdAt: new Date() };
    try {
      await this.database.client.user.create({ data: { id: user.id, email: user.email, passwordHash: user.passwordHash } });
    } catch (error: unknown) {
      if (this.isUniqueError(error)) throw new ConflictException('Email is already registered');
      throw error;
    }
    return this.session(user);
  }

  async login(input: Credentials) {
    const email = this.email(input.email);
    const found = await this.database.client.user.findUnique({ where: { email } });
    const user = found ? { id: found.id, email: found.email, passwordHash: found.passwordHash, createdAt: found.createdAt } : undefined;
    if (!user || !(await compare(input.password ?? '', user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.session(user);
  }

  async getPublicUser(id: string): Promise<PublicUser> {
    const found = await this.database.client.user.findUnique({ where: { id } });
    const user = found ? { id: found.id, email: found.email, passwordHash: found.passwordHash, createdAt: found.createdAt } : undefined;
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.publicUser(user);
  }

  private session(user: User) {
    return { accessToken: this.jwt.sign({ sub: user.id, email: user.email }), user: this.publicUser(user) };
  }

  private publicUser(user: User): PublicUser {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  private email(value: unknown): string {
    if (typeof value !== 'string' || !/^\S+@\S+\.\S+$/.test(value.trim())) throw new UnauthorizedException('A valid email is required');
    return value.trim().toLowerCase();
  }

  private password(value: unknown): string {
    if (typeof value !== 'string' || value.length < 8) throw new UnauthorizedException('Password must be at least 8 characters');
    return value;
  }

  private isUniqueError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
