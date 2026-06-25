# XNFT API

Production-grade TypeScript auth backend (Express + Prisma + Postgres). Built
layered (routes → controller → service → repository) and event-driven-ready so
the Kafka backbone (email, notifications, analytics) drops in without touching
producers.

## Layout

```
src/
├── config/            # validated env (zod) — fail fast on misconfig
├── lib/               # prisma, logger, password (argon2id), jwt/refresh tokens
├── events/            # EventBus abstraction (in-memory now, Kafka later)
│   └── consumers/     # event subscribers (welcome email, …)
├── middlewares/       # auth guard, zod validation, rate limit, error handler
├── modules/auth/      # repository · service · controller · routes
├── routes/            # mounts feature modules under /api/v1
├── utils/             # errors, cookies, async-handler, response envelope
├── app.ts             # express app (testable, no port)
└── server.ts          # boot, consumers, graceful shutdown
```

## Auth design

- **Access token**: short-lived JWT (15m), returned in the JSON body, sent by
  the client as `Authorization: Bearer <token>`.
- **Refresh token**: opaque random string in an `httpOnly` cookie. Only its
  SHA-256 hash is stored (table `sessions`), so it is revocable and a DB leak
  exposes no usable tokens. Rotated on every refresh.
- **Passwords**: argon2id. **Validation**: shared zod schemas from `@repo/types`.
- Rate limiting + helmet + CORS-with-credentials out of the box.

## Endpoints (`/api/v1/auth`)

| Method | Path        | Auth   | Purpose                         |
| ------ | ----------- | ------ | ------------------------------- |
| POST   | `/register` | —      | Create account, start session   |
| POST   | `/login`    | —      | Start session                   |
| POST   | `/refresh`  | cookie | Rotate tokens                   |
| POST   | `/logout`   | cookie | Revoke session                  |
| GET    | `/me`       | Bearer | Current user                    |

## Run

```bash
cp .env.example .env            # then set strong JWT secrets
docker compose up -d postgres   # from repo root
pnpm --filter api db:migrate    # create tables
pnpm --filter api dev           # http://localhost:4000
```
