import { Test, TestingModule } from '@nestjs/testing';
import { GetHealthStatusUseCase } from '../../../application/health/get-health-status.use-case.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [GetHealthStatusUseCase],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('returns the service health status', () => {
      expect(healthController.check()).toMatchObject({
        status: 'ok',
        service: 'plodnhee-be',
      });
    });
  });
});
