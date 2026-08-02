import { proxyTargetRequest } from "../lib/runtime-proxy.js";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};

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

export default async function handler(req, res) {
  try {
    const body = ["GET", "HEAD"].includes(req.method || "GET")
      ? undefined
      : await readRawBody(req);

    const result = await proxyTargetRequest({
      url: req.query?.url,
      sourceOrigin: req.query?.source,
      method: req.method,
      headers: req.headers,
      body
    });

    for (const [name, value] of Object.entries(result.headers)) {
      res.setHeader(name, value);
    }

    res.status(result.status).send(result.bytes);
  } catch (error) {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(422).json({
      success: false,
      error: error?.message || "Richiesta proxy non riuscita."
    });
  }
}
