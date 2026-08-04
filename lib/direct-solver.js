import crypto from "node:crypto";
import seedrandom from "seedrandom";
import { PUBLISHER_FALLBACKS } from "./publisher-fallbacks.js";

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
    strategy: "bleachdle-bundle",
    modes: {
      classic: { label: "Classic" },
      wordly: { label: "Wordly" }
    }
  },
  {
    id: "jujutsudle",
    name: "Jujutsudle",
    hostnames: ["jujutsudle.com"],
    strategy: "jujutsudle-bundle",
    modes: {
      classic: { label: "Classic" },
      jujutsupoint: { label: "Jujutsu Point" },
      wordly: { label: "Wordly" }
    }
  },
  {
    id: "narutodleorg",
    name: "Narutodle.org",
    hostnames: ["narutodle.org"],
    strategy: "publisher-daily",
    modes: {
      classic: {
        label: "Classic",
        kind: "classic-bundle",
        aliases: ["", "indexhtml", "narutodleembed"],
        pagePath: "/narutodle-embed/",
        scriptHint: "/app/naruto/page-"
      },
      narutopoint: {
        label: "NarutoPoint",
        kind: "dated-category",
        aliases: ["narutopoint"],
        dataPath: "/static/js/narutodle.json"
      },
      wordly: {
        label: "Naruto Wordly",
        kind: "wordly-bundle",
        aliases: ["wordly", "narutowordly", "narutowordlyhtm", "narutowordlyhtml"],
        pagePath: "/naruto-wordly.htm",
        scriptHint: "/static/js/narutolev2.js"
      },
      uzumakidle: {
        label: "Uzumakidle",
        kind: "phrase-bundle",
        aliases: ["uzumakidle"],
        pagePath: "/uzumakidle/",
        scriptHint: "/uzumakidle/static/js/uzumakidlev2.js"
      }
    }
  },
  {
    id: "kimetsudle",
    name: "Kimetsudle",
    hostnames: ["kimetsudle.com"],
    strategy: "publisher-daily",
    modes: {
      classic: {
        label: "Classic",
        kind: "classic-bundle",
        aliases: ["", "indexhtml", "demonslayerhtml"],
        pagePath: "/demonslayer.html",
        scriptHint: "/app/demonslayer/page-"
      },
      wordly: {
        label: "Wordly",
        kind: "wordly-bundle",
        aliases: ["wordly", "kimetsuwordly", "kimetsuwordlyhtm", "kimetsuwordlyhtml"],
        pagePath: "/kimetsu-wordly.htm",
        scriptHint: "/static/js/kimetsudlev2.js"
      }
    }
  },
  {
    id: "jojodle",
    name: "Jojodle",
    hostnames: ["jojodle.com"],
    strategy: "publisher-daily",
    modes: {
      classic: {
        label: "Classic",
        kind: "classic-bundle",
        aliases: ["", "indexhtml", "jojohtml"],
        pagePath: "/jojo.html",
        scriptHint: "/app/jojo/page-"
      },
      jojopoint: {
        label: "JoJoPoint",
        kind: "dated-category",
        aliases: ["jojopoint"],
        dataPath: "/static/js/jojodle.json"
      },
      wordly: {
        label: "Wordly",
        kind: "wordly-bundle",
        aliases: ["wordly", "jojowordly", "jojowordlyhtm", "jojowordlyhtml"],
        pagePath: "/jojo-wordly.htm",
        scriptHint: "/static/js/jojodlev2.js"
      },
      joestardle: {
        label: "Joestardle",
        kind: "phrase-bundle",
        aliases: ["joestardle"],
        pagePath: "/joestardle/",
        scriptHint: "/joestardle/static/js/joestardlev2.js"
      }
    }
  },
  {
    id: "bluelockdle",
    name: "Bluelockdle",
    hostnames: ["bluelockdle.com"],
    strategy: "publisher-daily",
    modes: {
      classic: {
        label: "Classic",
        kind: "classic-bundle",
        aliases: ["", "indexhtml", "bluelockhtml"],
        pagePath: "/bluelock.html",
        scriptHint: "/app/bluelock/page-"
      },
      wordly: {
        label: "Wordly",
        kind: "wordly-bundle",
        aliases: ["wordly", "bluelockwordly", "bluelockwordlyhtm", "bluelockwordlyhtml"],
        pagePath: "/bluelock-wordly.htm",
        scriptHint: "/static/js/bluelockdlev2.js"
      }
    }
  },
  {
    id: "genshindle",
    name: "Genshindle",
    hostnames: ["genshindle.org"],
    strategy: "publisher-daily",
    modes: {
      wordly: {
        label: "Wordly",
        kind: "wordly-bundle",
        aliases: ["", "indexhtml", "wordly"],
        pagePath: "/",
        scriptHint: "/static/js/genshindlev2.js"
      },
      daily: {
        label: "Genshinle Daily",
        kind: "seeded-ability",
        aliases: ["genshinlegame"],
        dataPath: "/genshinle-game/abilities.json"
      },
      paimordle: {
        label: "Paimordle",
        kind: "timestamp-word",
        aliases: ["paimordle", "paimordlehtml", "paimordleembed"],
        pagePath: "/paimordle-embed/",
        scriptHint: "/paimordle-embed/static/js/main."
      }
    }
  },
  {
    id: "animedle",
    name: "Animedle",
    hostnames: ["animedle.org"],
    strategy: "publisher-daily",
    modes: {
      onepiececlassic: {
        label: "Onepiecedle Classic",
        kind: "classic-bundle",
        aliases: ["onepiecedle", "onepiecehtml"],
        pagePath: "/onepiece.html",
        scriptHint: "/app/onepiece/page-"
      },
      onepiecewordly: {
        label: "Onepiecedle Wordly",
        kind: "wordly-bundle",
        aliases: ["onepiecedleonepiecewordlyhtm", "onepiecedleonepiecewordlyhtml"],
        pagePath: "/onepiecedle/onepiece-wordly.htm",
        scriptHint: "/onepiecedle/static/js/onepiecedlev2.js"
      },
      dragonballclassic: {
        label: "Dragonballdle Classic",
        kind: "classic-bundle",
        aliases: ["dragonballdle", "dragonballhtml"],
        pagePath: "/dragonball.html",
        scriptHint: "/app/dragonball/page-"
      },
      dragonballwordly: {
        label: "Dragonballdle Wordly",
        kind: "wordly-bundle",
        aliases: ["dragonballdledragonballwordlyhtm", "dragonballdledragonballwordlyhtml"],
        pagePath: "/dragonballdle/dragonball-wordly.htm",
        scriptHint: "/dragonballdle/static/js/dragonballdlev2.js"
      }
    }
  },
  {
    id: "opmdle",
    name: "OPMdle",
    hostnames: ["opmdle.com"],
    strategy: "publisher-daily",
    modes: {
      classic: {
        label: "Classic",
        kind: "classic-bundle",
        aliases: ["", "indexhtml", "onepunchmanhtml"],
        pagePath: "/onepunchman.html",
        scriptHint: "/app/onepunchman/page-"
      },
      wordly: {
        label: "Wordly",
        kind: "wordly-bundle",
        aliases: ["wordly", "onepunchmanwordly", "onepunchmanwordlyhtm", "onepunchmanwordlyhtml"],
        pagePath: "/one-punch-man-wordly.htm",
        scriptHint: "/static/js/opmdlev2.js"
      }
    }
  },
  {
    id: "pokentions",
    name: "Pokentions",
    hostnames: ["pokedoku.org"],
    strategy: "publisher-daily",
    modes: {
      daily: {
        label: "Daily Connections",
        kind: "connections",
        aliases: ["pokentions", "pokentionsdaily"],
        dataPath: "/pokentions/game-specs.json"
      }
    }
  },
  {
    id: "riddlescom",
    name: "Riddles.com",
    hostnames: ["riddles.com"],
    strategy: "riddle-hub",
    modes: {
      daily: { label: "Riddle of the Day" },
      rirdle: { label: "RiRdle" }
    }
  },
  {
    id: "riddleday",
    name: "RiddleDay",
    hostnames: ["riddledays.com"],
    strategy: "riddleday-rotation",
    modes: {
      adultseasy: { label: "Adults · Easy", audience: "adults", level: "easy" },
      adultsmedium: { label: "Adults · Medium", audience: "adults", level: "medium" },
      adultshard: { label: "Adults · Hard", audience: "adults", level: "hard" },
      kidseasy: { label: "Kids · Easy", audience: "kids", level: "easy" },
      kidsmedium: { label: "Kids · Medium", audience: "kids", level: "medium" },
      kidshard: { label: "Kids · Hard", audience: "kids", level: "hard" }
    }
  },
  {
    id: "riddletime",
    name: "Riddle Time",
    hostnames: ["riddletime.co"],
    strategy: "next-riddle",
    modes: {
      daily: { label: "Daily Riddle", pagePath: "/daily" }
    }
  },
  {
    id: "riddlecafe",
    name: "Riddle Cafe",
    hostnames: ["riddlecafe.com", "triviacafe.com"],
    strategy: "jsonld-riddle",
    modes: {
      daily: { label: "Daily Riddle", pagePath: "/riddles" }
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

function normalizeFullPath(pathname) {
  return String(pathname || "")
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
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

async function fetchText(
  url,
  { attempts = 2, sourceOrigin = "", maxResponseBytes = MAX_RESPONSE_BYTES } = {}
) {
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
      if (declaredLength > maxResponseBytes) {
        throw new Error("La risposta remota è troppo grande.");
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > maxResponseBytes) {
        throw new Error("La risposta remota è troppo grande.");
      }

      return bytes.toString("utf8").replace(/^\uFEFF/, "");
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
let bleachdleWordlyBundleCache = null;
let jujutsudleBundleCache = null;
let jujutsupointCache = null;
let jujutsudleWordlyBundleCache = null;
const publisherDailyCache = new Map();

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

function extractBalancedObject(source, startIndex) {
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
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
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
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, index + 1);
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

function extractStringField(objectSource, fieldName) {
  const escapedField = String(fieldName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[{,]\\s*)["']?${escapedField}["']?\\s*:\\s*`, "i").exec(
    objectSource
  );
  if (!match) return null;

  let index = match.index + match[0].length;
  while (/\s/.test(objectSource[index] || "")) index += 1;
  if (objectSource[index] !== '"' && objectSource[index] !== "'") return null;
  return decodeJsStringLiteral(objectSource, index).value.trim();
}

function extractRiddleObjects(arraySource, questionField, answerField) {
  return splitTopLevelObjects(arraySource)
    .map(objectSource => ({
      question: extractStringField(objectSource, questionField),
      answer: extractStringField(objectSource, answerField)
    }))
    .filter(item => item.question && item.answer);
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&", apos: "'", gt: ">", hellip: "…", ldquo: "“", lsquo: "‘",
    lt: "<", mdash: "—", nbsp: " ", ndash: "–", quot: '"', rdquo: "”", rsquo: "’"
  };

  return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, key) => {
    if (key[0] === "#") {
      const hexadecimal = key[1]?.toLowerCase() === "x";
      const numeric = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(numeric) && numeric >= 0 && numeric <= 0x10ffff
        ? String.fromCodePoint(numeric)
        : entity;
    }
    return named[key.toLowerCase()] ?? entity;
  });
}

function stripHtmlText(value) {
  return decodeHtmlEntities(
    String(value || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  )
    .replace(/[\t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function extractRirdleRotation(html) {
  const source = String(html || "");
  const marker = /\bconst\s+dailyPuzzles\s*=\s*\[/i.exec(source);
  if (!marker) throw new Error("Rotazione RiRdle non trovata.");

  const arrayStart = source.indexOf("[", marker.index);
  const arraySource = extractBalancedArray(source, arrayStart);
  const puzzles = arraySource ? extractRiddleObjects(arraySource, "riddle", "answer") : [];
  if (puzzles.length < 10 || puzzles.length > 500) {
    throw new Error("Rotazione RiRdle non riconosciuta.");
  }
  return { puzzles, baseYear: 2024, baseMonth: 0, baseDay: 1 };
}

export function extractRiddleDayRotation(html, audience = "adults", level = "easy") {
  const safeAudience = audience === "kids" ? "kids" : "adults";
  const safeLevel = ["easy", "medium", "hard"].includes(level) ? level : "easy";
  const source = String(html || "");
  const marker = /\b(?:const|let|var)\s+RIDDLES\s*=\s*\{/i.exec(source);
  if (!marker) throw new Error("Catalogo RiddleDay non trovato.");

  const rootSource = extractBalancedObject(source, source.indexOf("{", marker.index));
  if (!rootSource) throw new Error("Catalogo RiddleDay non valido.");
  const audienceMatch = new RegExp(
    `(?:^|[{,]\\s*)["']?${safeAudience}["']?\\s*:\\s*\\{`,
    "i"
  ).exec(rootSource);
  if (!audienceMatch) throw new Error(`Sezione RiddleDay ${safeAudience} non trovata.`);
  const audienceStart = rootSource.indexOf("{", audienceMatch.index + audienceMatch[0].length - 1);
  const audienceSource = extractBalancedObject(rootSource, audienceStart);
  const levelMatch = new RegExp(
    `(?:^|[{,]\\s*)["']?${safeLevel}["']?\\s*:\\s*\\[`,
    "i"
  ).exec(audienceSource || "");
  if (!levelMatch) throw new Error(`Livello RiddleDay ${safeLevel} non trovato.`);
  const levelStart = audienceSource.indexOf("[", levelMatch.index + levelMatch[0].length - 1);
  const levelSource = extractBalancedArray(audienceSource, levelStart);
  const puzzles = levelSource ? extractRiddleObjects(levelSource, "q", "a") : [];
  if (puzzles.length < 10 || puzzles.length > 500) {
    throw new Error(`Rotazione RiddleDay ${safeAudience} ${safeLevel} non riconosciuta.`);
  }
  return { puzzles, baseYear: 2024, baseMonth: 0, baseDay: 1 };
}

export function extractRiddlesComAnswer(html) {
  const source = String(html || "");
  const answerMatch = /<strong\b[^>]*class=["'][^"']*\bdark_purple\b[^"']*["'][^>]*>\s*Answer\s*<\/strong>\s*:?\s*([\s\S]*?)(?=<div\b|<\/div>|<hr\b|<\/p>)/i.exec(source);
  const answer = stripHtmlText(answerMatch?.[1] || "")
    .replace(/\s*Source:\s*https?:\/\/\S+\s*$/i, "")
    .trim();
  if (!answer) throw new Error("Risposta Riddles.com non trovata.");

  const dateMatch = /\bROD:\s*(\d{2}-\d{2}-\d{4})\b/i.exec(source);
  const idMatch = /\bid=["']collapse(\d+)["']/i.exec(source);
  return {
    answer,
    date: dateMatch?.[1] || null,
    id: idMatch ? Number(idMatch[1]) : null
  };
}

export function extractNextRiddle(html) {
  const source = String(html || "");
  const escapedMatch = /\\"question\\":\\"((?:\\\\.|[^"\\])*)\\",\\"answer\\":\\"((?:\\\\.|[^"\\])*)\\"/i.exec(source);
  const plainMatch = /"question"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"answer"\s*:\s*"((?:\\.|[^"\\])*)"/i.exec(source);
  const match = escapedMatch || plainMatch;
  if (!match) throw new Error("Dati giornalieri Riddle Time non trovati.");

  const decodeJsonString = value =>
    JSON.parse(`"${escapedMatch ? value.replace(/\\\\/g, "\\") : value}"`);
  const question = decodeJsonString(match[1]).trim();
  const answer = decodeJsonString(match[2]).trim();
  if (!question || !answer) throw new Error("Dati giornalieri Riddle Time non validi.");
  return { question, answer };
}

export function extractJsonLdRiddle(html) {
  const source = String(html || "");
  const scripts = [...source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const candidates = [];
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value["@type"] === "FAQPage" && Array.isArray(value.mainEntity)) {
      candidates.push(...value.mainEntity);
    }
    if (value["@type"] === "Question") candidates.push(value);
    for (const nested of Object.values(value)) visit(nested);
  };

  for (const script of scripts) {
    try {
      visit(JSON.parse(script[1].trim()));
    } catch {
      // Ignora blocchi JSON-LD non validi e prova i successivi.
    }
  }
  for (const candidate of candidates) {
    const question = stripHtmlText(candidate?.name || candidate?.text || "");
    const answer = stripHtmlText(candidate?.acceptedAnswer?.text || "");
    if (question && answer) return { question, answer };
  }
  throw new Error("Risposta JSON-LD del riddle non trovata.");
}

function extractDailyCharacterNames(bundleSource, siteName) {
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

  if (best.length < 20 || best.length > 500) {
    throw new Error(`Elenco personaggi ${siteName} non riconosciuto.`);
  }

  return best;
}

export function extractBleachdleCharacterNames(bundleSource) {
  return extractDailyCharacterNames(bundleSource, "Bleachdle");
}

export function extractJujutsudleCharacterNames(bundleSource) {
  return extractDailyCharacterNames(bundleSource, "Jujutsudle");
}

export function extractPublisherCharacterNames(bundleSource, siteName = "DLE") {
  return extractDailyCharacterNames(bundleSource, siteName);
}

export function extractJujutsupointPuzzle(rawText, localDateKey) {
  let history;
  try {
    history = JSON.parse(String(rawText || ""));
  } catch {
    throw new Error("Archivio Jujutsu Point non valido.");
  }

  if (!history || Array.isArray(history) || typeof history !== "object") {
    throw new Error("Archivio Jujutsu Point non riconosciuto.");
  }

  const dateKey = String(localDateKey || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Data locale Jujutsu Point non valida.");
  }

  const availableKeys = Object.keys(history).filter(
    key => /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= dateKey
  );
  const targetKey = Object.prototype.hasOwnProperty.call(history, dateKey)
    ? dateKey
    : availableKeys[0];
  const puzzle = targetKey ? history[targetKey] : null;
  const answer = typeof puzzle?.category === "string"
    ? puzzle.category.trim()
    : "";

  if (!targetKey || !answer) {
    throw new Error("Puzzle giornaliero Jujutsu Point non disponibile.");
  }

  return {
    answer,
    date: targetKey,
    id: puzzle?.id ?? null,
    image: typeof puzzle?.image === "string" ? puzzle.image : "",
    clues: Array.isArray(puzzle?.clues) ? puzzle.clues : []
  };
}

function extractObjectSolution(objectSource) {
  const match = /\bsolution\s*:\s*/g.exec(objectSource);
  if (!match) return null;

  let index = match.index + match[0].length;
  while (/\s/.test(objectSource[index] || "")) index += 1;

  if (objectSource[index] !== '"' && objectSource[index] !== "'") return null;
  return decodeJsStringLiteral(objectSource, index).value.trim();
}

export function extractBleachdleWordlyRotation(bundleSource) {
  const source = String(bundleSource || "");
  const markers = [...source.matchAll(/\[\s*\{\s*solution\s*:/g)].slice(0, 40);
  let bestSolutions = [];

  for (const marker of markers) {
    const arraySource = extractBalancedArray(source, marker.index);
    if (!arraySource) continue;

    const solutions = splitTopLevelObjects(arraySource)
      .map(extractObjectSolution)
      .filter(solution => solution && solution.length <= 160);

    if (solutions.length > bestSolutions.length) bestSolutions = solutions;
  }

  if (bestSolutions.length < 40 || bestSolutions.length > 500) {
    throw new Error("Elenco soluzioni Bleachdle Wordly non riconosciuto.");
  }

  const rotationMatch = source.match(
    /new Date\(\s*(\d{4})\s*,\s*(\d{1,2})(?:\s*,\s*(\d{1,2}))?\s*\)[\s\S]{0,1800}?\(\(\s*[A-Za-z_$][\w$]*\s*\+\s*(-?\d+)\s*\)\s*%\s*[A-Za-z_$][\w$]*\.length\s*\)/
  );

  if (!rotationMatch) {
    throw new Error("Rotazione giornaliera Bleachdle Wordly non riconosciuta.");
  }

  return {
    solutions: bestSolutions,
    baseYear: Number(rotationMatch[1]),
    baseMonth: Number(rotationMatch[2]),
    baseDay: Number(rotationMatch[3] || 1),
    dayOffset: Number(rotationMatch[4])
  };
}

export function extractJujutsudleWordlyRotation(bundleSource) {
  return extractBleachdleWordlyRotation(bundleSource);
}

export function extractDailyPhraseRotation(bundleSource) {
  const source = String(bundleSource || "");
  const markers = [...source.matchAll(/JSON\.parse\(\s*/g)].slice(0, 20);
  let bestPuzzles = [];

  for (const marker of markers) {
    let index = marker.index + marker[0].length;
    while (/\s/.test(source[index] || "")) index += 1;
    if (source[index] !== '"' && source[index] !== "'") continue;

    try {
      const decoded = decodeJsStringLiteral(source, index).value;
      const parsed = JSON.parse(decoded);
      if (!Array.isArray(parsed)) continue;
      const puzzles = parsed.filter(
        item => item && typeof item.solution?.text === "string" && item.solution.text.trim()
      );
      if (puzzles.length > bestPuzzles.length) bestPuzzles = puzzles;
    } catch {
      // Ignora blocchi JSON non collegati al puzzle giornaliero.
    }
  }

  if (bestPuzzles.length < 20 || bestPuzzles.length > 2_000) {
    throw new Error("Archivio frasi giornaliere non riconosciuto.");
  }

  const baseMatch = source.match(
    /new Date\(\s*["'](\d{4})-(\d{2})-(\d{2})["']\s*\)[\s\S]{0,1500}?Math\.floor\(\s*[A-Za-z_$][\w$]*\s*\/\s*864e5\s*\)\s*%\s*[A-Za-z_$][\w$]*\.length/
  );
  if (!baseMatch) {
    throw new Error("Rotazione delle frasi giornaliere non riconosciuta.");
  }

  return {
    puzzles: bestPuzzles,
    baseYear: Number(baseMatch[1]),
    baseMonth: Number(baseMatch[2]) - 1,
    baseDay: Number(baseMatch[3])
  };
}

export function extractTimestampWordRotation(bundleSource) {
  const source = String(bundleSource || "");
  const rotationMatch = source.match(
    /new Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*\)[\s\S]{0,1200}?solution\s*:\s*[A-Za-z_$][\w$]*\(\s*([A-Za-z_$][\w$]*)\s*\[\s*[A-Za-z_$][\w$]*\s*%\s*\4\.length\s*\]\s*\)/
  );
  if (!rotationMatch) {
    throw new Error("Rotazione Wordle temporale non riconosciuta.");
  }

  const variableName = rotationMatch[4];
  const escapedVariable = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = new RegExp(`\\bvar\\s+${escapedVariable}\\s*=\\s*\\[`).exec(source);
  if (!assignment) {
    throw new Error("Elenco parole Wordle non trovato.");
  }

  const arrayStart = assignment.index + assignment[0].lastIndexOf("[");
  const arraySource = extractBalancedArray(source, arrayStart);
  let words;
  try {
    words = JSON.parse(arraySource || "");
  } catch {
    throw new Error("Elenco parole Wordle non valido.");
  }

  if (
    !Array.isArray(words) ||
    words.length < 40 ||
    words.length > 5_000 ||
    words.some(word => typeof word !== "string" || !word.trim())
  ) {
    throw new Error("Elenco parole Wordle non riconosciuto.");
  }

  return {
    words: words.map(word => word.trim()),
    baseYear: Number(rotationMatch[1]),
    baseMonth: Number(rotationMatch[2]),
    baseDay: Number(rotationMatch[3])
  };
}

export function extractSeededAbility(rawText, localDateKey) {
  let abilities;
  try {
    abilities = JSON.parse(String(rawText || ""));
  } catch {
    throw new Error("Archivio abilità Genshinle non valido.");
  }

  if (!abilities || Array.isArray(abilities) || typeof abilities !== "object") {
    throw new Error("Archivio abilità Genshinle non riconosciuto.");
  }

  const excluded = new Set(["FOCALORSBurst", "FOCALORSSkill"]);
  const keys = Object.keys(abilities).filter(key => !excluded.has(key));
  if (keys.length < 40 || keys.length > 1_000) {
    throw new Error("Elenco abilità Genshinle non riconosciuto.");
  }

  const dateKey = String(localDateKey || "");
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dateKey)) {
    throw new Error("Data locale Genshinle non valida.");
  }

  const answerIndex = Math.floor(seedrandom(dateKey)() * keys.length);
  const key = keys[answerIndex];
  return {
    key,
    answer: key.replace(/([A-Z](?=[a-z\d])|\d+)/g, " $1").trim(),
    answerIndex,
    ability: abilities[key]
  };
}

export function extractConnectionsPuzzle(rawText, gameNumber) {
  let archive;
  try {
    archive = JSON.parse(String(rawText || ""));
  } catch {
    throw new Error("Archivio Pokentions non valido.");
  }

  const puzzle = archive?.[String(gameNumber)];
  if (!puzzle || !Array.isArray(puzzle.groups) || puzzle.groups.length !== 4) {
    throw new Error("Puzzle giornaliero Pokentions non disponibile.");
  }

  const groups = puzzle.groups.map(group => ({
    number: Number(group?.number),
    theme: String(group?.theme || "").trim(),
    words: Array.isArray(group?.words)
      ? group.words.map(word => String(word || "").trim()).filter(Boolean)
      : []
  }));
  if (groups.some(group => !group.theme || group.words.length !== 4)) {
    throw new Error("Gruppi Pokentions non riconosciuti.");
  }

  return {
    groups,
    answer: groups
      .map(group => `${group.theme}: ${group.words.join(", ")}`)
      .join(" | ")
  };
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

  const scriptScore = url => {
    if (/\/static\/js\/bleachlev2\.js(?:$|\?)/i.test(url)) return 3;
    if (/\/static\/js\/jujutsudlev2\.js(?:$|\?)/i.test(url)) return 3;
    if (/\/app\/jujutsukaisen\/page-[^/]+\.js(?:$|\?)/i.test(url)) return 3;
    if (/\/app\/bleach\/page-[^/]+\.js(?:$|\?)/i.test(url)) return 2;
    if (/\/static\/chunks\/.+\.js(?:$|\?)/i.test(url)) return 1;
    return 0;
  };

  return unique(urls).sort((left, right) => scriptScore(right) - scriptScore(left));
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

function getLocalCalendarParts(timezoneOffsetMinutes, now = new Date()) {
  const numericOffset = Number(timezoneOffsetMinutes);
  const safeOffset = Number.isFinite(numericOffset) ? numericOffset : 0;
  const shifted = new Date(now.getTime() - safeOffset * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate()
  };
}

function getZonedCalendarParts(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month) - 1,
    day: Number(values.day)
  };
}

function getLocalDateKey(timezoneOffsetMinutes, now = new Date()) {
  const current = getLocalCalendarParts(timezoneOffsetMinutes, now);
  return [
    String(current.year).padStart(4, "0"),
    String(current.month + 1).padStart(2, "0"),
    String(current.day).padStart(2, "0")
  ].join("-");
}

function calendarDayDistance(baseYear, baseMonth, baseDay, current) {
  const base = Date.UTC(baseYear, baseMonth, baseDay);
  const target = Date.UTC(current.year, current.month, current.day);
  return Math.floor((target - base) / 86_400_000);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function normalizeBleachdleMode(pathname) {
  const mode = normalizeMode(pathname);
  if (!mode || mode === "indexhtml" || mode === "bleachhtml" || mode === "classic") {
    return "classic";
  }
  if (
    mode === "wordly" ||
    mode === "bleachwordly" ||
    mode === "bleachwordlyhtm" ||
    mode === "bleachwordlyhtml"
  ) {
    return "wordly";
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

async function loadBleachdleWordlyRotation(site) {
  if (
    bleachdleWordlyBundleCache &&
    bleachdleWordlyBundleCache.expiresAt > Date.now() &&
    Array.isArray(bleachdleWordlyBundleCache.solutions)
  ) {
    return bleachdleWordlyBundleCache;
  }

  const origin = `https://${site.hostnames[0]}`;
  const gameUrl = new URL("/bleach-wordly.htm", origin);
  const html = await fetchText(gameUrl.href, {
    attempts: 2,
    sourceOrigin: origin
  });

  const scripts = extractScriptUrls(html, gameUrl);
  if (!scripts.length) {
    throw new Error("Bundle Bleachdle Wordly non trovato.");
  }

  const errors = [];
  for (const scriptUrl of scripts.slice(0, 16)) {
    try {
      const bundle = await fetchText(scriptUrl, {
        attempts: 2,
        sourceOrigin: origin
      });
      const rotation = extractBleachdleWordlyRotation(bundle);
      const result = {
        ...rotation,
        bundleUrl: scriptUrl,
        expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
      };
      bleachdleWordlyBundleCache = result;
      return result;
    } catch (error) {
      errors.push(`${new URL(scriptUrl).pathname}: ${error?.message || error}`);
    }
  }

  throw new Error(
    `Impossibile leggere Bleachdle Wordly. ${errors.slice(-3).join(" | ")}`
  );
}

async function solveBleachdle(site, target, timezoneOffsetMinutes) {
  const mode = normalizeBleachdleMode(target.pathname);

  if (mode === "classic") {
    const { names, bundleUrl } = await loadBleachdleCharacterNames(site);
    const dayOfYear = getLocalDayOfYear(timezoneOffsetMinutes);
    const answerIndex = dayOfYear % names.length;
    const answer = names[answerIndex];

    if (!answer) {
      throw new Error("Bleachdle Classic non ha restituito la risposta giornaliera.");
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

  if (mode === "wordly") {
    const rotation = await loadBleachdleWordlyRotation(site);
    const current = getLocalCalendarParts(timezoneOffsetMinutes);
    const elapsedDays = calendarDayDistance(
      rotation.baseYear,
      rotation.baseMonth,
      rotation.baseDay,
      current
    );
    const answerIndex = positiveModulo(
      elapsedDays + rotation.dayOffset,
      rotation.solutions.length
    );
    const answer = String(rotation.solutions[answerIndex] || "").toUpperCase();

    if (!answer) {
      throw new Error("Bleachdle Wordly non ha restituito la risposta giornaliera.");
    }

    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode: "wordly",
      modeLabel: "Wordly",
      answer,
      gameNumero: answerIndex,
      region: "local",
      source: "bleachdle-wordly-bundle",
      endpointName: "wordly",
      bundle: new URL(rotation.bundleUrl).pathname
    };
  }

  throw new Error("Modalità Bleachdle non supportata. Usa Classic oppure Wordly.");
}

function normalizeJujutsudleMode(pathname) {
  const mode = normalizeMode(pathname);
  if (
    !mode ||
    mode === "indexhtml" ||
    mode === "jujutsukaisenhtml" ||
    mode === "classic"
  ) {
    return "classic";
  }
  if (
    mode === "wordly" ||
    mode === "jujutsuwordly" ||
    mode === "jujutsuwordlyhtm" ||
    mode === "jujutsuwordlyhtml"
  ) {
    return "wordly";
  }
  return mode;
}

async function loadJujutsudleCharacterNames(site) {
  if (
    jujutsudleBundleCache &&
    jujutsudleBundleCache.expiresAt > Date.now() &&
    Array.isArray(jujutsudleBundleCache.names)
  ) {
    return jujutsudleBundleCache;
  }

  const origin = `https://${site.hostnames[0]}`;
  const gameUrl = new URL("/jujutsukaisen.html", origin);
  const html = await fetchText(gameUrl.href, {
    attempts: 2,
    sourceOrigin: origin
  });

  const scripts = extractScriptUrls(html, gameUrl);
  if (!scripts.length) {
    throw new Error("Bundle Jujutsudle non trovato.");
  }

  const errors = [];
  for (const scriptUrl of scripts.slice(0, 16)) {
    try {
      const bundle = await fetchText(scriptUrl, {
        attempts: 2,
        sourceOrigin: origin
      });
      const names = extractJujutsudleCharacterNames(bundle);
      const result = {
        names,
        bundleUrl: scriptUrl,
        expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
      };
      jujutsudleBundleCache = result;
      return result;
    } catch (error) {
      errors.push(`${new URL(scriptUrl).pathname}: ${error?.message || error}`);
    }
  }

  throw new Error(
    `Impossibile leggere l'elenco personaggi Jujutsudle. ${errors.slice(-3).join(" | ")}`
  );
}

async function loadJujutsupointPuzzle(site, timezoneOffsetMinutes) {
  const origin = `https://${site.hostnames[0]}`;
  const dataUrl = new URL("/static/js/jujutsudle.json", origin);

  if (
    !jujutsupointCache ||
    jujutsupointCache.expiresAt <= Date.now() ||
    typeof jujutsupointCache.raw !== "string"
  ) {
    const separator = dataUrl.href.includes("?") ? "&" : "?";
    const raw = await fetchText(`${dataUrl.href}${separator}_=${Date.now()}`, {
      attempts: 2,
      sourceOrigin: origin
    });
    jujutsupointCache = {
      raw,
      dataUrl: dataUrl.href,
      expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
    };
  }

  return {
    ...extractJujutsupointPuzzle(
      jujutsupointCache.raw,
      getLocalDateKey(timezoneOffsetMinutes)
    ),
    dataUrl: jujutsupointCache.dataUrl
  };
}

async function loadJujutsudleWordlyRotation(site) {
  if (
    jujutsudleWordlyBundleCache &&
    jujutsudleWordlyBundleCache.expiresAt > Date.now() &&
    Array.isArray(jujutsudleWordlyBundleCache.solutions)
  ) {
    return jujutsudleWordlyBundleCache;
  }

  const origin = `https://${site.hostnames[0]}`;
  const gameUrl = new URL("/jujutsu-wordly.htm", origin);
  const html = await fetchText(gameUrl.href, {
    attempts: 2,
    sourceOrigin: origin
  });

  const scripts = extractScriptUrls(html, gameUrl);
  if (!scripts.length) {
    throw new Error("Bundle Jujutsudle Wordly non trovato.");
  }

  const errors = [];
  for (const scriptUrl of scripts.slice(0, 16)) {
    try {
      const bundle = await fetchText(scriptUrl, {
        attempts: 2,
        sourceOrigin: origin
      });
      const rotation = extractJujutsudleWordlyRotation(bundle);
      const result = {
        ...rotation,
        bundleUrl: scriptUrl,
        expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
      };
      jujutsudleWordlyBundleCache = result;
      return result;
    } catch (error) {
      errors.push(`${new URL(scriptUrl).pathname}: ${error?.message || error}`);
    }
  }

  throw new Error(
    `Impossibile leggere Jujutsudle Wordly. ${errors.slice(-3).join(" | ")}`
  );
}

async function solveJujutsudle(site, target, timezoneOffsetMinutes) {
  const mode = normalizeJujutsudleMode(target.pathname);
  if (mode === "classic") {
    const { names, bundleUrl } = await loadJujutsudleCharacterNames(site);
    const dayOfYear = getLocalDayOfYear(timezoneOffsetMinutes);
    const answerIndex = dayOfYear % names.length;
    const answer = names[answerIndex];

    if (!answer) {
      throw new Error("Jujutsudle Classic non ha restituito la risposta giornaliera.");
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
      source: "jujutsudle-bundle",
      endpointName: "classic",
      bundle: new URL(bundleUrl).pathname
    };
  }

  if (mode === "jujutsupoint") {
    const puzzle = await loadJujutsupointPuzzle(site, timezoneOffsetMinutes);
    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode: "jujutsupoint",
      modeLabel: "Jujutsu Point",
      answer: puzzle.answer,
      gameNumero: puzzle.id,
      region: "local",
      source: "jujutsudle-point-json",
      endpointName: "jujutsupoint",
      puzzleDate: puzzle.date,
      data: new URL(puzzle.dataUrl).pathname
    };
  }

  if (mode === "wordly") {
    const rotation = await loadJujutsudleWordlyRotation(site);
    const current = getLocalCalendarParts(timezoneOffsetMinutes);
    const elapsedDays = calendarDayDistance(
      rotation.baseYear,
      rotation.baseMonth,
      rotation.baseDay,
      current
    );
    const answerIndex = positiveModulo(
      elapsedDays + rotation.dayOffset,
      rotation.solutions.length
    );
    const answer = String(rotation.solutions[answerIndex] || "").toUpperCase();

    if (!answer) {
      throw new Error("Jujutsudle Wordly non ha restituito la risposta giornaliera.");
    }

    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode: "wordly",
      modeLabel: "Wordly",
      answer,
      gameNumero: answerIndex,
      region: "local",
      source: "jujutsudle-wordly-bundle",
      endpointName: "wordly",
      bundle: new URL(rotation.bundleUrl).pathname
    };
  }

  throw new Error(
    "Modalità Jujutsudle non supportata. Usa Classic, Jujutsu Point oppure Wordly."
  );
}

function resolvePublisherMode(site, pathname) {
  const normalized = normalizeFullPath(pathname);
  for (const [mode, config] of Object.entries(site.modes)) {
    if (Array.isArray(config.aliases) && config.aliases.includes(normalized)) {
      return { mode, config };
    }
  }
  return null;
}

function prioritizeConfiguredScripts(scripts, scriptHint) {
  if (!scriptHint) return scripts;
  return [...scripts].sort((left, right) => {
    const leftScore = left.includes(scriptHint) ? 1 : 0;
    const rightScore = right.includes(scriptHint) ? 1 : 0;
    return rightScore - leftScore;
  });
}

function getPublisherFallback(site, mode, kind) {
  const fallback = PUBLISHER_FALLBACKS?.[site.id]?.[mode];
  if (!fallback || fallback.kind !== kind || !fallback.value) return null;

  const fallbackUrl = `https://fallback.local/${site.id}/${mode}`;
  return kind === "bundle"
    ? { ...fallback.value, bundleUrl: `${fallbackUrl}.js` }
    : { ...fallback.value, dataUrl: `${fallbackUrl}.json` };
}

async function loadPublisherBundle(site, mode, config, parser) {
  const cacheKey = `${site.id}:${mode}:bundle`;
  const cached = publisherDailyCache.get(cacheKey);
  if (cached?.expiresAt > Date.now() && cached.value) return cached.value;

  const origin = `https://${site.hostnames[0]}`;
  const gameUrl = new URL(config.pagePath, origin);
  const errors = [];
  let scripts = [];
  try {
    const html = await fetchText(gameUrl.href, {
      attempts: 2,
      sourceOrigin: origin
    });
    scripts = prioritizeConfiguredScripts(
      extractScriptUrls(html, gameUrl),
      config.scriptHint
    );
    if (!scripts.length) {
      errors.push(`Bundle ${site.name} ${config.label} non trovato.`);
    }
  } catch (error) {
    errors.push(`${gameUrl.pathname}: ${error?.message || error}`);
  }

  for (const scriptUrl of scripts.slice(0, 20)) {
    try {
      const bundle = await fetchText(scriptUrl, {
        attempts: 2,
        sourceOrigin: origin
      });
      const parsed = parser(bundle);
      const value = { ...parsed, bundleUrl: scriptUrl };
      publisherDailyCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
      });
      return value;
    } catch (error) {
      errors.push(`${new URL(scriptUrl).pathname}: ${error?.message || error}`);
    }
  }

  const fallback = getPublisherFallback(site, mode, "bundle");
  if (fallback) {
    publisherDailyCache.set(cacheKey, {
      value: fallback,
      expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
    });
    return fallback;
  }

  throw new Error(
    `Impossibile leggere ${site.name} ${config.label}. ${errors.slice(-3).join(" | ")}`
  );
}

async function loadPublisherText(site, mode, config, maxResponseBytes = MAX_RESPONSE_BYTES) {
  const cacheKey = `${site.id}:${mode}:data`;
  const cached = publisherDailyCache.get(cacheKey);
  if (cached?.expiresAt > Date.now() && typeof cached.value?.raw === "string") {
    return cached.value;
  }

  const origin = `https://${site.hostnames[0]}`;
  const dataUrl = new URL(config.dataPath, origin);
  const separator = dataUrl.href.includes("?") ? "&" : "?";
  let value;
  try {
    const raw = await fetchText(`${dataUrl.href}${separator}_=${Date.now()}`, {
      attempts: 2,
      sourceOrigin: origin,
      maxResponseBytes
    });
    value = { raw, dataUrl: dataUrl.href };
  } catch (error) {
    value = getPublisherFallback(site, mode, "data");
    if (!value) throw error;
  }
  publisherDailyCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + BLEACHDLE_BUNDLE_CACHE_TTL_MS
  });
  return value;
}

function getLocalSeedDate(timezoneOffsetMinutes) {
  const current = getLocalCalendarParts(timezoneOffsetMinutes);
  return [
    String(current.day).padStart(2, "0"),
    String(current.month + 1).padStart(2, "0"),
    String(current.year).padStart(4, "0")
  ].join("-");
}

async function solvePublisherDaily(site, target, timezoneOffsetMinutes) {
  const resolved = resolvePublisherMode(site, target.pathname);
  if (!resolved) {
    throw new Error(
      `Modalità ${site.name} non supportata. Usa uno dei collegamenti giornalieri elencati.`
    );
  }

  const { mode, config } = resolved;
  let answer = "";
  let gameNumero = null;
  let source = "";
  let bundle = null;
  let data = null;
  let puzzleDate = null;

  if (config.kind === "classic-bundle") {
    const parsed = await loadPublisherBundle(site, mode, config, bundleSource => ({
      names: extractPublisherCharacterNames(bundleSource, site.name)
    }));
    gameNumero = getLocalDayOfYear(timezoneOffsetMinutes) % parsed.names.length;
    answer = parsed.names[gameNumero] || "";
    source = "publisher-classic-bundle";
    bundle = new URL(parsed.bundleUrl).pathname;
  } else if (config.kind === "wordly-bundle") {
    const rotation = await loadPublisherBundle(
      site,
      mode,
      config,
      extractBleachdleWordlyRotation
    );
    const current = getLocalCalendarParts(timezoneOffsetMinutes);
    const elapsedDays = calendarDayDistance(
      rotation.baseYear,
      rotation.baseMonth,
      rotation.baseDay,
      current
    );
    gameNumero = positiveModulo(
      elapsedDays + rotation.dayOffset,
      rotation.solutions.length
    );
    answer = String(rotation.solutions[gameNumero] || "").toUpperCase();
    source = "publisher-wordly-bundle";
    bundle = new URL(rotation.bundleUrl).pathname;
  } else if (config.kind === "dated-category") {
    const archive = await loadPublisherText(site, mode, config);
    const puzzle = extractJujutsupointPuzzle(
      archive.raw,
      getLocalDateKey(timezoneOffsetMinutes)
    );
    answer = puzzle.answer;
    gameNumero = puzzle.id;
    puzzleDate = puzzle.date;
    source = "publisher-dated-json";
    data = new URL(archive.dataUrl).pathname;
  } else if (config.kind === "phrase-bundle") {
    const rotation = await loadPublisherBundle(
      site,
      mode,
      config,
      extractDailyPhraseRotation
    );
    const elapsedDays = Math.floor(
      (Date.now() - Date.UTC(rotation.baseYear, rotation.baseMonth, rotation.baseDay)) /
        86_400_000
    );
    const answerIndex = positiveModulo(elapsedDays, rotation.puzzles.length);
    const puzzle = rotation.puzzles[answerIndex];
    answer = String(puzzle?.solution?.text || "").trim();
    gameNumero = puzzle?.id ?? answerIndex;
    puzzleDate = typeof puzzle?.printDate === "string" ? puzzle.printDate : null;
    source = "publisher-phrase-bundle";
    bundle = new URL(rotation.bundleUrl).pathname;
  } else if (config.kind === "timestamp-word") {
    const rotation = await loadPublisherBundle(
      site,
      mode,
      config,
      extractTimestampWordRotation
    );
    const current = getLocalCalendarParts(timezoneOffsetMinutes);
    const elapsedDays = calendarDayDistance(
      rotation.baseYear,
      rotation.baseMonth,
      rotation.baseDay,
      current
    );
    gameNumero = positiveModulo(elapsedDays, rotation.words.length);
    answer = String(rotation.words[gameNumero] || "").toUpperCase();
    source = "publisher-timestamp-word-bundle";
    bundle = new URL(rotation.bundleUrl).pathname;
  } else if (config.kind === "seeded-ability") {
    const archive = await loadPublisherText(site, mode, config);
    const ability = extractSeededAbility(
      archive.raw,
      getLocalSeedDate(timezoneOffsetMinutes)
    );
    answer = ability.answer;
    gameNumero = ability.answerIndex;
    source = "genshinle-seeded-json";
    data = new URL(archive.dataUrl).pathname;
  } else if (config.kind === "connections") {
    const archive = await loadPublisherText(site, mode, config, 8_000_000);
    const current = getLocalCalendarParts(timezoneOffsetMinutes);
    gameNumero = calendarDayDistance(2023, 9, 1, current);
    const puzzle = extractConnectionsPuzzle(archive.raw, gameNumero);
    answer = puzzle.answer;
    source = "pokentions-connections-json";
    data = new URL(archive.dataUrl).pathname;
  }

  if (!answer) {
    throw new Error(`${site.name} ${config.label} non ha restituito la risposta giornaliera.`);
  }

  return {
    success: true,
    site: site.name,
    hostname: target.hostname,
    mode,
    modeLabel: config.label,
    answer,
    gameNumero,
    region: "local",
    source,
    endpointName: mode,
    ...(bundle ? { bundle } : {}),
    ...(data ? { data } : {}),
    ...(puzzleDate ? { puzzleDate } : {})
  };
}

async function solveRiddleHub(site, target, timezoneOffsetMinutes) {
  const path = normalizeFullPath(target.pathname);
  const origin = "https://www.riddles.com";

  if (path === "gamesrirdlehtml" || path === "rirdle") {
    const gameUrl = new URL("/games/rirdle.html", origin);
    const html = await fetchText(gameUrl.href, { attempts: 2, sourceOrigin: origin });
    const rotation = extractRirdleRotation(html);
    const current = getLocalCalendarParts(timezoneOffsetMinutes);
    const elapsedDays = calendarDayDistance(
      rotation.baseYear,
      rotation.baseMonth,
      rotation.baseDay,
      current
    );
    const answerIndex = positiveModulo(elapsedDays, rotation.puzzles.length);
    const puzzle = rotation.puzzles[answerIndex];
    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode: "rirdle",
      modeLabel: site.modes.rirdle.label,
      answer: puzzle.answer,
      question: puzzle.question,
      gameNumero: elapsedDays + 1,
      region: "local",
      source: "riddles-rirdle-inline",
      endpointName: "rirdle"
    };
  }

  if (!path || path === "indexphp" || path === "riddleoftheday") {
    const dailyUrl = new URL("/riddle-of-the-day", origin);
    const html = await fetchText(dailyUrl.href, { attempts: 2, sourceOrigin: origin });
    const puzzle = extractRiddlesComAnswer(html);
    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode: "daily",
      modeLabel: site.modes.daily.label,
      answer: puzzle.answer,
      gameNumero: puzzle.id,
      puzzleDate: puzzle.date,
      region: "global",
      source: "riddles-daily-html",
      endpointName: "daily"
    };
  }

  const libraryMatch = /^(?:riddle)?(\d+)$/.exec(path);
  if (libraryMatch) {
    const pageUrl = new URL(`/${libraryMatch[1]}`, origin);
    const html = await fetchText(pageUrl.href, { attempts: 2, sourceOrigin: origin });
    const puzzle = extractRiddlesComAnswer(html);
    return {
      success: true,
      site: site.name,
      hostname: target.hostname,
      mode: "library",
      modeLabel: `Riddle #${libraryMatch[1]}`,
      answer: puzzle.answer,
      gameNumero: Number(libraryMatch[1]),
      region: "global",
      source: "riddles-page-html",
      endpointName: "library"
    };
  }

  throw new Error("Pagina Riddles.com non supportata. Usa il riddle giornaliero, RiRdle o una pagina numerica.");
}

async function solveRiddleDay(site, target) {
  const audience = target.searchParams.get("mode") || target.searchParams.get("audience") || "adults";
  const level = target.searchParams.get("level") || target.searchParams.get("difficulty") || "easy";
  const mode = `${audience}${level}`.toLowerCase();
  const config = site.modes[mode];
  if (!config) throw new Error("Modalità RiddleDay non supportata.");

  const origin = `https://${site.hostnames[0]}`;
  const html = await fetchText(`${origin}/`, { attempts: 2, sourceOrigin: origin });
  const rotation = extractRiddleDayRotation(html, config.audience, config.level);
  const current = getZonedCalendarParts("Australia/Sydney");
  const elapsedDays = calendarDayDistance(
    rotation.baseYear,
    rotation.baseMonth,
    rotation.baseDay,
    current
  );
  const answerIndex = positiveModulo(elapsedDays, rotation.puzzles.length);
  const puzzle = rotation.puzzles[answerIndex];
  return {
    success: true,
    site: site.name,
    hostname: target.hostname,
    mode,
    modeLabel: config.label,
    answer: puzzle.answer,
    question: puzzle.question,
    gameNumero: elapsedDays + 1,
    region: "australia-sydney",
    source: "riddleday-inline-rotation",
    endpointName: mode
  };
}

async function solveNextRiddle(site, target) {
  const config = site.modes.daily;
  const origin = `https://${site.hostnames[0]}`;
  const pageUrl = new URL(config.pagePath, origin);
  const html = await fetchText(pageUrl.href, { attempts: 2, sourceOrigin: origin });
  const puzzle = extractNextRiddle(html);
  return {
    success: true,
    site: site.name,
    hostname: target.hostname,
    mode: "daily",
    modeLabel: config.label,
    answer: puzzle.answer,
    question: puzzle.question,
    gameNumero: null,
    region: "global",
    source: "riddletime-next-data",
    endpointName: "daily"
  };
}

async function solveJsonLdRiddle(site, target) {
  const config = site.modes.daily;
  const origin = "https://triviacafe.com";
  const pageUrl = new URL(config.pagePath, origin);
  const html = await fetchText(pageUrl.href, { attempts: 2, sourceOrigin: origin });
  const puzzle = extractJsonLdRiddle(html);
  return {
    success: true,
    site: site.name,
    hostname: target.hostname,
    mode: "daily",
    modeLabel: config.label,
    answer: puzzle.answer,
    question: puzzle.question,
    gameNumero: null,
    region: "global",
    source: "riddlecafe-jsonld",
    endpointName: "daily"
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
    if (site.strategy === "bleachdle-bundle") {
      return solveBleachdle(site, target, timezoneOffsetMinutes);
    }
    if (site.strategy === "jujutsudle-bundle") {
      return solveJujutsudle(site, target, timezoneOffsetMinutes);
    }
    if (site.strategy === "publisher-daily") {
      return solvePublisherDaily(site, target, timezoneOffsetMinutes);
    }
    if (site.strategy === "riddle-hub") {
      return solveRiddleHub(site, target, timezoneOffsetMinutes);
    }
    if (site.strategy === "riddleday-rotation") {
      return solveRiddleDay(site, target);
    }
    if (site.strategy === "next-riddle") {
      return solveNextRiddle(site, target);
    }
    if (site.strategy === "jsonld-riddle") {
      return solveJsonLdRiddle(site, target);
    }
    return solveNetworkSite(site, target, timezoneOffsetMinutes);
  }

  return {
    success: false,
    fallback: true,
    reason: "Nessun adattatore diretto disponibile per questo dominio."
  };
}
