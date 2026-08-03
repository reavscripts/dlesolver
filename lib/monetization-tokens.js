import crypto from "node:crypto";

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function secretKey() {
  const secret = String(process.env.MONETIZATION_SECRET || "").trim();
  if (secret.length < 24) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

function seal(payload) {
  const key = secretKey();
  if (!key) throw new Error("Protezione monetizzazione non configurata.");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ["v1", toBase64Url(iv), toBase64Url(tag), toBase64Url(ciphertext)].join(".");
}

function open(token) {
  const key = secretKey();
  if (!key) throw new Error("Protezione monetizzazione non configurata.");

  const parts = String(token || "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Token non valido.");

  try {
    const iv = fromBase64Url(parts[1]);
    const tag = fromBase64Url(parts[2]);
    const ciphertext = fromBase64Url(parts[3]);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8"));
  } catch {
    throw new Error("Token non valido o alterato.");
  }
}

export function isServerGateEnabled() {
  return Boolean(secretKey());
}

export function issuePremiumToken(subscriptionId) {
  if (!isServerGateEnabled()) return "";
  const now = Date.now();
  return seal({
    kind: "premium",
    subscriptionId: String(subscriptionId || ""),
    issuedAt: now,
    expiresAt: now + 6 * 60 * 60 * 1000
  });
}

export function hasValidPremiumAuthorization(authorization) {
  const match = String(authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match || !isServerGateEnabled()) return false;

  try {
    const payload = open(match[1]);
    return payload?.kind === "premium" && Number(payload.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export function gateSolveResult(result, authorization) {
  if (!result?.success || !result?.answer) return result;

  if (hasValidPremiumAuthorization(authorization)) {
    return { ...result, premium: true };
  }

  const waitSeconds = clampInteger(process.env.ANSWER_WAIT_SECONDS, 60, 0, 120);
  if (waitSeconds <= 0 || !isServerGateEnabled()) {
    return { ...result, clientGateRequired: waitSeconds > 0 };
  }

  const now = Date.now();
  const unlockAt = now + waitSeconds * 1000;
  const expiresAt = now + Math.max(15 * 60 * 1000, waitSeconds * 1000 + 5 * 60 * 1000);
  const revealToken = seal({
    kind: "answer",
    answer: String(result.answer),
    unlockAt,
    expiresAt
  });

  const { answer: _answer, ...safeResult } = result;
  return {
    ...safeResult,
    pending: true,
    revealToken,
    waitSeconds,
    unlockAt
  };
}

export function revealAnswerToken(token, authorization) {
  const payload = open(token);
  if (payload?.kind !== "answer") throw new Error("Token risposta non valido.");

  const now = Date.now();
  if (Number(payload.expiresAt) <= now) throw new Error("Token risposta scaduto.");

  const premium = hasValidPremiumAuthorization(authorization);
  const remainingMs = Math.max(0, Number(payload.unlockAt) - now);
  if (!premium && remainingMs > 0) {
    return {
      ready: false,
      remainingSeconds: Math.ceil(remainingMs / 1000)
    };
  }

  return {
    ready: true,
    answer: String(payload.answer || ""),
    premium
  };
}
