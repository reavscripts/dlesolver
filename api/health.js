export default function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    ok: true,
    service: "dle-solver",
    version: "4.12.0",
    engine: "direct-network-v4.12+runtime-proxy-v4.0"
  });
}
