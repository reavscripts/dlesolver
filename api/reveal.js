import { revealAnswerToken } from "../lib/monetization-tokens.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Metodo non consentito." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const result = revealAnswerToken(body.revealToken, req.headers.authorization);
    res.setHeader("cache-control", "no-store");
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.setHeader("cache-control", "no-store");
    res.status(422).json({
      success: false,
      error: error?.message || "Impossibile sbloccare la risposta."
    });
  }
}
