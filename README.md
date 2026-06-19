# OrderLink

**Share a menu by link. Take orders in real time. Track the kitchen.**

A restaurant ordering platform built as a **PERN** monorepo (PostgreSQL · Express ·
React · Node) in **TypeScript**, end-to-end type-safe from the database to the UI.

Customers open a shared menu link and order; the restaurant watches each ticket
move through **Requested → Preparing → Ready → Completed/Delivered** live, and can
ring up walk-ins from a built-in POS.

---

## Monorepo layout

```
OrderLink/
├── shared/        @orderlink/shared — domain types, order state machine, Zod API
│                  contracts & DTOs. The single source of truth imported by both
│                  the server and the client (DRY — they can never drift).
├── server/        Express + Prisma API (TypeScript)
│   ├── prisma/    schema.prisma, seed
│   └── src/
│       ├── config/        env validation (Zod, fail-fast)
│       ├── lib/           prisma client, logger, realtime (socket.io), serializers
│       ├── errors/        ApiError
│       ├── middleware/    error handler, 404
│       ├── utils/         asyncHandler, route-param guard
│       └── modules/       restaurants · menu · orders  (routes → controller → service)
├── client/        React + Vite + Tailwind (design tokens ported from the prototype)
│   └── src/
│       ├── lib/           axios client, react-query client, socket
│       ├── features/      restaurants · orders (hooks, components, realtime)
│       ├── components/    shared UI (StatusBadge…)
│       └── pages/         OrderBoardPage (the working slice)
├── docker-compose.yml     local Postgres
├── tsconfig.base.json     shared strict TS config
└── (legacy prototype)     index.html / pages/ / assets/ — the original static
                           localStorage demo, still live on GitHub Pages.
```

### Architecture notes (for reviewers)

- **One contract, two consumers.** Enums, the order state machine
  (`canTransition`, `nextStatus`), Zod input schemas and response DTOs live in
  `shared/` and are imported by both sides — no duplicated types.
- **Layered server.** `routes → controller → service`. Controllers validate input
  with the shared Zod schemas and stay thin; services hold business logic; a single
  error handler maps `ApiError` / `ZodError` / Prisma errors to a consistent
  `{ error: { message, code, details } }` envelope.
- **Trustworthy money.** Order totals are computed **server-side** from the live
  menu (client prices are never trusted), stored as `Decimal`, and item rows
  snapshot name/price so historical orders are immune to later menu edits.
- **Enforced lifecycle.** Status changes are validated against the shared state
  machine; every change appends an `OrderEvent` (audit trail).
- **Realtime.** socket.io broadcasts order events to a per-restaurant room; the
  client keeps its React Query cache in sync with no polling.

---

## Getting started

**Prerequisites:** Node ≥ 20, and Docker (or any local Postgres).

```bash
# 1. Install (also builds the shared package)
npm install

# 2. Start Postgres
npm run db:up                      # docker compose up -d db

# 3. Configure + create the schema + seed demo data
cp server/.env.example server/.env
npm run db:migrate                 # prisma migrate dev
npm run db:seed

# 4. Run API + web together (http://localhost:5173, API on :4000)
npm run dev
```

The web client proxies `/api` and `/socket.io` to the API in dev, so everything
runs from one origin with no CORS setup.

### Root scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run shared (watch) + API + client together |
| `npm run build` | Build all three workspaces |
| `npm run typecheck` | Type-check every workspace |
| `npm run format` | Prettier across the repo |
| `npm run db:up` / `db:migrate` / `db:seed` / `db:studio` | Database lifecycle |
| `npm run legacy` | Serve the original static prototype on :5173 |

---

## API

Base URL `http://localhost:4000/api`.

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/restaurants/:slug` | Restaurant details |
| `GET` | `/restaurants/:slug/menu` | Menu items |
| `POST`·`PUT`·`PATCH`·`DELETE` | `/restaurants/:slug/menu[/:itemId]` | Menu CRUD + availability |
| `GET` | `/restaurants/:slug/orders` | List orders (`?status=&today=`) |
| `POST` | `/restaurants/:slug/orders` | Place an order |
| `GET` | `/restaurants/:slug/stats` | Live dashboard metrics |
| `GET` | `/orders/:id` | Single order |
| `PATCH` | `/orders/:id/status` | Set status (state-machine enforced) |
| `POST` | `/orders/:id/advance` | Advance one step along the pipeline |

---

## Status / roadmap

- ✅ **Foundation + working slice:** shared contracts, full API (restaurants/menu/
  orders) with realtime, and the **Order Board** page wired end-to-end.
- ⏭️ **Next:** port the remaining screens (menu manager, POS, customer menu +
  tracking) into React against the same API; auth for multi-restaurant access; tests.

> The original localStorage prototype remains in the repo (and deployed) as a
> visual reference; the PERN app under `server/` + `client/` supersedes it.
