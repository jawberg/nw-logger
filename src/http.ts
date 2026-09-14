import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { SampleStore } from "./db.js";

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export type DashboardServer = {
  close(): Promise<void>;
};

export function defaultWebRoot(): string {
  return path.resolve(process.cwd(), "web/dist");
}

function send(
  res: ServerResponse,
  status: number,
  body: string | Buffer,
  headers: Record<string, string>,
): void {
  res.writeHead(status, { ...CORS_HEADERS, ...headers });
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  send(res, status, JSON.stringify(body), {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
}

function parseIso(value: string | null): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function safeFile(root: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "");
  const relative = decoded.replace(/^\/+/, "") || "index.html";
  if (relative.includes("\0")) return null;
  const full = path.resolve(root, relative);
  const rootResolved = path.resolve(root);
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) {
    return null;
  }
  return full;
}

function handleApi(
  reqUrl: URL,
  store: SampleStore,
  res: ServerResponse,
): boolean {
  if (reqUrl.pathname === "/api/latest") {
    sendJson(res, 200, {
      latest: store.latest(),
      lastSpeedtest: store.latestSpeedtest(),
    });
    return true;
  }

  if (reqUrl.pathname === "/api/samples") {
    const now = Date.now();
    const to = parseIso(reqUrl.searchParams.get("to")) ?? new Date(now).toISOString();
    const from =
      parseIso(reqUrl.searchParams.get("from")) ??
      new Date(now - 24 * 60 * 60 * 1000).toISOString();
    if (from > to) {
      sendJson(res, 400, { error: "from must be <= to" });
      return true;
    }
    const samples = store.queryRange(from, to);
    sendJson(res, 200, { from, to, count: samples.length, samples });
    return true;
  }

  if (reqUrl.pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "not found" });
    return true;
  }

  return false;
}

function serveStatic(webRoot: string, urlPath: string, res: ServerResponse): void {
  if (!existsSync(webRoot)) {
    send(
      res,
      503,
      "Dashboard UI not built. Run npm run build.\n",
      { "content-type": "text/plain; charset=utf-8" },
    );
    return;
  }

  const requested = safeFile(webRoot, urlPath);
  if (!requested) {
    sendJson(res, 400, { error: "invalid path" });
    return;
  }

  let filePath = requested;
  try {
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    sendJson(res, 404, { error: "not found" });
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    const indexPath = path.join(webRoot, "index.html");
    if (existsSync(indexPath)) {
      filePath = indexPath;
    } else {
      sendJson(res, 404, { error: "not found" });
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";
  send(res, 200, readFileSync(filePath), {
    "content-type": type,
    "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600",
  });
}

export function startDashboard(options: {
  host: string;
  port: number;
  store: SampleStore;
  webRoot?: string;
}): Promise<DashboardServer> {
  const webRoot = path.resolve(options.webRoot ?? defaultWebRoot());

  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method && req.method !== "GET") {
      sendJson(res, 405, { error: "method not allowed" });
      return;
    }

    const reqUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    try {
      if (handleApi(reqUrl, options.store, res)) return;
      serveStatic(webRoot, reqUrl.pathname, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        sendJson(res, 500, { error: message });
      }
    }
  };

  const server = createServer(handler);

  return new Promise((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    server.once("error", onError);
    server.listen(options.port, options.host, () => {
      server.removeListener("error", onError);
      console.log(`Dashboard listening on http://${options.host}:${options.port}`);
      resolve({
        close() {
          return new Promise((closeResolve, closeReject) => {
            server.close((err) => (err ? closeReject(err) : closeResolve()));
          });
        },
      });
    });
  });
}
