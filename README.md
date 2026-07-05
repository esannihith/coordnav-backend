# CoordNav Backend

The server behind [CoordNav](https://github.com/esannihith/coordnav) — an Android app where groups share live locations on one map, chat, and navigate together. This service owns **authentication, rooms, chat, live location fan-out, and all Google API access**.

**Stack:** Node.js · Express 5 · Socket.IO · Prisma · PostgreSQL — deployed on Railway (Docker) with CI-gated continuous deployment.

## Responsibilities

- **Auth** — Google Sign-In verification, JWT access tokens, rotating refresh tokens with reuse detection
- **Rooms** — create/join/leave ephemeral groups by 6-character code, shared destinations, one-room-per-user invariant
- **Real-time** — presence, live location broadcast, and chat over authenticated WebSockets
- **Google API proxy** — Places (autocomplete/search/details) and Routes v2 (route alternatives **with route tokens**, so the app's Navigation SDK drives the exact route the user selected); the billed keys never leave this server

## Architecture

```
routes → middlewares → controllers → services → prisma (PostgreSQL)
                                   ↘ socket/ (Socket.IO: presence, location, chat)
```

- **Layered**: routes declare paths, controllers validate input and shape responses, services own business logic and transactions, `lib/prisma` owns data access.
- **Errors**: everything flows to a single error middleware via `AppError(status, message)` → `{ "status": "error", "message" }`. Success responses are always `{ "data": ... }`.
- **Presence is in-memory by design** (`socket/presence.registry.ts`): `roomId → userId → { sockets, lat, lng }`. Live locations are **never persisted** — they're ephemeral (privacy + write load); rooms, members, and chat live in Postgres. A user can hold multiple sockets; online/offline transitions fire on the first-socket-added / last-socket-removed edges.

## Authentication

1. `POST /auth/google-signin` with a Google ID token → verified against Google (audience-checked), user upserted.
2. Server issues a **15-minute JWT access token** (HS256) and a **60-day refresh token** — an opaque random value of which **only the SHA-256 hash is stored**.
3. `POST /auth/refresh` **rotates** the refresh token: single-use, old one revoked with a reason code (`ROTATED | LOGOUT | SUPERSEDED | REUSE`).
4. **Reuse detection**: presenting an already-revoked token revokes *every* session for that user — the standard response to token theft.
5. REST routes under `/room` require `Authorization: Bearer <access token>`; the Socket.IO handshake is authenticated the same way (`auth.token`), with structured error codes (`TOKEN_EXPIRED` / `TOKEN_INVALID`) so the client knows whether to refresh or re-login.

## API

Base path: `/api/v1` · Success envelope `{ "data": ... }` · Errors `{ "status": "error", "message": "..." }`

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| POST | `/auth/google-signin` | — | 100/15 min | Verify Google ID token → tokens + session bootstrap (user, current room, members) |
| POST | `/auth/refresh` | — | 100/15 min | Rotate refresh token → new token pair |
| POST | `/auth/signout` | — | 100/15 min | Revoke refresh token, leave room |
| POST | `/room` | ✅ | — | Create room (name, optional destination) |
| POST | `/room/join` | ✅ | — | Join by 6-character code |
| POST | `/room/leave` | ✅ | — | Leave; last member out deletes the room (transactional) |
| GET | `/room` | ✅ | — | Current room + members snapshot |
| PATCH | `/room/destination` | ✅ | — | Set/clear the shared destination |
| GET | `/room/messages` | ✅ | — | Chat history |
| GET | `/places/autocomplete` | — | 60/min | Places autocomplete (session-token aware) |
| GET | `/places/search` | — | 60/min | Text search |
| GET | `/places/:placeId` | — | 60/min | Place details (whitelisted fields) |
| GET | `/directions` | — | 30/min | Route alternatives via **Routes API v2**: numeric + display duration/distance, encoded polyline, viewport bounds, and a **route token** per driving route |
| GET | `/health` | — | — | Liveness probe |

`/places` and `/directions` are deliberately public (only room features require identity) but rate-limited per IP — the limiter is what protects the billed Google key.

## Socket events

Handshake: `io(url, { auth: { token: <access token> } })`

**Client → server**

| Event | Payload | Effect |
|---|---|---|
| `room:join` | — | Join your room's channel; receive current `location:list`; roommates notified |
| `location:update` | `{ lat, lng }` | Broadcast position to the room (client throttles to ≥5 s + 15 s heartbeat) |
| `location:share:stop` | — | Stop sharing; roommates receive `location:share:stopped` |
| `chat:send` | `{ kind: "TEXT"\|"PLACE", ... }` | Persist + broadcast a message |

**Server → client**

| Event | Meaning |
|---|---|
| `location:list` | Snapshot of roommates' live positions on join |
| `location:update` / `location:share:stopped` | Live position changes |
| `chat:new` | New message (echoes a `clientId` for optimistic-send reconciliation) |
| `room:roster-changed` | Membership changed — re-fetch the roster over REST |
| `session:superseded` | Same user connected elsewhere; this socket is being replaced |
| `room:error` / `chat:error` | Structured failures |

## Data model

Six tables (see `prisma/schema.prisma`): `users`, `rooms`, `room_members`, `room_destinations`, `messages`, `refresh_tokens`.

Design points worth noticing:
- `room_members.userId` is **unique** — "one room per user" is a database invariant, not an application convention.
- Room codes use a reduced, ambiguity-free alphabet (no `0/O`, `1/I`).
- Membership mutations run in **transactions**; deleting the last member cascades to the room and its destination.
- `messages.kind` enum (`TEXT | PLACE`) with a JSON column for place cards.
- `refresh_tokens` stores hash + expiry + `RevocationReason`, making every revocation auditable.

## Deployment & CI

- **Docker** (`Dockerfile`): Node 22 alpine, runs TypeScript directly via `tsx`; the Prisma client is generated on install (`postinstall`), so fresh checkouts and CI just work.
- **CI (GitHub Actions)**: every push runs a typecheck (`tsc --noEmit`) and a full Docker image build. Railway is configured to **wait for CI** — red builds never deploy.
- **Railway** (`railway.json`): builds from the Dockerfile, runs `prisma migrate deploy` as a **pre-deploy step** (schema always moves with the code), health-checks `/health`, restarts on failure. Postgres runs as a service in the same project, wired via a private-network URL.
- **Hardening**: helmet, JSON body limit, per-IP rate limits, `trust proxy` for correct client IPs behind Railway's edge.

## Running locally

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # fill in the values below
npx prisma migrate dev      # against your Postgres
npm start                   # tsx src/server.ts on PORT
```

| Env var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `GOOGLE_WEB_CLIENT_ID` | OAuth client ID the app signs in with (ID-token audience) |
| `GOOGLE_PLACES_API_KEY` | Billed key for Places + Routes v2 |
| `JWT_ACCESS_SECRET` | HS256 signing secret (`openssl rand -hex 32`) |
| `ACCESS_TOKEN_TTL` | e.g. `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | e.g. `60` |
| `PORT` | e.g. `8000` (injected by Railway in production) |

All seven are validated at boot — the process refuses to start half-configured.

## Project structure

```
src/
├── server.ts        # connect DB → HTTP server → attach Socket.IO
├── app.ts           # express app: helmet, cors, routes, error handler
├── config/env.ts    # strict env validation
├── routes/          # auth, room, places, directions
├── controllers/     # input validation + response shaping
├── services/        # business logic, transactions, Google API calls
├── middlewares/     # requireAuth, rate limits, error handler
├── socket/          # io singleton, handshake auth, presence registry,
│                    #   room/chat handlers, roster notifier
├── lib/             # prisma client, jwt, google verify, AppError
├── utils/           # URL builders, formatters
└── types/
prisma/              # schema + migrations
```

## Scaling notes (deliberate current limits)

- Presence lives in one instance's memory → horizontal scaling needs Redis + the Socket.IO Redis adapter. Fine at current scale; the seam is isolated in `presence.registry.ts`.
- Location fan-out is per-room broadcast (rooms cap at ~10 members by product design), so write amplification is bounded.
- No test suite yet; correctness is currently guarded by strict typing, CI, and staged manual verification — auth rotation and room transactions are where tests land first.
