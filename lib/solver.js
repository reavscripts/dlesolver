import crypto from "node:crypto";

const ALLOWED_HOSTS = new Set([
  "loldle.net",
  "www.loldle.net",
  "pokedle.net",
  "www.pokedle.net",
  "narutodle.net",
  "www.narutodle.net"
]);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "Chrome/130.0.0.0 Safari/537.36 DleSolver/1.0";

const ANSWER_KEYS = [
  "champion_name",
  "championName",
  "pokemon_name",
  "pokemonName",
  "character_name",
  "characterName",
  "answer",
  "solution",
  "todayAnswer",
  "dailyAnswer",
  "correctAnswer",
  "name"
];

const FETCH_TIMEOUT_MS = 8_000;
const MAX_TEXT_BYTES = 6_000_000;
const MAX_SCRIPTS = 8;
const MAX_ENDPOINTS = 24;

function response(success, data = {}) {
  return { success, ...data };
}

function normalizeInput(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Inserisci un link valido.");
  }

  const raw = input.trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Sono consentiti soltanto link HTTP o HTTPS.");
  }

  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      "Sito non supportato. Usa LoLdle, Pokédle oppure Narutodle."
    );
  }

  url.hash = "";
  return url;
}

async function fetchText(url, { timeout = FETCH_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/json,text/plain,*/*",
        "accept-language": "en-US,en;q=0.9,it;q=0.8",
        referer: new URL(url).origin + "/"
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const declaredLength = Number(res.headers.get("content-length") || 0);
    if (declaredLength > MAX_TEXT_BYTES) {
      throw new Error("Risorsa troppo grande");
    }

    const text = await res.text();
    if (Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
      throw new Error("Risorsa troppo grande");
    }

    return {
      text,
      contentType: res.headers.get("content-type") || "",
      finalUrl: res.url
    };
  } finally {
    clearTimeout(timer);
  }
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function detectSite(hostname) {
  if (hostname.includes("loldle")) return "LoLdle";
  if (hostname.includes("pokedle")) return "Pokédle";
  if (hostname.includes("narutodle")) return "Narutodle";
  return hostname;
}

function detectMode(url) {
  const text = `${url.pathname} ${url.search}`.toLowerCase();
  const modes = [
    ["classic", "Classica"],
    ["quote", "Citazione"],
    ["citation", "Citazione"],
    ["emoji", "Emoji"],
    ["ability", "Abilità"],
    ["spell", "Abilità"],
    ["splash", "Splash"],
    ["silhouette", "Silhouette"],
    ["card", "Carta"],
    ["jutsu", "Jutsu"],
    ["blur", "Immagine sfocata"]
  ];

  for (const [needle, label] of modes) {
    if (text.includes(needle)) return label;
  }

  return "Modalità rilevata dal sito";
}

function extractScriptUrls(html, baseUrl) {
  const scripts = [];
  const regex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = regex.exec(html))) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.origin === baseUrl.origin && /\.js(?:$|\?)/i.test(url.href)) {
        scripts.push(url.href);
      }
    } catch {
      // URL non valida
    }
  }

  return unique(scripts)
    .sort((a, b) => Number(/index\./i.test(b)) - Number(/index\./i.test(a)))
    .slice(0, MAX_SCRIPTS);
}

function cleanCandidate(value) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/^['"]|['"]$/g, "");

  if (!text || text.length > 120) return null;
  if (/^(true|false|null|undefined|unknown)$/i.test(text)) return null;
  if (/^https?:\/\//i.test(text)) return null;
  if (/^[A-Za-z0-9+/]{32,}={0,2}$/.test(text)) return null;
  if (/^[\[\]{}():,.;/\\_-]+$/.test(text)) return null;

  return text;
}

function findAnswerInObject(value, depth = 0, parentKey = "") {
  if (depth > 8 || value == null) return null;

  if (typeof value === "string") {
    if (/answer|solution|champion|pokemon|character|name/i.test(parentKey)) {
      return cleanCandidate(value);
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAnswerInObject(item, depth + 1, parentKey);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== "object") return null;

  for (const key of ANSWER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const candidate = value[key];
      if (typeof candidate === "string") {
        const cleaned = cleanCandidate(candidate);
        if (cleaned) return cleaned;
      }
      const nested = findAnswerInObject(candidate, depth + 1, key);
      if (nested) return nested;
    }
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const found = findAnswerInObject(nestedValue, depth + 1, key);
    if (found) return found;
  }

  return null;
}

function tryParseJson(text) {
  const trimmed = text.trim();
  const candidates = [trimmed];

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    candidates.push(trimmed.slice(1, -1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // continua
    }
  }

  return null;
}

function extractDirectAnswer(text) {
  const parsed = tryParseJson(text);
  if (parsed !== null) {
    const found = findAnswerInObject(parsed);
    if (found) return found;
  }

  const patterns = [
    /["']champion_name["']\s*:\s*["']([^"']{1,80})["']/i,
    /["']pokemon_name["']\s*:\s*["']([^"']{1,80})["']/i,
    /["']character_name["']\s*:\s*["']([^"']{1,80})["']/i,
    /["'](?:todayAnswerDecrypted|correctAnswer|dailyAnswer|solution)["']?\s*[:=]\s*["']([^"']{1,80})["']/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const cleaned = cleanCandidate(match?.[1]);
    if (cleaned) return cleaned;
  }

  return null;
}

function evpBytesToKey(password, salt, keyLength, ivLength) {
  const passwordBuffer = Buffer.from(password, "utf8");
  let material = Buffer.alloc(0);
  let previous = Buffer.alloc(0);

  while (material.length < keyLength + ivLength) {
    const hash = crypto.createHash("md5");
    hash.update(previous);
    hash.update(passwordBuffer);
    if (salt) hash.update(salt);
    previous = hash.digest();
    material = Buffer.concat([material, previous]);
  }

  return {
    key: material.subarray(0, keyLength),
    iv: material.subarray(keyLength, keyLength + ivLength)
  };
}

function decryptOpenSsl(cipherText, password) {
  const raw = Buffer.from(cipherText.trim(), "base64");
  if (raw.length < 16 || raw.subarray(0, 8).toString("ascii") !== "Salted__") {
    return null;
  }

  const salt = raw.subarray(8, 16);
  const encrypted = raw.subarray(16);

  for (const keyLength of [32, 24, 16]) {
    try {
      const { key, iv } = evpBytesToKey(password, salt, keyLength, 16);
      const algorithm = `aes-${keyLength * 8}-cbc`;
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAutoPadding(true);
      const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      const text = plain.toString("utf8").trim();
      if (text && !text.includes("�")) return text;
    } catch {
      // prova la lunghezza successiva
    }
  }

  return null;
}

function extractSecrets(source) {
  const secrets = [];
  const patterns = [
    /AES\.decrypt\([^,]+,\s*["']([^"']{3,120})["']/g,
    /\.decrypt\([^,]+,\s*["']([^"']{3,120})["']/g,
    /decrypt\s*:\s*function\([^)]*\)\s*\{[^{}]{0,500}?["']([^"']{5,120})["']/g,
    /decrypt\s*=\s*[^;]{0,500}?["']([^"']{5,120})["']/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) {
      const secret = match[1];
      if (
        secret &&
        !/^(utf8|base64|hex|aes|cbc|pkcs|decrypt|encrypt)$/i.test(secret) &&
        !/^https?:/i.test(secret)
      ) {
        secrets.push(secret);
      }
    }
  }

  return unique(secrets).slice(0, 30);
}

function extractEncryptedStrings(text) {
  const matches = text.match(/U2FsdGVkX1[A-Za-z0-9+/=]{16,}/g) || [];
  return unique(matches).slice(0, 40);
}

function extractEndpointUrls(source, baseUrl) {
  const candidates = [];
  const stringRegex = /["'`]((?:https?:\/\/|\/)[^"'`\s]{2,300})["'`]/g;
  let match;

  while ((match = stringRegex.exec(source))) {
    const raw = match[1].replace(/\\\//g, "/");
    if (!/(today|daily|answer|solution|champion|pokemon|character|name|classic|quote|emoji|ability|splash|silhouette|card|jutsu)/i.test(raw)) {
      continue;
    }

    try {
      const url = new URL(raw, baseUrl);
      if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) continue;
      if (/\.(?:png|jpe?g|webp|gif|svg|css|woff2?|ttf|mp3|mp4)(?:$|\?)/i.test(url.pathname)) {
        continue;
      }
      candidates.push(url.href);
    } catch {
      // ignora
    }
  }

  return unique(candidates)
    .sort((a, b) => endpointScore(b) - endpointScore(a))
    .slice(0, MAX_ENDPOINTS);
}

function endpointScore(url) {
  let score = 0;
  if (/today.*answer|answer.*today/i.test(url)) score += 100;
  if (/answer|solution/i.test(url)) score += 60;
  if (/champion|pokemon|character/i.test(url)) score += 30;
  if (/classic/i.test(url)) score += 10;
  if (/\.json(?:$|\?)/i.test(url)) score += 10;
  return score;
}

function decryptCandidates(cipherTexts, secrets) {
  for (const cipherText of cipherTexts) {
    for (const secret of secrets) {
      const plain = decryptOpenSsl(cipherText, secret);
      if (!plain) continue;

      const direct = extractDirectAnswer(plain);
      if (direct) {
        return { answer: direct, secret, plaintext: plain };
      }

      const cleaned = cleanCandidate(plain);
      if (cleaned) {
        return { answer: cleaned, secret, plaintext: plain };
      }
    }
  }

  return null;
}

export async function solveUrl(input, { debug = false } = {}) {
  let requestedUrl;

  try {
    requestedUrl = normalizeInput(input);
  } catch (error) {
    return response(false, { error: error.message });
  }

  const diagnostics = {
    scripts: [],
    endpoints: [],
    secretsFound: 0,
    encryptedValuesFound: 0,
    warnings: []
  };

  try {
    const page = await fetchText(requestedUrl.href);
    const finalUrl = new URL(page.finalUrl);
    const site = detectSite(finalUrl.hostname);
    const mode = detectMode(finalUrl);

    const directFromHtml = extractDirectAnswer(page.text);
    if (directFromHtml) {
      return response(true, {
        site,
        mode,
        answer: directFromHtml,
        method: "html",
        url: finalUrl.href,
        ...(debug ? { diagnostics } : {})
      });
    }

    const scriptUrls = extractScriptUrls(page.text, finalUrl);
    diagnostics.scripts = scriptUrls;

    const sources = [page.text];
    for (const scriptUrl of scriptUrls) {
      try {
        const script = await fetchText(scriptUrl);
        sources.push(script.text);
      } catch (error) {
        diagnostics.warnings.push(`Bundle non letto: ${scriptUrl} (${error.message})`);
      }
    }

    const joinedSource = sources.join("\n");
    const secrets = extractSecrets(joinedSource);
    const encryptedValues = extractEncryptedStrings(joinedSource);
    const endpoints = extractEndpointUrls(joinedSource, finalUrl);

    diagnostics.secretsFound = secrets.length;
    diagnostics.encryptedValuesFound = encryptedValues.length;
    diagnostics.endpoints = endpoints;

    const decryptedInline = decryptCandidates(encryptedValues, secrets);
    if (decryptedInline) {
      return response(true, {
        site,
        mode,
        answer: decryptedInline.answer,
        method: "bundle-decrypt",
        url: finalUrl.href,
        ...(debug ? { diagnostics } : {})
      });
    }

    for (const endpoint of endpoints) {
      try {
        const api = await fetchText(endpoint, { timeout: 6_000 });
        const direct = extractDirectAnswer(api.text);
        if (direct) {
          return response(true, {
            site,
            mode,
            answer: direct,
            method: "api",
            source: endpoint,
            url: finalUrl.href,
            ...(debug ? { diagnostics } : {})
          });
        }

        const apiEncrypted = extractEncryptedStrings(api.text);
        const decrypted = decryptCandidates(apiEncrypted, secrets);
        if (decrypted) {
          return response(true, {
            site,
            mode,
            answer: decrypted.answer,
            method: "api-decrypt",
            source: endpoint,
            url: finalUrl.href,
            ...(debug ? { diagnostics } : {})
          });
        }
      } catch (error) {
        diagnostics.warnings.push(`Endpoint non letto: ${endpoint} (${error.message})`);
      }
    }

    return response(false, {
      site,
      mode,
      url: finalUrl.href,
      error:
        "La risposta non è stata individuata automaticamente. Il sito potrebbe aver cambiato endpoint o cifratura.",
      suggestion:
        "Attiva la modalità diagnostica e usa i dati restituiti per aggiornare l'adattatore.",
      ...(debug ? { diagnostics } : {})
    });
  } catch (error) {
    return response(false, {
      error: `Impossibile analizzare il link: ${error.message}`,
      ...(debug ? { diagnostics } : {})
    });
  }
}
