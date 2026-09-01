import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ObserveInstrument } from './infrastructure/observability/observability.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
