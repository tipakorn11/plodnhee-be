import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../../../application/auth/auth.service.js';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard.js';

interface Credentials { email: string; password: string }

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register') register(@Body() body: Credentials) { return this.auth.register(body); }
  @Post('login') login(@Body() body: Credentials) { return this.auth.login(body); }
  @Get('me') @UseGuards(JwtAuthGuard) me(@Req() request: AuthenticatedRequest) { return this.auth.getPublicUser(request.user.id); }
}
