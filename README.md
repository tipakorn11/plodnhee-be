# plodnhee-be

NestJS backend organized with a clean architecture layout.

## Architecture

Source code is split by responsibility:

- `src/domain`: enterprise/domain rules with no NestJS dependency.
- `src/application`: use cases and application DTOs.
- `src/interface`: inbound adapters such as HTTP controllers and modules.
- `src/infrastructure`: outbound adapters and framework/platform integration.
- `src/app.module.ts`: composition root that wires modules together.

Current vertical slice:

- `GET /` returns service health from `HealthController`.
- `GetHealthStatusUseCase` owns application flow.
- `HealthStatus` is the framework-independent domain model.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```
