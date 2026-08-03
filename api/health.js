export default function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    ok: true,
    service: "dle-solver",
    version: "5.2.0",
    engine: "direct-network-v5.0+ui-v6.1+runtime-proxy-v4.0"
  });
}
