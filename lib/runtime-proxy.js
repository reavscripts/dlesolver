import { lookup } from "node:dns/promises";
import net from "node:net";
import { randomUUID } from "node:crypto";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "Chrome/130.0.0.0 Safari/537.36";

const MAX_HTML_BYTES = 3_000_000;
const MAX_PROXY_BYTES = 14_000_000;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;
const DNS_CACHE_TTL_MS = 5 * 60_000;
const dnsCache = new Map();

// Copre LoLdle, Pokédle, Narutodle, Dotadle e gli altri siti della rete
// che terminano con "dle.net". Gli host esterni possono essere aggiunti
// tramite EXTRA_DLE_HOSTS, separati da virgola.
const DLE_HOST_PATTERN = /^(?:[a-z0-9-]+\.)*[a-z0-9-]*dle\.net$/i;
// I siti DLE usano API esterne su sottodomini apimeko.link.
// Esempio verificato: narutodle.apimeko.link.
const DLE_API_HOST_PATTERN = /^(?:[a-z0-9-]+\.)+apimeko\.link$/i;

function normalizeHostname(value) {
  return String(value || "").trim().toLowerCase().replace(/\.$/, "");
}

function getExtraHosts() {
  return new Set(
    String(process.env.EXTRA_DLE_HOSTS || "")
      .split(",")
      .map(normalizeHostname)
      .filter(Boolean)
  );
}

function isPrivateIp(address) {
  if (!address) return true;

  if (net.isIPv4(address)) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  return true;
}

export function isAllowedTargetHost(hostname) {
  const host = normalizeHostname(hostname);
  if (!host || host === "localhost" || net.isIP(host)) return false;
  if (DLE_HOST_PATTERN.test(host)) return true;
  return getExtraHosts().has(host);
}

export function isAllowedResourceHost(hostname) {
  const host = normalizeHostname(hostname);
  if (!host || host === "localhost" || net.isIP(host)) return false;
  if (DLE_HOST_PATTERN.test(host) || DLE_API_HOST_PATTERN.test(host)) return true;
  return getExtraHosts().has(host);
}

export function parseTargetUrl(input, { resource = false } = {}) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Inserisci un link valido.");
  }

  const raw = input.trim();
  const target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

  if (!["https:", "http:"].includes(target.protocol)) {
    throw new Error("Sono consentiti soltanto link HTTP o HTTPS.");
  }

  if (target.username || target.password) {
    throw new Error("Il link non può contenere credenziali.");
  }

  if (target.port && !["80", "443"].includes(target.port)) {
    throw new Error("La porta indicata non è consentita.");
  }

  const allowed = resource
    ? isAllowedResourceHost(target.hostname)
    : isAllowedTargetHost(target.hostname);

  if (!allowed) {
    throw new Error(
      resource
        ? "Risorsa remota non autorizzata dal proxy."
        : "Dominio non supportato. Sono accettati i riddle della rete *dle.net."
    );
  }

  target.hash = "";
  return target;
}

async function assertPublicHost(url, { resource = false } = {}) {
  const target = parseTargetUrl(url.href, { resource });
  const cacheKey = target.hostname.toLowerCase();
  const cached = dnsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.safe) {
      throw new Error("L'host remoto non è raggiungibile in modo sicuro.");
    }
    return target;
  }

  const records = await lookup(target.hostname, { all: true, verbatim: true });
  const safe = records.length > 0 && records.every(record => !isPrivateIp(record.address));
  dnsCache.set(cacheKey, { safe, expiresAt: Date.now() + DNS_CACHE_TTL_MS });

  if (!safe) {
    throw new Error("L'host remoto non è raggiungibile in modo sicuro.");
  }

  return target;
}

async function fetchWithLimit(initialUrl, options, maxBytes, { resource = false } = {}) {
  let currentUrl = await assertPublicHost(
    initialUrl instanceof URL ? initialUrl : new URL(initialUrl),
    { resource }
  );

  const retryableStatuses = new Set([429, 502, 503, 504]);
  const method = String(options?.method || "GET").toUpperCase();
  const maxAttempts = ["GET", "HEAD"].includes(method) ? 3 : 1;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    let response = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        response = await fetch(currentUrl.href, {
          redirect: "manual",
          ...options,
          signal: controller.signal,
          headers: {
            "user-agent": USER_AGENT,
            "accept-language": "en-US,en;q=0.9,it;q=0.8",
            ...(options?.headers || {})
          }
        });
      } finally {
        clearTimeout(timer);
      }

      if (!retryableStatuses.has(response.status) || attempt === maxAttempts) {
        break;
      }

      try { await response.body?.cancel(); } catch {}
      const retryAfter = Number(response.headers.get("retry-after") || 0);
      const delay = retryAfter > 0
        ? Math.min(retryAfter * 1000, 2000)
        : 200 * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!response) {
      throw new Error("Il sito remoto non ha restituito una risposta.");
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect remoto senza destinazione.");
      if (redirectCount === MAX_REDIRECTS) {
        throw new Error("Troppi redirect dal sito remoto.");
      }

      currentUrl = await assertPublicHost(new URL(location, currentUrl), { resource });

      if (response.status === 303 && options?.method !== "HEAD") {
        options = { ...options, method: "GET", body: undefined };
      }

      continue;
    }

    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > maxBytes) {
      throw new Error("Risorsa remota troppo grande.");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxBytes) {
      throw new Error("Risorsa remota troppo grande.");
    }

    return { response, bytes, finalUrl: currentUrl };
  }

  throw new Error("Impossibile completare la richiesta remota.");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function stripNonEssentialScripts(html) {
  let output = String(html);

  output = output.replace(
    /<meta\b[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/gi,
    ""
  );

  output = output.replace(
    /<script\b([^>]*\bsrc=["'][^"']*(?:googletagmanager|google-analytics|doubleclick|vntsm|venatus|ad-manager|adsbygoogle)[^"']*["'][^>]*)>\s*<\/script>/gi,
    ""
  );

  output = output.replace(
    /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi,
    script =>
      /(?:gtag\s*\(|googletagmanager|useVenatus|vntsm|ad-manager|adsbygoogle)/i.test(script)
        ? ""
        : script
  );

  // Evita che il documento remoto imponga un altro base URL prima del nostro.
  output = output.replace(/<base\b[^>]*>/gi, "");

  // I preload/prefetch dei chunk vengono ricreati da webpack quando servono.
  // Rimuoverli evita richieste duplicate e avvisi fuorvianti in console.
  output = output.replace(
    /<link\b(?=[^>]*\brel=["']?(?:preload|prefetch)["']?)[^>]*>/gi,
    ""
  );

  return output;
}

function buildBootstrapScript(targetUrl) {
  const serializedTarget = JSON.stringify(targetUrl.href);
  const serializedStoragePrefix = JSON.stringify(
    `__dle_solver_${targetUrl.hostname}_${randomUUID()}__`
  );

  return String.raw`
(() => {
  "use strict";

  const TARGET_URL = ${serializedTarget};
  const TARGET = new URL(TARGET_URL);
  const TARGET_ORIGIN = TARGET.origin;
  const PAGE_ORIGIN = location.origin;
  const PROXY_PATH = "/api/proxy?url=";
  const LOCAL_PROXY_PREFIX = PAGE_ORIGIN + PROXY_PATH;
  const PROXY_SOURCE_SUFFIX = "&source=" + encodeURIComponent(TARGET_ORIGIN);
  const NETWORK_RE = /^(?:[a-z0-9-]+\.)*[a-z0-9-]*dle\.net$/i;
  const API_NETWORK_RE = /^(?:[a-z0-9-]+\.)+apimeko\.link$/i;
  const EXTRA_HOSTS = ${JSON.stringify([...getExtraHosts()])};
  const extraHosts = new Set(EXTRA_HOSTS);
  const STORAGE_PREFIX = ${serializedStoragePrefix};
  const STORAGE_HOST_PREFIX = "__dle_solver_" + TARGET.hostname + "_";

  const runtime = {
    scans: 0,
    lastSignature: "",
    lastCandidates: [],
    lastError: "",
    startedAt: Date.now(),
    interceptedAnswers: [],
    answerRequests: [],
    storageModes: [],
    requestedMode: "",
    lastAnswerMode: "",
    lastAnswerRequestAt: 0,
    activeRoute: "",
    routeAttempts: 0,
    routeForced: false
  };


  function normalizeMode(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/^\/+|\/+$/g, "")
      .split("/")[0]
      .replace(/[^a-z0-9]/g, "");
  }

  const REQUESTED_MODE = normalizeMode(TARGET.pathname) || "classic";
  runtime.requestedMode = REQUESTED_MODE;

  function modeFromText(...values) {
    const text = values
      .flat(Infinity)
      .filter(value => value !== null && value !== undefined)
      .map(value => {
        try { return typeof value === "function" ? Function.prototype.toString.call(value) : String(value); }
        catch (_) { return ""; }
      })
      .join(" ")
      .toLowerCase();

    const patterns = [
      /\/games\/([a-z0-9_-]+)\/answer(?:\/name)?/i,
      /\b([a-z0-9_-]+)_today_answer\b/i,
      /\b(?:game|mode|riddle)[_:-]?([a-z0-9_-]+)\b/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return normalizeMode(match[1]);
    }

    const known = [
      "classic", "quote", "ability", "emoji", "splash", "card", "flavor",
      "silhouette", "jutsu", "eye", "devilfruit", "wanted", "laugh",
      "loadingscreen", "finalsmash", "kirby"
    ];

    for (const mode of known) {
      if (new RegExp("(?:^|[^a-z0-9])" + mode + "(?:[^a-z0-9]|$)", "i").test(text)) {
        return mode;
      }
    }

    return "";
  }

  function componentMode(component, inheritedMode = "") {
    let current = component;
    let depth = 0;

    while (current && depth < 10) {
      const options = current?.options || current?.$props?.options || current?.$data?.options;
      const keyStorage = options?.keyStorage || current?.keyStorage || current?.$props?.keyStorage;
      const api = options?.api || current?.api || current?.$props?.api;

      const detected = modeFromText(
        keyStorage?.todayAnswer,
        keyStorage?.answers,
        keyStorage,
        api?.todayAnswer,
        api?.todayAnswerName,
        api,
        options?.nameGA,
        options?.name,
        current?.gameName,
        current?.mode,
        current?.type,
        current?.$route?.name,
        current?.$route?.path
      );

      if (detected) return detected;
      current = current?.$parent || current?.$?.parent?.proxy || null;
      depth++;
    }

    // Nessun fallback automatico alla modalità richiesta: senza una prova
    // esplicita (route, keyStorage o endpoint API) il componente non è affidabile.
    return normalizeMode(inheritedMode);
  }

  function modeMatches(mode) {
    return normalizeMode(mode) === REQUESTED_MODE;
  }

  function runtimeModeEvidence() {
    const recentRequestMode =
      Date.now() - runtime.lastAnswerRequestAt < 15000
        ? normalizeMode(runtime.lastAnswerMode)
        : "";

    if (recentRequestMode) return recentRequestMode;

    const lastStorageMode = runtime.storageModes.length
      ? normalizeMode(runtime.storageModes[runtime.storageModes.length - 1]?.mode)
      : "";

    if (lastStorageMode) return lastStorageMode;

    // Il bootstrap forza il pathname locale prima che Vue Router venga creato.
    // È quindi una prova affidabile soltanto come ultima risorsa, in una vista
    // con storage isolato e appena caricata per una singola modalità.
    return normalizeMode(location.pathname);
  }

  // Esposto soltanto nella copia proxy locale. Permette al frontend del solver
  // di applicare la stessa scansione della console anche se il messaggio runtime
  // dovesse essere perso durante il caricamento dell'app.
  try { window.__DLE_SOLVER_RUNTIME__ = runtime; } catch (_) {}

  const post = payload => {
    try {
      window.parent.postMessage({ source: "dle-solver", ...payload }, PAGE_ORIGIN);
    } catch (_) {}
  };

  // Ogni riddle usa spesso le stesse chiavi (per esempio classic_today_answer).
  // In una vista proxy avrebbero tutte la stessa origine: le isoliamo per evitare
  // collisioni tra LoLdle, Pokédle, Narutodle, Dotadle e modalità differenti.
  function installIsolatedStorage() {
    const prototype = window.Storage?.prototype;
    if (!prototype) return () => {};

    const nativeGetItem = prototype.getItem;
    const nativeSetItem = prototype.setItem;
    const nativeRemoveItem = prototype.removeItem;
    const nativeClear = prototype.clear;
    const nativeKey = prototype.key;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(prototype, "length");
    const nativeLength = lengthDescriptor?.get;

    const physicalKey = key => STORAGE_PREFIX + String(key);
    const visibleKeys = storage => {
      const keys = [];
      let length = 0;
      try { length = nativeLength ? nativeLength.call(storage) : 0; } catch (_) {}
      for (let index = 0; index < length; index++) {
        let key = null;
        try { key = nativeKey.call(storage, index); } catch (_) {}
        if (typeof key === "string" && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      return keys;
    };

    // Parte sempre da uno storage pulito. Rimuove anche eventuali namespace
    // rimasti da analisi precedenti interrotte prima del cleanup.
    for (const storage of [window.localStorage, window.sessionStorage]) {
      try {
        let physicalLength = nativeLength ? nativeLength.call(storage) : 0;
        const staleKeys = [];
        for (let index = 0; index < physicalLength; index++) {
          const key = nativeKey.call(storage, index);
          if (typeof key === "string" && key.startsWith(STORAGE_HOST_PREFIX)) staleKeys.push(key);
        }
        for (const key of staleKeys) nativeRemoveItem.call(storage, key);
      } catch (_) {}
    }

    prototype.getItem = function(key) {
      return nativeGetItem.call(this, physicalKey(key));
    };

    prototype.setItem = function(key, value) {
      try {
        const logicalKey = String(key);
        const mode = modeFromText(logicalKey);
        if (/today[_-]?answer/i.test(logicalKey) && mode) {
          runtime.storageModes.push({ mode, key: logicalKey, at: Date.now() });
          if (runtime.storageModes.length > 20) runtime.storageModes.shift();
        }
      } catch (_) {}
      return nativeSetItem.call(this, physicalKey(key), String(value));
    };

    prototype.removeItem = function(key) {
      return nativeRemoveItem.call(this, physicalKey(key));
    };

    prototype.clear = function() {
      for (const key of visibleKeys(this)) nativeRemoveItem.call(this, key);
    };

    prototype.key = function(index) {
      const key = visibleKeys(this)[Number(index) || 0];
      return key ? key.slice(STORAGE_PREFIX.length) : null;
    };

    if (lengthDescriptor?.configurable && nativeLength) {
      try {
        Object.defineProperty(prototype, "length", {
          configurable: true,
          enumerable: lengthDescriptor.enumerable,
          get() { return visibleKeys(this).length; }
        });
      } catch (_) {}
    }

    return () => {
      for (const storage of [window.localStorage, window.sessionStorage]) {
        try {
          for (const key of visibleKeys(storage)) nativeRemoveItem.call(storage, key);
        } catch (_) {}
      }
    };
  }

  const cleanupStorage = installIsolatedStorage();

  // Narutodle e gli altri DLE decifrano la risposta e subito dopo eseguono
  // JSON.parse sul testo in chiaro. Intercettiamo esclusivamente oggetti singoli
  // con un campo identità esplicito; liste di personaggi e tentativi restano esclusi.
  const nativeJsonParse = JSON.parse.bind(JSON);
  const identityFields = [
    "champion_name", "championName",
    "pokemon_name", "pokemonName",
    "character_name", "characterName",
    "hero_name", "heroName",
    "answer_name", "answerName"
  ];

  function rememberDecryptedPayload(parsed, rawText) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    if (typeof rawText !== "string" || rawText.length > 100000) return;

    let field = null;
    let value = null;
    for (const candidate of identityFields) {
      if (typeof parsed[candidate] === "string" && parsed[candidate].trim()) {
        field = candidate;
        value = parsed[candidate].trim();
        break;
      }
    }

    if (!field || !value || value.length > 220) return;
    const signature = field + "|" + value;
    if (runtime.interceptedAnswers.some(item => item.signature === signature)) return;

    const inferredMode =
      (Date.now() - runtime.lastAnswerRequestAt < 5000 && runtime.lastAnswerMode) ||
      modeFromText(rawText) ||
      "";

    runtime.interceptedAnswers.push({
      signature,
      risposta: value,
      proprietà: field,
      sorgente: "Output decifratura",
      componente: "JSON.parse",
      mode: inferredMode
    });
  }

  JSON.parse = function(text, reviver) {
    const parsed = nativeJsonParse(text, reviver);
    try { rememberDecryptedPayload(parsed, text); } catch (_) {}
    return parsed;
  };

  function rememberAnswerRequest(url, status, transport) {
    try {
      const text = String(url || "");
      if (!/(?:\/answer(?:\/name)?|games\/.+\/answer)/i.test(text)) return;
      const requestMode = modeFromText(text);
      const item = { url: text, status: Number(status) || 0, transport, mode: requestMode };
      runtime.lastAnswerMode = requestMode || runtime.lastAnswerMode;
      runtime.lastAnswerRequestAt = Date.now();
      const signature = item.transport + "|" + item.status + "|" + item.url;
      if (!runtime.answerRequests.some(entry => entry.signature === signature)) {
        runtime.answerRequests.push({ ...item, signature });
      }
    } catch (_) {}
  }

  function isNetworkHost(hostname) {
    const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
    return NETWORK_RE.test(host) || API_NETWORK_RE.test(host) || extraHosts.has(host);
  }

  function shouldIgnoreUrl(raw) {
    return (
      typeof raw !== "string" ||
      !raw ||
      raw.startsWith("data:") ||
      raw.startsWith("blob:") ||
      raw.startsWith("javascript:") ||
      raw.startsWith("about:") ||
      raw.startsWith("#")
    );
  }

  function unwrapProxyUrl(rawUrl) {
    let value;
    try {
      value = typeof rawUrl === "string" ? rawUrl : String(rawUrl);
    } catch (_) {
      return rawUrl;
    }

    // Canonicalizza anche URL proxy già risolti per errore sull'origine remota,
    // per esempio https://loldle.net/api/proxy?url=....
    for (let depth = 0; depth < 5; depth++) {
      try {
        const parsed = new URL(value, PAGE_ORIGIN);
        if (parsed.pathname !== "/api/proxy") break;
        const nested = parsed.searchParams.get("url");
        if (!nested || nested === value) break;
        value = nested;
      } catch (_) {
        break;
      }
    }

    return value;
  }

  function toTargetUrl(rawUrl) {
    try {
      const raw = unwrapProxyUrl(rawUrl);
      if (typeof raw !== "string" || shouldIgnoreUrl(raw)) return null;

      let absolute = new URL(raw, TARGET_URL);

      // Le librerie possono avere già risolto un URL relativo sull'origine proxy.
      // Le nostre API, invece, non devono mai essere inviate al sito remoto.
      if (absolute.origin === PAGE_ORIGIN) {
        if (absolute.pathname.startsWith("/api/")) return null;
        absolute = new URL(
          absolute.pathname + absolute.search + absolute.hash,
          TARGET_ORIGIN
        );
      }

      // Un URL /api/proxy finito sull'origine remota è sempre un doppio proxy.
      // Lo scartiamo qui: unwrapProxyUrl lo avrà già convertito nel target reale.
      if (absolute.pathname === "/api/proxy") return null;

      if (absolute.origin === TARGET_ORIGIN || isNetworkHost(absolute.hostname)) {
        return absolute;
      }
    } catch (_) {}

    return null;
  }

  function mapToProxy(rawUrl) {
    const unwrapped = unwrapProxyUrl(rawUrl);
    const target = toTargetUrl(unwrapped);
    return target
      ? LOCAL_PROXY_PREFIX + encodeURIComponent(target.href) + PROXY_SOURCE_SUFFIX
      : rawUrl;
  }

  // Immagini, font e contenuti multimediali non hanno bisogno del proxy:
  // i browser possono caricarli direttamente da un'altra origine. In questo
  // modo evitiamo decine di richieste server-side non necessarie e gli errori
  // 502 che alcuni CDN restituiscono ai client Node.
  function mapToRemote(rawUrl) {
    const unwrapped = unwrapProxyUrl(rawUrl);
    const target = toTargetUrl(unwrapped);
    return target ? target.href : rawUrl;
  }

  function mapElementResource(element, attribute, value) {
    const tag = String(element?.tagName || "").toLowerCase();
    const name = String(attribute || "").toLowerCase();
    const target = toTargetUrl(value);
    const pathname = target?.pathname || "";

    // Anche quando una libreria assegna href prima di rel, l'estensione basta
    // per riconoscere una risorsa che il browser può caricare direttamente.
    if (/\.(?:css|png|jpe?g|gif|webp|svg|ico|avif|bmp|woff2?|ttf|otf|eot|mp3|mp4|webm|ogg)(?:$|\?)/i.test(pathname)) {
      return target ? target.href : mapToRemote(value);
    }

    if (
      (name === "src" && ["img", "source", "audio", "video"].includes(tag)) ||
      (name === "poster" && tag === "video")
    ) {
      return mapToRemote(value);
    }

    if (name === "href" && tag === "link") {
      const rel = String(element?.getAttribute?.("rel") || element?.rel || "").toLowerCase();
      // CSS, icone e manifest possono essere caricati direttamente.
      if (/\b(?:stylesheet|icon|manifest|apple-touch-icon)\b/.test(rel)) {
        return mapToRemote(value);
      }
    }

    // Script/chunk e chiamate dati restano same-origin attraverso il proxy.
    return mapToProxy(value);
  }

  // Con <base href="https://sito-remoto/..."> anche History API risolve gli
  // URL relativi sull'origine remota. Vue Router finirebbe quindi per chiamare
  // replaceState/pushState con un URL cross-origin e bloccherebbe tutta l'app.
  const nativePushState = History.prototype.pushState;
  const nativeReplaceState = History.prototype.replaceState;

  function mapHistoryUrl(rawUrl) {
    if (rawUrl === undefined || rawUrl === null || rawUrl === "") return rawUrl;

    try {
      let parsed = new URL(String(rawUrl), TARGET_URL);

      if (parsed.origin === TARGET_ORIGIN || isNetworkHost(parsed.hostname)) {
        return PAGE_ORIGIN + parsed.pathname + parsed.search + parsed.hash;
      }

      if (parsed.origin === PAGE_ORIGIN) return parsed.href;
    } catch (_) {}

    return rawUrl;
  }

  History.prototype.pushState = function(state, title, url) {
    return nativePushState.call(this, state, title, mapHistoryUrl(url));
  };

  History.prototype.replaceState = function(state, title, url) {
    return nativeReplaceState.call(this, state, title, mapHistoryUrl(url));
  };

  // Fa vedere al router Vue lo stesso percorso del riddle originale, ma resta
  // sempre sulla stessa origine del solver.
  try {
    nativeReplaceState.call(
      history,
      null,
      "",
      PAGE_ORIGIN + TARGET.pathname + TARGET.search + TARGET.hash
    );
  } catch (error) {
    runtime.lastError = error?.message || String(error);
  }

  // fetch
  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    window.fetch = async function(input, init) {
      try {
        let rawUrl = input;
        let requestInit = init ? { ...init } : {};

        if (input instanceof Request) {
          rawUrl = input.url;
          requestInit.method ||= input.method;
          requestInit.headers ||= input.headers;
          requestInit.credentials = "same-origin";

          const method = String(requestInit.method || "GET").toUpperCase();
          if (!requestInit.body && !["GET", "HEAD"].includes(method)) {
            requestInit.body = await input.clone().arrayBuffer();
          }
        }

        const mapped = mapToProxy(rawUrl);
        if (mapped !== rawUrl) {
          const response = await nativeFetch(mapped, {
            ...requestInit,
            credentials: "same-origin",
            mode: "same-origin"
          });
          rememberAnswerRequest(unwrapProxyUrl(rawUrl), response.status, "fetch");
          return response;
        }
      } catch (error) {
        runtime.lastError = error?.message || String(error);
      }

      const response = await nativeFetch(input, init);
      rememberAnswerRequest(typeof input === "string" ? input : input?.url, response.status, "fetch-direct");
      return response;
    };
  }

  // XMLHttpRequest / Axios
  const NativeXHR = window.XMLHttpRequest;
  if (NativeXHR?.prototype?.open) {
    const nativeOpen = NativeXHR.prototype.open;
    NativeXHR.prototype.open = function(method, url, ...rest) {
      const originalUrl = unwrapProxyUrl(url);
      try {
        this.addEventListener("loadend", () => {
          rememberAnswerRequest(originalUrl, this.status, "xhr");
        }, { once: true });
      } catch (_) {}
      return nativeOpen.call(this, method, mapToProxy(url), ...rest);
    };
  }

  // EventSource
  if (window.EventSource) {
    const NativeEventSource = window.EventSource;
    window.EventSource = function(url, config) {
      return new NativeEventSource(mapToProxy(url), config);
    };
    window.EventSource.prototype = NativeEventSource.prototype;
  }

  // Worker e SharedWorker: alcuni bundle caricano moduli secondari così.
  if (window.Worker) {
    const NativeWorker = window.Worker;
    window.Worker = function(url, options) {
      return new NativeWorker(mapToProxy(url), options);
    };
    window.Worker.prototype = NativeWorker.prototype;
  }

  if (window.SharedWorker) {
    const NativeSharedWorker = window.SharedWorker;
    window.SharedWorker = function(url, options) {
      return new NativeSharedWorker(mapToProxy(url), options);
    };
    window.SharedWorker.prototype = NativeSharedWorker.prototype;
  }

  if (navigator.sendBeacon) {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {
      try {
        return nativeBeacon(mapToProxy(url), data);
      } catch (_) {
        return false;
      }
    };
  }

  // I chunk webpack e altre risorse create dinamicamente non passano da
  // fetch/XHR. Intercettiamo quindi src/href e setAttribute.
  const URL_PROPERTIES = [
    [window.HTMLScriptElement, "src"],
    [window.HTMLLinkElement, "href"],
    [window.HTMLImageElement, "src"],
    [window.HTMLSourceElement, "src"],
    [window.HTMLAudioElement, "src"],
    [window.HTMLVideoElement, "src"],
    [window.HTMLVideoElement, "poster"]
  ];

  for (const [Constructor, property] of URL_PROPERTIES) {
    try {
      const descriptor = Constructor && Object.getOwnPropertyDescriptor(Constructor.prototype, property);
      if (!descriptor?.get || !descriptor?.set) continue;

      Object.defineProperty(Constructor.prototype, property, {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(value) {
          return descriptor.set.call(this, mapElementResource(this, property, value));
        }
      });
    } catch (_) {}
  }

  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    const normalized = String(name).toLowerCase();
    const tag = String(this.tagName || "").toLowerCase();
    const isUrlAttribute =
      (normalized === "src" && ["script", "img", "source", "audio", "video"].includes(tag)) ||
      (normalized === "href" && tag === "link") ||
      (normalized === "poster" && tag === "video");

    return nativeSetAttribute.call(
      this,
      name,
      isUrlAttribute ? mapElementResource(this, normalized, value) : value
    );
  };

  function rewriteElementResource(node) {
    if (!(node instanceof Element)) return;

    const tag = String(node.tagName || "").toLowerCase();
    const attributes = [];
    if (["script", "img", "source", "audio", "video"].includes(tag)) attributes.push("src");
    if (tag === "link") attributes.push("href");
    if (tag === "video") attributes.push("poster");

    for (const attribute of attributes) {
      const value = node.getAttribute(attribute);
      if (!value) continue;
      const mapped = mapElementResource(node, attribute, value);
      if (mapped !== value) nativeSetAttribute.call(node, attribute, mapped);
    }
  }

  const nativeAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(node) {
    try { rewriteElementResource(node); } catch (_) {}
    return nativeAppendChild.call(this, node);
  };

  const nativeInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(node, reference) {
    try { rewriteElementResource(node); } catch (_) {}
    return nativeInsertBefore.call(this, node, reference);
  };

  try {
    if (navigator.serviceWorker?.register) {
      navigator.serviceWorker.register = async () => ({
        unregister: async () => true,
        update: async () => undefined
      });
    }
  } catch (_) {}

  const exactKeys = new Set([
    "todayAnswerDecrypted",
    "answerDecrypted",
    "correctAnswerDecrypted",
    "dailyAnswerDecrypted"
  ]);

  const interestingKeys = [
    "todayAnswerDecrypted",
    "answerDecrypted",
    "correctAnswerDecrypted",
    "dailyAnswerDecrypted",
    "todayAnswer",
    "correctAnswer",
    "currentAnswer",
    "dailyAnswer",
    "targetAnswer",
    "solution",
    "targetChampion",
    "correctChampion",
    "championName",
    "champion_name",
    "targetPokemon",
    "correctPokemon",
    "pokemonName",
    "pokemon_name",
    "targetCharacter",
    "correctCharacter",
    "characterName",
    "character_name",
    "targetHero",
    "correctHero",
    "heroName",
    "hero_name"
  ];

  const keyPattern = /today.*answer|answer.*decrypted|correct.*answer|daily.*answer|target.*answer|solution|target.*(?:champion|pokemon|character|hero)|correct.*(?:champion|pokemon|character|hero)|(?:champion|pokemon|character|hero).*name/i;

  const answerFields = [
    "champion_name", "championName",
    "pokemon_name", "pokemonName",
    "character_name", "characterName",
    "hero_name", "heroName",
    "answer_name", "answerName",
    "name", "answer", "solution", "value", "title"
  ];

  function extractAnswer(value, depth = 0, visited = new WeakSet()) {
    if (value === null || value === undefined || depth > 3) return null;

    if (typeof value === "string" || typeof value === "number") {
      const answer = String(value).trim();
      if (!answer || answer.length > 220) return null;
      if (/^U2FsdGVkX1[A-Za-z0-9+/=]+$/.test(answer)) return null;
      if (/^(true|false|null|undefined|unknown|sconosciuto)$/i.test(answer)) return null;
      if (/^https?:\/\//i.test(answer)) return null;
      if (/^[\[{].*[\]}]$/.test(answer) && answer.length > 80) return null;
      return answer;
    }

    if (typeof value !== "object" || visited.has(value)) return null;
    visited.add(value);

    for (const field of answerFields) {
      try {
        if (value[field] !== undefined) {
          const extracted = extractAnswer(value[field], depth + 1, visited);
          if (extracted) return extracted;
        }
      } catch (_) {}
    }

    if (Array.isArray(value)) {
      for (const item of value.slice(0, 20)) {
        const extracted = extractAnswer(item, depth + 1, visited);
        if (extracted) return extracted;
      }
    }

    return null;
  }

  function scoreProperty(property) {
    const key = String(property || "");
    if (key === "todayAnswerDecrypted") return 100;
    if (/answerDecrypted/i.test(key)) return 98;
    if (/correctAnswerDecrypted|dailyAnswerDecrypted/i.test(key)) return 97;
    if (/^correctAnswer$/i.test(key)) return 94;
    if (/^(?:today|daily|target)Answer$/i.test(key)) return 88;
    if (/solution/i.test(key)) return 84;
    if (/correct.*(?:champion|pokemon|character|hero)/i.test(key)) return 82;
    if (/target.*(?:champion|pokemon|character|hero)/i.test(key)) return 78;
    if (keyPattern.test(key)) return 65;
    return 0;
  }

  function addResult(found, source, property, value, componentName, mode = "") {
    const answer = extractAnswer(value);
    const score = scoreProperty(property);
    if (!answer || score <= 0) return;

    found.push({
      sorgente: source,
      proprietà: property,
      risposta: answer,
      componente: componentName || "sconosciuto",
      mode: normalizeMode(mode),
      punteggio: score
    });
  }

  function inspectObject(object, source, componentName, found, depth = 0, visited = new WeakSet(), mode = "") {
    if (!object || typeof object !== "object" || depth > 5 || visited.has(object)) return;
    visited.add(object);

    const objectMode = modeFromText(
      source,
      object?.keyStorage?.todayAnswer,
      object?.keyStorage?.answers,
      object?.api?.todayAnswer,
      object?.api?.todayAnswerName,
      object?.nameGA,
      object?.mode,
      object?.type
    ) || mode;

    if (Array.isArray(object)) {
      for (const item of object.slice(0, 30)) {
        if (item && typeof item === "object") {
          inspectObject(item, source + "[]", componentName, found, depth + 1, visited, objectMode);
        }
      }
      return;
    }

    let keys;
    try { keys = Object.keys(object).slice(0, 500); } catch (_) { return; }

    for (const key of keys) {
      let value;
      try { value = object[key]; } catch (_) { continue; }

      const valueMode = modeFromText(key, source + "." + key) || objectMode;

      if (keyPattern.test(key) || exactKeys.has(key)) {
        addResult(found, source, key, value, componentName, valueMode);
      }

      if (value && typeof value === "object") {
        inspectObject(value, source + "." + key, componentName, found, depth + 1, visited, valueMode);
      }
    }
  }

  function detectMode(component, inheritedMode = "") {
    const slug = componentMode(component, inheritedMode);
    const labels = {
      classic: "Classica", quote: "Citazione", emoji: "Emoji",
      ability: "Abilità", splash: "Splash", silhouette: "Silhouette",
      card: "Carta", flavor: "Flavor", jutsu: "Jutsu", eye: "Occhio",
      devilfruit: "Devil Fruit", wanted: "Wanted", laugh: "Laugh",
      loadingscreen: "Loading Screen", finalsmash: "Final Smash", kirby: "Kirby"
    };
    return labels[slug] || slug || "Riddle";
  }

  function routePathFromComponent(component) {
    try {
      const direct = component?.$route?.path || component?.$route?.fullPath;
      if (direct) return String(direct);

      const router = component?.$router;
      const current = router?.currentRoute?.value || router?.currentRoute;
      const path = current?.path || current?.fullPath;
      return path ? String(path) : "";
    } catch (_) {
      return "";
    }
  }

  function forceRequestedRoute(components = []) {
    const desired = TARGET.pathname + TARGET.search + TARGET.hash;
    let observed = "";

    for (const component of components) {
      if (!component) continue;
      const currentPath = routePathFromComponent(component);
      if (currentPath) observed = currentPath;

      const router = component?.$router;
      if (!router || typeof router.replace !== "function") continue;

      const currentMode = normalizeMode(currentPath);
      if (currentMode === REQUESTED_MODE) {
        runtime.activeRoute = currentPath;
        runtime.routeForced = true;
        return true;
      }

      if (runtime.routeAttempts >= 4) continue;
      runtime.routeAttempts++;
      try {
        const result = router.replace(desired);
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch (_) {}
    }

    // Vue Router legge il pathname al bootstrap. Se non è ancora accessibile,
    // il percorso locale resta comunque la migliore evidenza della modalità.
    runtime.activeRoute = observed || location.pathname;
    return normalizeMode(runtime.activeRoute) === REQUESTED_MODE;
  }

  function componentName(component) {
    return (
      component?.$options?.name ||
      component?.$options?._componentTag ||
      component?.$vnode?.tag ||
      component?.$?.type?.name ||
      "sconosciuto"
    );
  }

  function collectVue3VNodes(vnode, queue, visited = new WeakSet(), depth = 0) {
    if (!vnode || typeof vnode !== "object" || depth > 25 || visited.has(vnode)) return;
    visited.add(vnode);

    const instance = vnode.component;
    if (instance?.proxy) queue.push({ component: instance.proxy, inheritedMode: "" });
    if (instance?.exposed) queue.push({ component: instance.exposed, inheritedMode: "" });

    const children = vnode.children;
    if (Array.isArray(children)) {
      for (const child of children) collectVue3VNodes(child, queue, visited, depth + 1);
    }

    if (instance?.subTree) collectVue3VNodes(instance.subTree, queue, visited, depth + 1);
  }

  function scanVue() {
    runtime.scans++;
    const vueComponents = new Set();
    const queue = [];
    const found = [];
    let mode = detectMode(null, REQUESTED_MODE);

    document.querySelectorAll("*").forEach(element => {
      if (element.__vue__) queue.push({ component: element.__vue__, inheritedMode: "" });
      if (element.__vueParentComponent?.proxy) queue.push({ component: element.__vueParentComponent.proxy, inheritedMode: "" });
      if (element.__vue_app__?._instance?.proxy) {
        queue.push({ component: element.__vue_app__._instance.proxy, inheritedMode: "" });
        collectVue3VNodes(element.__vue_app__._instance.subTree, queue);
      }
    });

    const appElement = document.querySelector("#app");
    if (appElement?.__vue__) queue.push({ component: appElement.__vue__, inheritedMode: "" });
    if (appElement?.__vue_app__?._instance?.proxy) {
      queue.push({ component: appElement.__vue_app__._instance.proxy, inheritedMode: "" });
      collectVue3VNodes(appElement.__vue_app__._instance.subTree, queue);
    }

    forceRequestedRoute(queue.map(entry => entry?.component || entry));

    while (queue.length) {
      const entry = queue.shift();
      const component = entry?.component || entry;
      const inheritedMode = entry?.inheritedMode || "";
      if (!component || (typeof component !== "object" && typeof component !== "function") || vueComponents.has(component)) continue;
      vueComponents.add(component);
      const componentRoute = routePathFromComponent(component);
      if (componentRoute) runtime.activeRoute = componentRoute;
      const currentMode = componentMode(component, inheritedMode);
      if (modeMatches(currentMode)) mode = detectMode(component, currentMode) || mode;

      if (Array.isArray(component.$children)) {
        queue.push(...component.$children.map(child => ({ component: child, inheritedMode: currentMode })));
      }

      const name = componentName(component);

      for (const property of interestingKeys) {
        try {
          if (component[property] !== undefined) {
            addResult(found, "Componente Vue", property, component[property], name, currentMode);
          }
        } catch (_) {}
      }

      if (component.$data) inspectObject(component.$data, "Vue.$data", name, found, 0, new WeakSet(), currentMode);
      if (component.$props) inspectObject(component.$props, "Vue.$props", name, found, 0, new WeakSet(), currentMode);
      if (component.$store?.state) inspectObject(component.$store.state, "Vuex", name, found, 0, new WeakSet(), currentMode);
      if (component.$?.setupState) inspectObject(component.$.setupState, "Vue.setupState", name, found, 0, new WeakSet(), currentMode);
      if (component.$?.data) inspectObject(component.$.data, "Vue3.data", name, found, 0, new WeakSet(), currentMode);

      const computed = component.$options?.computed;
      if (computed) {
        for (const property of Object.keys(computed)) {
          if (!keyPattern.test(property) && !exactKeys.has(property)) continue;
          try {
            addResult(found, "Vue computed", property, component[property], name, currentMode);
          } catch (_) {}
        }
      }
    }

    // Alcuni riddle espongono una parte dello stato in variabili globali.
    for (const globalKey of ["__INITIAL_STATE__", "__NUXT__", "__NEXT_DATA__", "gameData", "dailyData"]) {
      try {
        if (window[globalKey]) inspectObject(window[globalKey], "window." + globalKey, "globale", found, 0, new WeakSet(), "");
      } catch (_) {}
    }

    const unique = Array.from(
      new Map(
        found
          .sort((a, b) => b.punteggio - a.punteggio)
          .map(result => [result.proprietà + "|" + result.risposta, result])
      ).values()
    );

    runtime.lastCandidates = unique.slice(0, 20);

    const exactCandidates = unique.filter(result =>
      /todayAnswerDecrypted|answerDecrypted|correctAnswerDecrypted|dailyAnswerDecrypted/i.test(result.proprietà)
    );

    const routeMode = normalizeMode(runtime.activeRoute || location.pathname);
    const routeMatches = routeMode === REQUESTED_MODE;
    const matchingExact = exactCandidates.filter(result => modeMatches(result.mode));
    const unscopedExact = exactCandidates.filter(result => !normalizeMode(result.mode));

    // Ordine di fiducia:
    // 1) componente esplicitamente associato alla modalità richiesta;
    // 2) proprietà esatta non etichettata, ma nella route Vue corretta;
    // 3) unica proprietà esatta disponibile nella route Vue corretta.
    let exact = matchingExact;
    if (!exact.length && routeMatches && unscopedExact.length) {
      exact = unscopedExact.map(result => ({ ...result, mode: REQUESTED_MODE }));
    }
    if (!exact.length && routeMatches && exactCandidates.length) {
      const distinct = new Set(exactCandidates.map(result => result.risposta));
      if (distinct.size === 1) {
        exact = exactCandidates.map(result => ({ ...result, mode: REQUESTED_MODE }));
      }
    }

    const matchingIntercepted = runtime.interceptedAnswers.filter(item => modeMatches(item.mode));
    const recentRequestedAnswer =
      Date.now() - runtime.lastAnswerRequestAt < 15000 &&
      normalizeMode(runtime.lastAnswerMode) === REQUESTED_MODE;

    let interceptedSource = matchingIntercepted;
    if (!interceptedSource.length && (routeMatches || recentRequestedAnswer)) {
      interceptedSource = runtime.interceptedAnswers.slice(-3);
    }

    const intercepted = interceptedSource.map(item => ({
      sorgente: item.sorgente,
      proprietà: item.proprietà,
      risposta: item.risposta,
      componente: item.componente,
      mode: REQUESTED_MODE,
      punteggio: 110
    }));

    const selected = exact.length ? exact : intercepted;

    if (selected.length) {
      const bestScore = Math.max(...selected.map(item => item.punteggio || 0));
      const best = selected.filter(item => (item.punteggio || 0) === bestScore);
      const distinctBest = Array.from(new Map(best.map(item => [item.risposta, item])).values());
      const signature = REQUESTED_MODE + "|" + distinctBest.map(item => item.risposta).sort().join("|");
      if (signature !== runtime.lastSignature) {
        runtime.lastSignature = signature;

        try {
          let marker = document.querySelector("#dle-solver-runtime-result");
          if (!marker) {
            marker = document.createElement("div");
            marker.id = "dle-solver-runtime-result";
            marker.hidden = true;
            document.documentElement.appendChild(marker);
          }
          marker.textContent = distinctBest.map(item => item.risposta).join(" | ");
        } catch (_) {}

        post({
          type: "answer",
          target: TARGET_URL,
          mode,
          modeSlug: REQUESTED_MODE,
          method: exact.length ? "stato Vue runtime" : "decifratura JSON intercettata",
          answers: distinctBest.map(({ punteggio, signature, ...item }) => item),
          components: vueComponents.size,
          scans: runtime.scans,
          answerRequests: runtime.answerRequests.map(({ signature, ...item }) => item)
        });
        setTimeout(cleanupStorage, 100);
      }
      return true;
    }

    if ([8, 25, 60, 100].includes(runtime.scans)) {
      post({
        type: "progress",
        message: vueComponents.size
          ? "Applicazione caricata: analizzati " + vueComponents.size + " componenti Vue."
          : "Attendo il caricamento dell'applicazione…",
        components: vueComponents.size,
        activeRoute: runtime.activeRoute,
        requestedMode: REQUESTED_MODE,
        candidates: unique.slice(0, 5).map(({ punteggio, ...item }) => item)
      });
    }

    return false;
  }

  window.addEventListener("error", event => {
    runtime.lastError = event?.message || "Errore JavaScript remoto";
  }, true);

  window.addEventListener("unhandledrejection", event => {
    runtime.lastError = event?.reason?.message || String(event?.reason || "Promise rifiutata");
  });

  post({ type: "ready", target: TARGET_URL, engine: "runtime-proxy-v4.0" });

  const timer = setInterval(() => {
    if (scanVue()) clearInterval(timer);
  }, 400);

  let mutationScanTimer = null;
  const observer = new MutationObserver(() => {
    if (runtime.lastSignature || mutationScanTimer) return;
    mutationScanTimer = setTimeout(() => {
      mutationScanTimer = null;
      scanVue();
    }, 100);
  });

  try {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}

  window.addEventListener("load", () => setTimeout(scanVue, 50), { once: true });

  setTimeout(() => {
    if (!runtime.lastSignature) {
      post({
        type: "timeout",
        message: runtime.lastError
          ? "La risposta non è comparsa. Ultimo errore del riddle: " + runtime.lastError
          : "La pagina è stata caricata, ma la risposta decifrata non è comparsa entro il limite previsto.",
        candidates: runtime.lastCandidates.map(({ punteggio, ...item }) => item),
        interceptedAnswers: runtime.interceptedAnswers.map(({ signature, ...item }) => item),
        answerRequests: runtime.answerRequests.map(({ signature, ...item }) => item),
        activeRoute: runtime.activeRoute,
        requestedMode: REQUESTED_MODE,
        scans: runtime.scans
      });
    }
    clearInterval(timer);
    observer.disconnect();
    // In caso di timeout conserva temporaneamente stato e frame per la diagnostica.
    // Saranno rimossi automaticamente quando parte una nuova analisi.
  }, 45000);
})();
`;
}

export function transformTargetHtml(html, logicalTargetUrl, resourceBaseUrl = logicalTargetUrl) {
  let output = stripNonEssentialScripts(html);
  // Il base URL serve esclusivamente a risolvere asset e chunk. Il bootstrap,
  // invece, deve conservare il percorso richiesto dall'utente anche quando il
  // server remoto reindirizza tutte le route SPA alla home.
  const baseTag = `<base href="${escapeHtml(resourceBaseUrl.href)}">`;
  const bootstrap = `<script>${buildBootstrapScript(logicalTargetUrl)}</script>`;
  const marker = `${baseTag}${bootstrap}`;

  if (/<head\b[^>]*>/i.test(output)) {
    output = output.replace(/<head\b([^>]*)>/i, `<head$1>${marker}`);
  } else {
    output = marker + output;
  }

  return output;
}

export async function createProxiedView(input) {
  const requestedUrl = parseTargetUrl(input);
  const { response, bytes, finalUrl } = await fetchWithLimit(
    requestedUrl,
    {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        referer: requestedUrl.origin + "/"
      }
    },
    MAX_HTML_BYTES
  );

  if (!response.ok) {
    throw new Error(`Il sito remoto ha risposto HTTP ${response.status}.`);
  }

  const html = bytes.toString("utf8");

  // Molti DLE sono SPA e possono restituire/redirectare sempre la stessa pagina
  // HTML. Non dobbiamo quindi usare il pathname finale del fetch per decidere la
  // modalità: manteniamo sempre pathname e query inseriti dall'utente, adottando
  // soltanto l'origine canonica eventualmente ottenuta dal redirect.
  const logicalTargetUrl = new URL(
    requestedUrl.pathname + requestedUrl.search + requestedUrl.hash,
    finalUrl.origin
  );

  return {
    html: transformTargetHtml(html, logicalTargetUrl, finalUrl),
    targetUrl: logicalTargetUrl,
    fetchedUrl: finalUrl
  };
}

function sanitizeForwardHeaders(headers = {}) {
  const output = {};
  const blocked = new Set([
    "host",
    "cookie",
    "origin",
    "referer",
    "content-length",
    "connection",
    "accept-encoding",
    "forwarded",
    "via"
  ]);

  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = rawName.toLowerCase();
    if (blocked.has(name)) continue;
    if (name.startsWith("sec-") || name.startsWith("cf-") || name.startsWith("x-forwarded-")) continue;

    const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;
    if (typeof value === "string" && value.length < 8000) output[name] = value;
  }

  return output;
}

function parseSourceOrigin(input) {
  if (typeof input !== "string" || !input.trim()) return null;

  try {
    const source = new URL(input);
    if (!["https:", "http:"].includes(source.protocol)) return null;
    if (!isAllowedTargetHost(source.hostname)) return null;
    return source.origin;
  } catch {
    return null;
  }
}

export async function proxyTargetRequest({
  url,
  sourceOrigin,
  method = "GET",
  headers = {},
  body
}) {
  const targetUrl = parseTargetUrl(url, { resource: true });
  const normalizedMethod = String(method || "GET").toUpperCase();

  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(normalizedMethod)) {
    throw new Error("Metodo proxy non consentito.");
  }

  const forwardHeaders = sanitizeForwardHeaders(headers);
  const validatedSourceOrigin = parseSourceOrigin(sourceOrigin);
  const requestOrigin = validatedSourceOrigin || targetUrl.origin;
  forwardHeaders.referer = requestOrigin + "/";

  // I browser non inviano normalmente Origin per immagini, CSS e altri GET
  // statici. Alcuni CDN DLE rispondono 502 quando tale header viene aggiunto
  // artificialmente. Lo manteniamo soltanto per API e richieste con corpo.
  const isApiRequest =
    DLE_API_HOST_PATTERN.test(targetUrl.hostname) ||
    /\/(?:api|games)\//i.test(targetUrl.pathname) ||
    /\/answer(?:\/|$)/i.test(targetUrl.pathname) ||
    !["GET", "HEAD"].includes(normalizedMethod);

  if (isApiRequest) {
    forwardHeaders.origin = requestOrigin;
  }

  const requestOptions = {
    method: normalizedMethod,
    headers: forwardHeaders
  };

  if (!["GET", "HEAD"].includes(normalizedMethod) && body !== undefined && body !== null) {
    requestOptions.body = Buffer.isBuffer(body)
      ? body
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  }

  const { response, bytes } = await fetchWithLimit(
    targetUrl,
    requestOptions,
    MAX_PROXY_BYTES,
    { resource: true }
  );

  const contentType = response.headers.get("content-type") || "application/octet-stream";

  return {
    status: response.status,
    bytes,
    headers: {
      "content-type": contentType,
      "cache-control": /(?:javascript|css|image|font)/i.test(contentType)
        ? "public, max-age=300"
        : "no-store",
      "x-content-type-options": "nosniff",
      "x-dle-target": targetUrl.hostname
    }
  };
}

export function errorViewHtml(message) {
  const safe = escapeHtml(message);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Errore</title></head><body><script>window.parent.postMessage({source:"dle-solver",type:"error",message:${JSON.stringify(message)}},location.origin);</script><p>${safe}</p></body></html>`;
}
