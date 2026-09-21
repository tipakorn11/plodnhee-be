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

## Debt tracking API

This service now supports people, groups, and separate bills for each person.
Keeping bills separate means a person can have multiple bills in one group; reduce
one with `PATCH`, or remove exactly one with `DELETE`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/people` | Create a person: `{ "name", "profileImageUrl?" }` |
| `GET` | `/people` | List people |
| `POST` | `/groups` | Create a group: `{ "name" }` |
| `GET` | `/groups` | List groups with member totals |
| `GET` | `/groups/:groupId` | Get a group, bills, and amounts owed per person |
| `POST` | `/groups/:groupId/bills` | Add a bill: `{ "personId", "amount", "description?" }` |
| `PATCH` | `/bills/:billId` | Change a bill amount or description |
| `DELETE` | `/bills/:billId` | Remove one bill |

`profileImageUrl` is optional and must be a public HTTPS URL. For a Vercel
frontend, upload the image directly from the browser to an object-storage service
(such as Supabase Storage, Cloudinary, or Vercel Blob), then send its returned URL
to `POST /people`. The API deliberately does not store image files on its local
filesystem, because Vercel serverless files are ephemeral.

Data is stored in Supabase Postgres through Prisma. Set `DATABASE_URL`, then run
`npm run db:migrate` to apply the committed migration. Vercel must have the same
`DATABASE_URL` and runs `prisma generate` during installation.

## Authentication

Normal email/password authentication is included:

| Method | Endpoint | Body |
| --- | --- | --- |
| `POST` | `/auth/register` | `{ "email", "password" }` |
| `POST` | `/auth/login` | `{ "email", "password" }` |
| `GET` | `/auth/me` | Bearer token required |

Registration and login return `{ "accessToken", "user" }`. Send that token for
every debt endpoint: `Authorization: Bearer <accessToken>`. Groups, people, and
bills are isolated per signed-in user.

Set `JWT_SECRET` to a long random value in Vercel’s environment variables before
deploying. Tokens expire after seven days. A development-only fallback secret is
used locally so the project can run without an `.env` file.

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
