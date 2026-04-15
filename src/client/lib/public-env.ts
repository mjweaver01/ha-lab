/**
 * Read `PUBLIC_*` vars for the Bun HTML client bundle (`bunfig.toml` serve.static env).
 * Guard `process` — it does not exist in the browser unless the bundler inlines env.
 */

export function readPublicOrchestratorUrl(): string {
  if (typeof process !== "undefined" && process.env) {
    const v = process.env.PUBLIC_ORCHESTRATOR_URL;
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "http://127.0.0.1:3000";
}

export function readPublicHomeId(): number {
  if (typeof process !== "undefined" && process.env) {
    const raw = process.env.PUBLIC_HOME_ID;
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && Number.isInteger(n)) return n;
    }
  }
  return 1;
}

const DEFAULT_POLL_MS = 4000;

export function readPublicPollMs(): number {
  if (typeof process !== "undefined" && process.env) {
    const raw = process.env.PUBLIC_POLL_MS;
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 1000) return n;
    }
  }
  return DEFAULT_POLL_MS;
}
