import type { Database } from "bun:sqlite";
import { openDatabase, resolveSqlitePath } from "./db/database.ts";
import { handleGetEvents, handlePostEvent } from "./routes/events.ts";
import { handlePostSubscriber } from "./routes/subscribers.ts";

/** Dev-only CORS for `bun ./src/client/index.html` talking to orchestrator on another port. */
function corsDevHeaders(req: Request): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  h.set(
    "Access-Control-Allow-Headers",
    req.headers.get("Access-Control-Request-Headers") ?? "Content-Type",
  );
  return h;
}

function withCorsDev(res: Response, req: Request): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of corsDevHeaders(req)) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, headers });
}

export type OrchestratorServer = {
  server: { stop: () => void; url: URL };
  url: URL;
  db: Database;
};

/**
 * HTTP orchestrator: `GET /` (human hint), POST/GET `/events`, POST `/subscribers`.
 * `port: 0` assigns an ephemeral port (tests); default env **PORT** is **3000**.
 */
async function routeRequest(req: Request, db: Database): Promise<Response> {
  const u = new URL(req.url);
  const path = u.pathname;

  /** Browsers (and some tools) hit `GET /` on startup — answer instead of 404 noise. */
  if (path === "/" && req.method === "GET") {
    const body =
      "home-assist orchestrator\n\n" +
      "Routes:\n" +
      "  GET  /events?home_id=<id>  — list events for a home\n" +
      "  POST /events               — ingest event (JSON body)\n" +
      "  POST /subscribers          — register callback URL for a home\n\n" +
      "UI: run `bun run client` (separate dev server).\n";
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (path === "/events" && req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsDevHeaders(req),
    });
  }

  if (path === "/events" && req.method === "GET") {
    const res = await handleGetEvents(req, db);
    return withCorsDev(res, req);
  }
  if (path === "/events" && req.method === "POST") {
    return handlePostEvent(req, db);
  }
  if (path === "/subscribers" && req.method === "POST") {
    return handlePostSubscriber(req, db);
  }
  return new Response("Not Found", { status: 404 });
}

export function createServer(options?: {
  port?: number;
  sqlitePath?: string;
}): OrchestratorServer {
  const sqlitePath = options?.sqlitePath ?? resolveSqlitePath();
  const db = openDatabase(options?.sqlitePath);

  const port =
    options?.port ?? Number(Bun.env.PORT ?? process.env.PORT ?? 3000);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const u = new URL(req.url);
      const path = u.pathname;
      const t0 = performance.now();
      const res = await routeRequest(req, db);
      const ms = Math.round(performance.now() - t0);
      console.log(
        `[orchestrator] ${req.method} ${path} → ${res.status} ${ms}ms`,
      );
      return res;
    },
  });

  console.log(`[orchestrator] SQLite: ${sqlitePath}`);
  console.log(`[orchestrator] Listening: ${server.url.href}`);

  return { server, url: server.url, db };
}
