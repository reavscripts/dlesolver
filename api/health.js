export default function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    ok: true,
    service: "dle-solver",
    version: "5.3.0",
    engine: "direct-network-v5.3+ui-v6.3+runtime-proxy-v4.0"
  });
}
