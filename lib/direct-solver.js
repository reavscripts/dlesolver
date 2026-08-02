import crypto from "node:crypto";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "Chrome/130.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 4_000_000;
const ANSWER_KEY = "QhDZJfngdx";
const CACHE_KEY = "D5XCtTOObw";

const SITE_CONFIGS = [
  {
    id: "onepiecedle",
    name: "OnePieceDle",
    hostnames: ["onepiecedle.net"],
    apiBases: ["https://onepiecedle.apimeko.link"],
    cacheUrls: ["https://cache.onepiecedle.net/cache.json"],
    modes: {
      classic: { label: "Classic", endpoints: ["classic"] },
      devilfruit: { label: "Devil Fruit", endpoints: ["devilFruit", "devilfruit"] },
      wanted: { label: "Wanted", endpoints: ["wanted"] },
      laugh: { label: "Laugh", endpoints: ["laugh"] }
    }
  },
  {
    id: "narutodle",
    name: "Narutodle",
    hostnames: ["narutodle.net"],
    apiBases: ["https://narutodle.apimeko.link"],
    cacheUrls: ["https://cache.narutodle.net/cache.json"],
    modes: {
      classic: { label: "Classic", endpoints: ["classic"] },
      jutsu: { label: "Jutsu", endpoints: ["jutsu"] },
      quote: { label: "Quote", endpoints: ["quote"] },
      eye: { label: "Eye", endpoints: ["eye"] }
    }
  },
  {
    id: "loldle",
    name: "LoLdle",
    hostnames: ["loldle.net"],
    apiBases: ["https://loldle.apimeko.link"],
    cacheUrls: ["https://cache.loldle.net/cache.json"],
    modes: {
      classic: { label: "Classic", endpoints: ["classic"] },
      quote: { label: "Quote", endpoints: ["quote"] },
      ability: { label: "Ability", endpoints: ["ability"] },
      emoji: { label: "Emoji", endpoints: ["emoji"] },
      splash: { label: "Splash", endpoints: ["splash", "splashArt"] }
    }
  },
  {
    id: "pokedle",
    name: "Pokédle",
    hostnames: ["pokedle.net"],
    apiBases: ["https://pokedle.apimeko.link"],
    cacheUrls: ["https://cache.pokedle.net/cache.json"],
    modes: {
      classic: { label: "Classic", endpoints: ["classic"] },
      card: { label: "Card", endpoints: ["card"] },
      flavor: { label: "Flavor", endpoints: ["flavor", "flavorText"] },
      silhouette: { label: "Silhouette", endpoints: ["silhouette"] }
    }
  },
  {
    id: "dotadle",
    name: "Dotadle",
    hostnames: ["dotadle.net"],
    apiBases: ["https://dotadle.apimeko.link"],
    cacheUrls: ["https://cache.dotadle.net/cache.json"],
    modes: {
      classic: { label: "Classic", endpoints: ["classic"] },
      quote: { label: "Quote", endpoints: ["quote"] },
      ability: { label: "Ability", endpoints: ["ability"] },
      loadingscreen: { label: "Loading Screen", endpoints: ["loadingScreen", "loadingscreen"] }
    }
  },
  {
    id: "smashdle",
    name: "Smashdle",
    hostnames: ["smashdle.net"],
    apiBases: ["https://smashdle.apimeko.link"],
    cacheUrls: ["https://cache.smashdle.net/cache.json"],
    modes: {
      classic: { label: "Classic", endpoints: ["classic"] },
      finalsmash: { label: "Final Smash", endpoints: ["finalSmash", "finalsmash"] },
      kirby: { label: "Kirby", endpoints: ["kirby"] },
      emoji: { label: "Emoji", endpoints: ["emoji"] },
      silhouette: { label: "Silhouette", endpoints: ["silhouette"] }
    }
  }
];

const SITE_BY_HOST = new Map();
for (const site of SITE_CONFIGS) {
  for (const hostname of site.hostnames) {
    SITE_BY_HOST.set(hostname, site);
    SITE_BY_HOST.set(`www.${hostname}`, site);
  }
}

function normalizeMode(pathname) {
  return String(pathname || "")
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .split("/")[0]
    .replace(/[^a-z0-9]/g, "");
}

function parseSolverUrl(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Inserisci un link completo.");
  }

  const target = new URL(input.trim());
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    throw new Error("Sono consentiti soltanto link HTTP o HTTPS.");
  }

  target.hash = "";
  return target;
}

function chooseRegion(timezoneOffsetMinutes) {
  const offsetHours = Number(timezoneOffsetMinutes) / 60;
  const safeOffset = Number.isFinite(offsetHours) ? offsetHours : 0;

  // Il valore ricevuto dal browser è Date#getTimezoneOffset():
  // Italia in estate = -120 minuti, quindi area Europe (utc=2).
  const distanceEurope = Math.abs(safeOffset - -2);
  const distanceAmerica = Math.abs(safeOffset - 6);

  if (distanceEurope < distanceAmerica) {
    return { name: "europe", utc: 2 };
  }

  return { name: "america", utc: -6 };
}

async function fetchText(url, { attempts = 2, sourceOrigin = "" } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const headers = {
        "user-agent": USER_AGENT,
        "accept": "application/json,text/plain,*/*",
        "accept-language": "en-US,en;q=0.9,it;q=0.8",
        "cache-control": "no-cache",
        "pragma": "no-cache"
      };

      if (sourceOrigin) {
        headers.origin = sourceOrigin;
        headers.referer = `${sourceOrigin}/`;
      }

      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > MAX_RESPONSE_BYTES) {
        throw new Error("La risposta remota è troppo grande.");
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_RESPONSE_BYTES) {
        throw new Error("La risposta remota è troppo grande.");
      }

      return bytes.toString("utf8");
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 250 * attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("Impossibile contattare il server remoto.");
}

function findEncryptedString(value, depth = 0) {
  if (depth > 7 || value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^U2FsdGVkX1[A-Za-z0-9+/=]+$/.test(trimmed)) return trimmed;
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEncryptedString(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const preferredKeys = ["data", "answer", "encrypted", "value", "payload", "result"];
    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = findEncryptedString(value[key], depth + 1);
        if (found) return found;
      }
    }

    for (const item of Object.values(value)) {
      const found = findEncryptedString(item, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function extractEncryptedPayload(rawText) {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) throw new Error("Risposta vuota.");

  if (/^U2FsdGVkX1[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const found = findEncryptedString(parsed);
    if (found) return found;
  } catch {
    // Il body può essere testo semplice.
  }

  const match = trimmed.match(/U2FsdGVkX1[A-Za-z0-9+/=]+/);
  if (match) return match[0];

  throw new Error("Formato cifrato non riconosciuto.");
}

function evpBytesToKey(password, salt, keyLength = 32, ivLength = 16) {
  const passwordBytes = Buffer.from(String(password), "utf8");
  const totalLength = keyLength + ivLength;
  const blocks = [];
  let previous = Buffer.alloc(0);
  let generatedLength = 0;

  while (generatedLength < totalLength) {
    const hash = crypto.createHash("md5");
    hash.update(previous);
    hash.update(passwordBytes);
    hash.update(salt);
    previous = hash.digest();
    blocks.push(previous);
    generatedLength += previous.length;
  }

  const derived = Buffer.concat(blocks, generatedLength);
  return {
    key: derived.subarray(0, keyLength),
    iv: derived.subarray(keyLength, keyLength + ivLength)
  };
}

export function decryptCryptoJsOpenSsl(ciphertext, passphrase) {
  const input = Buffer.from(String(ciphertext || "").trim(), "base64");
  const header = input.subarray(0, 8).toString("ascii");

  if (header !== "Salted__" || input.length <= 16) {
    throw new Error("Payload CryptoJS non valido.");
  }

  const salt = input.subarray(8, 16);
  const encrypted = input.subarray(16);
  const { key, iv } = evpBytesToKey(passphrase, salt);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(true);

  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

const IDENTITY_FIELDS = [
  "champion_name", "championName",
  "character_name", "characterName",
  "pokemon_name", "pokemonName",
  "hero_name", "heroName",
  "fighter_name", "fighterName",
  "answer_name", "answerName",
  "name"
];

function extractIdentity(payload, depth = 0) {
  if (depth > 5 || payload === null || payload === undefined) return null;

  if (typeof payload === "string") {
    const value = payload.trim();
    return value && value.length <= 220 ? value : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const answer = extractIdentity(item, depth + 1);
      if (answer) return answer;
    }
    return null;
  }

  if (typeof payload !== "object") return null;

  for (const field of IDENTITY_FIELDS) {
    if (typeof payload[field] === "string" && payload[field].trim()) {
      return payload[field].trim();
    }
  }

  for (const key of ["data", "answer", "result", "payload", "todayAnswer", "character", "champion", "pokemon", "hero"]) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const answer = extractIdentity(payload[key], depth + 1);
      if (answer) return answer;
    }
  }

  return null;
}

function parseDecryptedAnswer(plainText) {
  const trimmed = String(plainText || "").trim();
  if (!trimmed) throw new Error("La risposta decifrata è vuota.");

  try {
    const parsed = JSON.parse(trimmed);
    const answer = extractIdentity(parsed);
    if (!answer) throw new Error("Il nome non è presente nel payload.");
    return { answer, payload: parsed };
  } catch (error) {
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return { answer: trimmed, payload: { name: trimmed } };
    }
    throw error;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function solveFromApi(site, modeConfig, region, sourceOrigin) {
  const errors = [];

  for (const apiBase of site.apiBases) {
    for (const endpointName of unique(modeConfig.endpoints)) {
      for (const suffix of ["answer", "answer/name"]) {
        const endpoint = `${apiBase}/games/${endpointName}/${suffix}?utc=${region.utc}`;

        try {
          const raw = await fetchText(endpoint, { attempts: 2, sourceOrigin });
          const encrypted = extractEncryptedPayload(raw);
          const plain = decryptCryptoJsOpenSsl(encrypted, ANSWER_KEY);
          const parsed = parseDecryptedAnswer(plain);

          return {
            ...parsed,
            source: `${site.id}-api`,
            endpoint,
            endpointName
          };
        } catch (error) {
          errors.push(`${endpointName}/${suffix}: ${error?.message || error}`);
        }
      }
    }
  }

  throw new Error(errors.slice(-6).join(" | ") || "API non disponibile.");
}

async function solveFromCache(site, routeMode, modeConfig, region, sourceOrigin) {
  const errors = [];
  const modeNames = unique([...modeConfig.endpoints, routeMode]);

  for (const cacheUrl of site.cacheUrls) {
    try {
      const separator = cacheUrl.includes("?") ? "&" : "?";
      const raw = await fetchText(`${cacheUrl}${separator}_=${Date.now()}`, {
        attempts: 2,
        sourceOrigin
      });
      const outerEncrypted = extractEncryptedPayload(raw);
      const cachePlain = decryptCryptoJsOpenSsl(outerEncrypted, CACHE_KEY);
      const cache = JSON.parse(cachePlain);

      for (const modeName of modeNames) {
        const key = `${modeName}_answerEncrypted_${region.name}`;
        const innerEncrypted = cache?.[key];
        if (typeof innerEncrypted !== "string" || !innerEncrypted.trim()) continue;

        const plain = decryptCryptoJsOpenSsl(innerEncrypted, ANSWER_KEY);
        const parsed = parseDecryptedAnswer(plain);

        return {
          ...parsed,
          source: `${site.id}-cache`,
          cacheKey: key,
          endpointName: modeName
        };
      }

      errors.push(`${cacheUrl}: modalità assente`);
    } catch (error) {
      errors.push(`${cacheUrl}: ${error?.message || error}`);
    }
  }

  throw new Error(errors.slice(-4).join(" | ") || "Cache non disponibile.");
}

async function solveNetworkSite(site, target, timezoneOffsetMinutes) {
  const mode = normalizeMode(target.pathname) || "classic";
  const modeConfig = site.modes[mode];

  if (!modeConfig) {
    throw new Error(`Modalità ${site.name} non supportata.`);
  }

  const region = chooseRegion(timezoneOffsetMinutes);
  const sourceOrigin = `https://${site.hostnames[0]}`;
  const errors = [];

  try {
    const result = await solveFromApi(site, modeConfig, region, sourceOrigin);
    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode,
      modeLabel: modeConfig.label,
      answer: result.answer,
      gameNumero: result.payload?.game_numero ?? result.payload?.gameNumero ?? null,
      region: region.name,
      source: result.source,
      endpointName: result.endpointName
    };
  } catch (error) {
    errors.push(`API: ${error?.message || error}`);
  }

  try {
    const result = await solveFromCache(site, mode, modeConfig, region, sourceOrigin);
    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode,
      modeLabel: modeConfig.label,
      answer: result.answer,
      gameNumero: result.payload?.game_numero ?? result.payload?.gameNumero ?? null,
      region: region.name,
      source: result.source,
      endpointName: result.endpointName
    };
  } catch (error) {
    errors.push(`Cache: ${error?.message || error}`);
  }

  throw new Error(`${site.name} non ha restituito la risposta. ${errors.join(" | ")}`);
}

export function isDirectlySupportedHostname(hostname) {
  return SITE_BY_HOST.has(String(hostname || "").toLowerCase());
}

export function getDirectSites() {
  return SITE_CONFIGS.map(site => ({
    id: site.id,
    name: site.name,
    hostnames: [...site.hostnames],
    modes: Object.keys(site.modes)
  }));
}

export async function solveDirect(inputUrl, timezoneOffsetMinutes = 0) {
  const target = parseSolverUrl(inputUrl);
  const hostname = target.hostname.toLowerCase();
  const site = SITE_BY_HOST.get(hostname);

  if (site) {
    return solveNetworkSite(site, target, timezoneOffsetMinutes);
  }

  return {
    success: false,
    fallback: true,
    reason: "Nessun adattatore diretto disponibile per questo dominio."
  };
}
