export type HealthStatusValue = 'ok';

export class HealthStatus {
  private constructor(
    public readonly status: HealthStatusValue,
    public readonly service: string,
    public readonly checkedAt: Date,
  ) {}

  static ok(service: string, checkedAt = new Date()): HealthStatus {
    return new HealthStatus('ok', service, checkedAt);
  }
}
