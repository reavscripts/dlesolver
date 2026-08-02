import { createProxiedView, errorViewHtml } from "../lib/runtime-proxy.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send("Metodo non consentito.");
    return;
  }

  try {
    const { html } = await createProxiedView(req.query?.url);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-frame-options", "SAMEORIGIN");
    res.status(200).send(html);
  } catch (error) {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(422).send(errorViewHtml(error?.message || "Impossibile caricare il riddle."));
  }
}
