import type { Database } from "bun:sqlite";
import { openDatabase } from "./db/database.ts";
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
 * HTTP orchestrator: POST/GET `/events`, POST `/subscribers`.
 * `port: 0` assigns an ephemeral port (tests); default env **PORT** is **3000**.
 */
export function createServer(options?: {
  port?: number;
  sqlitePath?: string;
}): OrchestratorServer {
  const db =
    options?.sqlitePath != null
      ? openDatabase(options.sqlitePath)
      : openDatabase();

  const port =
    options?.port ?? Number(Bun.env.PORT ?? process.env.PORT ?? 3000);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const u = new URL(req.url);
      const path = u.pathname;

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
    },
  });

  return { server, url: server.url, db };
}
