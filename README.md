# Limited Edition Sneaker Drop — Backend

Real-time, race-condition-safe inventory & reservation API for a limited edition sneaker drop.

**Stack:** Node.js + Express 5 (TypeScript, ESM) · PostgreSQL + Sequelize 6 · Socket.io 4 · JWT auth · Zod validation · node-cron

---

## 1. Project structure

```
src/
  config/          env config, Sequelize connection, sequelize-cli config
  db/
    models/        Sequelize models + associations (User, Drop, Reservation, Purchase)
    migrations/     sequelize-cli migrations (source of truth for schema)
    seeders/        demo data
  middlewares/      auth (JWT), zod validateRequest, error handler, rate limiter
  modules/
    auth/            register / login
    drop/            list drops (+ activity feed), create a drop
    reservation/      reserve / cancel (the atomic, race-safe part)
    purchase/          complete a purchase for a held reservation
  sockets/          Socket.io init + typed emit helpers
  jobs/              cron job that sweeps & expires stale reservations
  routes/            central route mounting
  app.ts             Express app (middleware, routes, error handling)
  server.ts           HTTP server bootstrap, DB connect, socket init, cron start
sql/schema.sql       plain SQL schema, equivalent to running the migrations
```

Every module follows the same `route → controller → service → validation` pattern, with
`catchAsync`, `sendResponse`, and `AppError` as shared utilities and a single `globalErrorHandler`.

---

## 2. Running it locally

### Prerequisites
- Node.js 20+
- pnpm (`corepack enable` or `npm i -g pnpm`)
- A PostgreSQL 15+ database (local, or a free [Neon](https://neon.tech) instance)

### Steps

```bash
pnpm install

cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, CLIENT_URL, etc.
```

**Set up the database schema** — either option works:

```bash
# Option A: sequelize-cli migrations (recommended, versioned, reversible)
pnpm migrate
pnpm seed          # optional demo drops

# Option B: run the raw SQL directly (e.g. paste into Neon's SQL editor)
# -> sql/schema.sql
```

**Run the server:**

```bash
pnpm dev            # tsx watch, hot reload
# or
pnpm build && pnpm start
```

The API listens on `http://localhost:5000` by default (`GET /health` for a liveness check).

---

## 3. API overview

| Method | Endpoint                          | Auth | Description |
|--------|------------------------------------|------|--------------|
| POST   | `/api/auth/register`               | –    | Create a user, returns a JWT |
| POST   | `/api/auth/login`                  | –    | Returns a JWT |
| GET    | `/api/drops`                       | –    | Dashboard feed: every drop + live stock + top 3 recent purchasers |
| GET    | `/api/drops/:dropId`               | –    | Single drop |
| POST   | `/api/drops`                       | –    | Create a new merch drop (`name`, `price`, `totalStock`, optional `startsAt`) |
| POST   | `/api/reservations`                | JWT  | Reserve 1 unit of a drop (`{ dropId }`), 60s hold |
| POST   | `/api/reservations/:id/cancel`     | JWT  | Release a held reservation early |
| POST   | `/api/purchases`                   | JWT  | Complete purchase for a held reservation (`{ reservationId }`) |

Auth header: `Authorization: Bearer <token>`.

### WebSocket events (Socket.io, same origin as `CLIENT_URL`)

| Event | Payload | When |
|---|---|---|
| `stock:update` | `{ dropId, availableStock, totalStock, soldCount }` | reserve / cancel / purchase / expiry |
| `reservation:expired` | `{ dropId, reservationId, availableStock }` | the 60s window lapses |
| `drop:created` | full drop object | a new drop is created |
| `activity:update` | `{ dropId, latestPurchasers: [{ username, purchasedAt }] }` | a purchase completes |

No auth is required to *receive* socket events — the dashboard is public/read-only in real time.

---

## 4. Architecture choices

### Concurrency: preventing overselling

The reservation write is a single conditional `UPDATE`:

```sql
UPDATE drops
SET available_stock = available_stock - 1, updated_at = now()
WHERE id = :dropId AND available_stock > 0
RETURNING id, available_stock, total_stock, sold_count;
```

In Postgres, an `UPDATE` acquires a row-level lock the instant it starts modifying a row, and the
`WHERE available_stock > 0` check and the decrement happen as **one atomic operation** evaluated
under that lock. There is no "check stock, then decrement" gap to race — if 100 requests hit this
statement at the same millisecond for the last unit, Postgres serializes them at the row level:
exactly one `UPDATE` returns a row, the other 99 return zero rows and the API responds
`409 Conflict — out of stock`. This works under the database's default `READ COMMITTED` isolation
level; no `SELECT ... FOR UPDATE` or `SERIALIZABLE` transaction is needed for this particular
statement, because the atomicity comes from the single UPDATE itself, not from the surrounding
transaction.

The stock decrement and the `Reservation` insert are still wrapped in one Sequelize transaction
(`src/modules/reservation/reservation.service.ts`) so that if the reservation insert fails for any
reason, the stock decrement rolls back with it — the two writes succeed or fail together.

Purchasing does **not** touch `available_stock` again — that unit was already claimed at
reservation time. Purchase only flips the reservation to `COMPLETED`, inserts a `Purchase` row,
and bumps `sold_count` (a separate reporting counter). This keeps "how many units can still be
reserved right now" and "how many have actually sold" as two independent, always-consistent
numbers.

### 60-second expiration: the "Stock Recovery" mechanism

A `node-cron` job (`src/jobs/expireReservations.job.ts`) runs on a short interval (`*/2 * * * * *`
by default — every 2 seconds, configurable via `EXPIRY_SWEEP_CRON`). Each run:

1. Finds every `Reservation` with `status = ACTIVE` and `expiresAt <= now()`.
2. For each one, inside its own transaction with a row lock: flips it to `EXPIRED`, increments
   `drops.available_stock` by 1, and broadcasts `reservation:expired` + `stock:update`.

**Why polling instead of `setTimeout` per reservation:** a `setTimeout` map is in-memory and is
lost if the Node process restarts or crashes — any reservation that should have expired during
the downtime would leak its stock permanently (or never expire). The cron sweep is stateless and
reads directly from the `expires_at` column, so a restarted server immediately picks up and
recovers anything that timed out while it was down. The `(status, expires_at)` composite index on
`reservations` keeps each sweep cheap even with many rows.

At purchase time, there's also a belt-and-suspenders check: if a reservation's `expiresAt` has
already passed but the sweep hasn't caught it yet, the purchase attempt itself expires it and
returns `410 Gone` rather than letting a stale reservation convert into a sale.

### The "Drop Activity Feed" (top 3 purchasers)

`GET /api/drops` uses a single raw query with a Postgres `LATERAL` join
(`src/modules/drop/drop.service.ts`) instead of N+1 queries or over-fetching every purchase row:

```sql
SELECT d.*, COALESCE(json_agg(...) FILTER (WHERE p.id IS NOT NULL), '[]') AS "latestPurchasers"
FROM drops d
LEFT JOIN LATERAL (
  SELECT pu.id, pu.created_at, pu.user_id
  FROM purchases pu
  WHERE pu.drop_id = d.id
  ORDER BY pu.created_at DESC
  LIMIT 3
) p ON true
LEFT JOIN users u ON u.id = p.user_id
GROUP BY d.id
ORDER BY d.created_at DESC;
```

The `LATERAL` subquery limits to 3 rows *per drop* inside the database before the join to `users`
happens, so the whole dashboard loads in one round trip regardless of how many drops or purchases
exist.

### Auth

Deliberately minimal: username + password (bcrypt-hashed, 12 rounds) → JWT. Just enough identity
to know who's reserving/purchasing what, without pulling the assessment's scope into a full user
management system.

---

## 5. Deployment (Vercel + Neon)

1. **Neon**: create a Postgres project, copy the pooled connection string into `DATABASE_URL`
   (set `DB_SSL=true`). Run `sql/schema.sql` in Neon's SQL editor, or run `pnpm migrate` locally
   pointed at the Neon URL.
2. **Vercel**: import the repo. This is a long-running Socket.io server (and needs a persistent
   cron loop for the expiry sweep), so it's best deployed as a Vercel **Node.js server** (e.g. via
   a custom server / `vercel.json` `builds` entry pointing at `dist/server.js`, or a platform with
   native long-running process support such as Render/Railway/Fly.io) rather than as stateless
   serverless functions — serverless functions don't hold WebSocket connections or an in-process
   cron scheduler open between invocations.
3. Set all `.env.example` variables in the platform's environment variable settings —
   **never commit `.env`.**
4. Set `CLIENT_URL` to the deployed frontend's origin so CORS and Socket.io both allow it.

---

## 6. Design notes / trade-offs

- **Sequelize over raw `pg`**: models + migrations give a clear, versioned schema history, while
  the two hot paths (reserve, expiry sweep) still drop to raw SQL for the atomic `UPDATE ...
  RETURNING`, since that's the one place correctness depends on exact SQL semantics rather than
  ORM convenience.
- **Rate limiting** on `/api/reservations` (10 requests / 10s per IP) as a cheap first line of
  defense against click-spam during a hot drop, on top of the DB-level atomicity that actually
  guarantees correctness.
- **Zod** validates every request body before it reaches a service function.
