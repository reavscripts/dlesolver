import { isServerGateEnabled, issuePremiumToken } from "./monetization-tokens.js";

const PAYPAL_BASES = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com"
};

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function paypalEnvironment() {
  return String(process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
    ? "live"
    : "sandbox";
}

export function getPublicMonetizationConfig() {
  const paypalClientId = String(process.env.PAYPAL_CLIENT_ID || "").trim();
  const paypalPlanId = String(process.env.PAYPAL_PLAN_ID || "").trim();
  const paypalReady = Boolean(
    paypalClientId &&
    paypalPlanId &&
    String(process.env.PAYPAL_CLIENT_SECRET || "").trim()
  );

  return {
    waitSeconds: clampInteger(process.env.ANSWER_WAIT_SECONDS, 60, 0, 120),
    paypal: {
      enabled: paypalReady,
      clientId: paypalReady ? paypalClientId : "",
      planId: paypalReady ? paypalPlanId : "",
      environment: paypalEnvironment()
    },
    ads: {
      adsenseClient: String(process.env.ADSENSE_CLIENT_ID || "").trim(),
      adsenseSlot: String(process.env.ADSENSE_SLOT_ID || "").trim()
    },
    serverGateEnabled: isServerGateEnabled()
  };
}

async function getPayPalAccessToken() {
  const clientId = String(process.env.PAYPAL_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("Credenziali PayPal non configurate sul server.");
  }

  const base = PAYPAL_BASES[paypalEnvironment()];
  const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${authorization}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json"
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || "Autenticazione PayPal non riuscita.");
  }

  return { token: payload.access_token, base };
}

export async function verifyPayPalSubscription(subscriptionId) {
  const id = String(subscriptionId || "").trim();
  if (!/^[A-Z0-9-]{8,64}$/i.test(id)) {
    throw new Error("ID abbonamento PayPal non valido.");
  }

  const configuredPlanId = String(process.env.PAYPAL_PLAN_ID || "").trim();
  if (!configuredPlanId) {
    throw new Error("Piano PayPal non configurato sul server.");
  }

  const { token, base } = await getPayPalAccessToken();
  const response = await fetch(`${base}/v1/billing/subscriptions/${encodeURIComponent(id)}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json"
    },
    signal: AbortSignal.timeout(15000)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(payload?.message || "Verifica dell'abbonamento PayPal non riuscita.");
  }

  const planMatches = payload.plan_id === configuredPlanId;
  const active = payload.status === "ACTIVE" && planMatches;

  return {
    active,
    subscriptionId: id,
    status: String(payload.status || "UNKNOWN"),
    planMatches,
    nextBillingTime: payload.billing_info?.next_billing_time || null,
    premiumToken: active ? issuePremiumToken(id) : ""
  };
}
