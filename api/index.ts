import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module.js';
import { ObserveInstrument } from '../src/infrastructure/observability/observability.module.js';

let application: INestApplication | undefined;

async function getApplication(): Promise<INestApplication> {
  if (application) return application;

  application = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  application.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await application.init();
  return application;
}

export default async function handler(request: Request, response: Response) {
  const app = await getApplication();
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const forwardedPath = requestUrl.searchParams.get('path');
  request.url = forwardedPath ? `/${forwardedPath}` : (request.url?.replace(/^\/api(?=\/|$)/, '') || '/');
  return app.getHttpAdapter().getInstance()(request, response);
}
