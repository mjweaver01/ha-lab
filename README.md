# Home Assistant Lab

Home Assist is a local-first prototype for tracing events from a simulated edge node, through a Bun-based orchestrator, to subscribed users and a React client.

The system combines:

- A webhook orchestrator built with `Bun.serve`
- SQLite persistence for locations, users, and events
- A simulated node event producer
- A React events interface with live media signal support

## Key Capabilities

- Media settings and capture flows in the client
- Live audio/video detection overlays
- Snapshot-based custom label learning in browser storage
- Events list with live tail or timeframe filtering
- Virtualized rendering and pagination for larger event histories

## Technology Stack

- Bun
- TypeScript
- `bun:sqlite`
- React (Bun HTML bundler, no Vite)

## Getting Started

Install dependencies and initialize local data:

```bash
bun install
bun run migrate
bun run seed
```

`bun run seed` creates the default `Lab` location and user (`location_id=1`). Without seed data, `POST /events` for `location_id=1` returns `404 location not found`.

## Running the Application

Start services in separate terminals.

1. Orchestrator (default port `3000`)

```bash
bun run dev
```

2. Simulated node (optional)

```bash
ORCHESTRATOR_URL=http://127.0.0.1:3000 bun run simulate -- --location 1
```

3. React client (optional)

```bash
PUBLIC_ORCHESTRATOR_URL=http://127.0.0.1:3000 PUBLIC_LOCATION_ID=1 bun run client
```

When testing media features, allow browser microphone and camera permissions.

## Capacitor mobile workflow

Capacitor support uses the same React app, embedded in iOS/Android WebViews.

Prerequisites:

- Xcode + iOS command line tools (for iOS)
- Android Studio with SDK + emulator image (for Android)

Install deps and generate/sync native shells:

```bash
bun run build:web:mobile
bun run mobile:sync
```

Open platform projects:

```bash
bun run mobile:ios
bun run mobile:android
```

After client code changes, repeat:

```bash
bun run build:web:mobile
bun run mobile:sync
```

## Testing

```bash
bun test
```

Current test coverage includes database behavior, orchestrator integration, event fan-out, simulated node flows, and client utility logic.
