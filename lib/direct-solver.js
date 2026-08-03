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
  },
  {
    id: "bleachdle",
    name: "Bleachdle",
    hostnames: ["bleachdle.org"],
    strategy: "daily-bundle",
    modes: {
      classic: { label: "Classic" }
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


const BLEACHDLE_BUNDLE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let bleachdleBundleCache = null;

function decodeJsStringLiteral(source, startIndex) {
  const quote = source[startIndex];
  if (quote !== '"' && quote !== "'") {
    throw new Error("Stringa JavaScript non valida.");
  }

  let value = "";
  let index = startIndex + 1;

  while (index < source.length) {
    const char = source[index++];

    if (char === quote) {
      return { value, endIndex: index };
    }

    if (char !== "\\") {
      value += char;
      continue;
    }

    if (index >= source.length) break;
    const escape = source[index++];

    const simpleEscapes = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      v: "\v",
      0: "\0"
    };

    if (Object.prototype.hasOwnProperty.call(simpleEscapes, escape)) {
      value += simpleEscapes[escape];
      continue;
    }

    if (escape === "x") {
      const hex = source.slice(index, index + 2);
      if (!/^[0-9a-f]{2}$/i.test(hex)) {
        throw new Error("Escape esadecimale JavaScript non valido.");
      }
      value += String.fromCharCode(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }

    if (escape === "u") {
      if (source[index] === "{") {
        const end = source.indexOf("}", index + 1);
        if (end === -1) throw new Error("Escape Unicode JavaScript non valido.");
        const codePoint = source.slice(index + 1, end);
        if (!/^[0-9a-f]{1,6}$/i.test(codePoint)) {
          throw new Error("Escape Unicode JavaScript non valido.");
        }
        value += String.fromCodePoint(Number.parseInt(codePoint, 16));
        index = end + 1;
        continue;
      }

      const hex = source.slice(index, index + 4);
      if (!/^[0-9a-f]{4}$/i.test(hex)) {
        throw new Error("Escape Unicode JavaScript non valido.");
      }
      value += String.fromCharCode(Number.parseInt(hex, 16));
      index += 4;
      continue;
    }

    if (escape === "\n") continue;
    if (escape === "\r") {
      if (source[index] === "\n") index += 1;
      continue;
    }

    value += escape;
  }

  throw new Error("Stringa JavaScript non terminata.");
}

function extractBalancedArray(source, startIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = startIndex; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1] || "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function splitTopLevelObjects(arraySource) {
  const objects = [];
  let objectDepth = 0;
  let objectStart = -1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < arraySource.length; index++) {
    const char = arraySource[index];
    const next = arraySource[index + 1] || "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      objectDepth += 1;
      if (objectDepth === 1) objectStart = index;
      continue;
    }

    if (char === "}") {
      if (objectDepth === 1 && objectStart >= 0) {
        objects.push(arraySource.slice(objectStart, index + 1));
        objectStart = -1;
      }
      objectDepth -= 1;
    }
  }

  return objects;
}

function extractObjectName(objectSource) {
  const match = /\bname\s*:\s*/g.exec(objectSource);
  if (!match) return null;

  let index = match.index + match[0].length;
  while (/\s/.test(objectSource[index] || "")) index += 1;

  if (objectSource[index] !== '"' && objectSource[index] !== "'") return null;
  return decodeJsStringLiteral(objectSource, index).value.trim();
}

export function extractBleachdleCharacterNames(bundleSource) {
  const source = String(bundleSource || "");
  const markers = [...source.matchAll(/\[\s*\{\s*name\s*:/g)].slice(0, 30);
  let best = [];

  for (const marker of markers) {
    const arraySource = extractBalancedArray(source, marker.index);
    if (!arraySource) continue;

    const names = splitTopLevelObjects(arraySource)
      .map(extractObjectName)
      .filter(name => name && name.length <= 160);

    if (names.length > best.length) best = names;
  }

  if (best.length < 40 || best.length > 500) {
    throw new Error("Elenco personaggi Bleachdle non riconosciuto.");
  }

  return best;
}

function extractScriptUrls(html, baseUrl) {
  const urls = [];
  const regex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = regex.exec(String(html || "")))) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.origin === baseUrl.origin && /\.js(?:$|\?)/i.test(url.href)) {
        urls.push(url.href);
      }
    } catch {
      // Ignora URL non valide.
    }
  }

  return unique(urls).sort((left, right) => {
    const leftScore = /\/app\/bleach\/page-[^/]+\.js(?:$|\?)/i.test(left) ? 1 : 0;
    const rightScore = /\/app\/bleach\/page-[^/]+\.js(?:$|\?)/i.test(right) ? 1 : 0;
    return rightScore - leftScore;
  });
}

function getLocalDayOfYear(timezoneOffsetMinutes, now = new Date()) {
  const numericOffset = Number(timezoneOffsetMinutes);
  const safeOffset = Number.isFinite(numericOffset) ? numericOffset : 0;
  const shifted = new Date(now.getTime() - safeOffset * 60_000);

  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const currentDate = Date.UTC(year, month, day);
  const firstDate = Date.UTC(year, 0, 1);

  return Math.floor((currentDate - firstDate) / 86_400_000) + 1;
}

function normalizeBleachdleMode(pathname) {
  const mode = normalizeMode(pathname);
  if (!mode || mode === "indexhtml" || mode === "bleachhtml" || mode === "classic") {
    return "classic";
  }
  return mode;
}

async function loadBleachdleCharacterNames(site) {
  if (
    bleachdleBundleCache &&
    bleachdleBundleCache.expiresAt > Date.now() &&
    Array.isArray(bleachdleBundleCache.names)
  ) {
    return bleachdleBundleCache;
  }

  const origin = `https://${site.hostnames[0]}`;
  const gameUrl = new URL("/bleach.html", origin);
  const html = await fetchText(gameUrl.href, {
    attempts: 2,
    sourceOrigin: origin
  });

  const scripts = extractScriptUrls(html, gameUrl);
  if (!scripts.length) {
    throw new Error("Bundle Bleachdle non trovato.");
  }

  const errors = [];
  for (const scriptUrl of scripts.slice(0, 16)) {
    try {
      const bundle = await fetchText(scriptUrl, {
        attempts: 2,
        sourceOrigin: origin
      });
      const names = extractBleachdleCharacterNames(bundle);
      const result = {
        names,
        bundleUrl: scriptUrl,
        expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
      };
      bleachdleBundleCache = result;
      return result;
    } catch (error) {
      errors.push(`${new URL(scriptUrl).pathname}: ${error?.message || error}`);
    }
  }

  throw new Error(
    `Impossibile leggere l'elenco personaggi Bleachdle. ${errors.slice(-3).join(" | ")}`
  );
}

async function solveBleachdle(site, target, timezoneOffsetMinutes) {
  const mode = normalizeBleachdleMode(target.pathname);
  if (mode !== "classic") {
    throw new Error("Per Bleachdle è supportata soltanto la modalità Classic.");
  }

  const { names, bundleUrl } = await loadBleachdleCharacterNames(site);
  const dayOfYear = getLocalDayOfYear(timezoneOffsetMinutes);
  const answerIndex = dayOfYear % names.length;
  const answer = names[answerIndex];

  if (!answer) {
    throw new Error("Bleachdle non ha restituito la risposta giornaliera.");
  }

  return {
    success: true,
    site: site.name,
    hostname: target.hostname,
    mode: "classic",
    modeLabel: "Classic",
    answer,
    gameNumero: answerIndex,
    region: "local",
    source: "bleachdle-bundle",
    endpointName: "classic",
    bundle: new URL(bundleUrl).pathname
  };
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
    if (site.strategy === "daily-bundle") {
      return solveBleachdle(site, target, timezoneOffsetMinutes);
    }
    return solveNetworkSite(site, target, timezoneOffsetMinutes);
  }

  return {
    success: false,
    fallback: true,
    reason: "Nessun adattatore diretto disponibile per questo dominio."
  };
}
