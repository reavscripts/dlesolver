import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createProxiedView,
  errorViewHtml,
  proxyTargetRequest
} from "./lib/runtime-proxy.js";
import { solveDirect } from "./lib/direct-solver.js";
import {
  getPublicMonetizationConfig,
  verifyPayPalSubscription
} from "./lib/paypal-subscriptions.js";
import {
  gateSolveResult,
  revealAnswerToken
} from "./lib/monetization-tokens.js";

const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(JSON.stringify(data));
}

async function readRawBody(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("Richiesta troppo grande.");
    chunks.push(chunk);
  }

  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(requestUrl.pathname);
  const localizedRoute = pathname.match(/^\/(it|fr|es)(?:\/index\.html)?$/);
  if (localizedRoute) {
    res.writeHead(308, {
      location: `/${localizedRoute[1]}/`,
      "cache-control": "public, max-age=3600"
    });
    res.end();
    return;
  }
  if (pathname === "/index.html") {
    res.writeHead(308, { location: "/", "cache-control": "public, max-age=3600" });
    res.end();
    return;
  }
  if (pathname === "/") pathname = "/index.html";
  else if (pathname === "/it/") pathname = "/it/index.html";
  else if (pathname.endsWith("/")) pathname += "index.html";

  const normalized = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(publicDir, normalized);
  if (!filePath.startsWith(publicDir)) filePath = path.join(publicDir, "index.html");

  try {
    const data = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME_TYPES[extension] || "application/octet-stream",
      "cache-control": extension === ".html" ? "no-cache" : "public, max-age=3600",
      "x-content-type-options": "nosniff"
    });
    res.end(data);
  } catch {
    const index = await readFile(path.join(publicDir, "index.html"));
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache"
    });
    res.end(index);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && requestUrl.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, service: "dle-solver", version: "5.0.0", engine: "direct-network-v5.0+runtime-proxy-v4.0" });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/config") {
      sendJson(res, 200, { success: true, ...getPublicMonetizationConfig() });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/paypal-verify") {
      try {
        const rawBody = await readRawBody(req, 64 * 1024);
        const body = rawBody?.length ? JSON.parse(rawBody.toString("utf8")) : {};
        const result = await verifyPayPalSubscription(body.subscriptionId);
        sendJson(res, 200, { success: true, ...result });
      } catch (error) {
        sendJson(res, 422, {
          success: false,
          error: error?.message || "Verifica PayPal non riuscita."
        });
      }
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/solve") {
      try {
        const result = await solveDirect(
          requestUrl.searchParams.get("url"),
          requestUrl.searchParams.get("tzOffset")
        );
        const gatedResult = gateSolveResult(result, req.headers.authorization);
        sendJson(res, 200, gatedResult);
      } catch (error) {
        sendJson(res, 422, {
          success: false,
          error: error?.message || "Impossibile ottenere la risposta."
        });
      }
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/reveal") {
      try {
        const rawBody = await readRawBody(req, 128 * 1024);
        const body = rawBody?.length ? JSON.parse(rawBody.toString("utf8")) : {};
        const result = revealAnswerToken(body.revealToken, req.headers.authorization);
        sendJson(res, 200, { success: true, ...result });
      } catch (error) {
        sendJson(res, 422, {
          success: false,
          error: error?.message || "Impossibile sbloccare la risposta."
        });
      }
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/view") {
      try {
        const { html } = await createProxiedView(requestUrl.searchParams.get("url"));
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-frame-options": "SAMEORIGIN"
        });
        res.end(html);
      } catch (error) {
        res.writeHead(422, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        });
        res.end(errorViewHtml(error?.message || "Impossibile caricare il riddle."));
      }
      return;
    }

    if (requestUrl.pathname === "/api/proxy") {
      try {
        const body = ["GET", "HEAD"].includes(req.method || "GET")
          ? undefined
          : await readRawBody(req);

        const result = await proxyTargetRequest({
          url: requestUrl.searchParams.get("url"),
          sourceOrigin: requestUrl.searchParams.get("source"),
          method: req.method,
          headers: req.headers,
          body
        });

        res.writeHead(result.status, result.headers);
        res.end(result.bytes);
      } catch (error) {
        sendJson(res, 422, {
          success: false,
          error: error?.message || "Richiesta proxy non riuscita."
        });
      }
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { success: false, error: "Metodo non consentito." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, {
      success: false,
      error: "Errore interno durante l'analisi del sito."
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`DLE Solver attivo su http://localhost:${port}`);
});
