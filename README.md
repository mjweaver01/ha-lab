# home-assist

Lab prototype: Bun + SQLite webhook orchestrator, simulated node, React events UI.

## Setup

```bash
bun install
bun run migrate
bun run seed
```

`seed` creates a default **Lab** home (and user) so `home_id=1` exists. Without it, `POST /events` returns **404 home not found** for `--home 1`.

## Run

**Terminal 1 — orchestrator** (default port `3000`):

```bash
bun run dev
```

**Terminal 2 — simulate node** (optional):

```bash
ORCHESTRATOR_URL=http://127.0.0.1:3000 bun run simulate -- --home 1
```

**Terminal 3 — React client** (optional):

```bash
PUBLIC_ORCHESTRATOR_URL=http://127.0.0.1:3000 PUBLIC_HOME_ID=1 bun run client
```

## Tests

```bash
bun test
```

---

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
