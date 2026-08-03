import { solveDirect } from "../lib/direct-solver.js";
import { gateSolveResult } from "../lib/monetization-tokens.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ success: false, error: "Metodo non consentito." });
    return;
  }

  try {
    const result = await solveDirect(req.query?.url, req.query?.tzOffset);
    const gatedResult = gateSolveResult(result, req.headers.authorization);
    res.setHeader("cache-control", "no-store");
    res.status(200).json(gatedResult);
  } catch (error) {
    res.setHeader("cache-control", "no-store");
    res.status(422).json({
      success: false,
      error: error?.message || "Impossibile ottenere la risposta."
    });
  }
}
