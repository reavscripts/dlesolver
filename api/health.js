export default function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    ok: true,
    service: "dle-solver",
    version: "4.9.0",
    engine: "direct-network-v4.9+runtime-proxy-v4.0"
  });
}
