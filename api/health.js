export default function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    ok: true,
    service: "dle-solver",
    version: "5.0.0",
    engine: "direct-network-v5.0+runtime-proxy-v4.0"
  });
}
