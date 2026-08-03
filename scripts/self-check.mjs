import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformTargetHtml } from "../lib/runtime-proxy.js";
import {
  decryptCryptoJsOpenSsl,
  extractBleachdleCharacterNames,
  extractBleachdleWordlyRotation,
  extractJujutsudleCharacterNames,
  extractJujutsudleWordlyRotation,
  extractJujutsupointPuzzle,
  getDirectSites,
  solveDirect
} from "../lib/direct-solver.js";

const cases = [
  ["https://onepiecedle.net/classic", "classic", "Monkey D. Luffy", "character_name"],
  ["https://onepiecedle.net/devilfruit", "devilFruit", "Trafalgar D. Water Law", "character_name"],
  ["https://onepiecedle.net/wanted", "wanted", "Nico Robin", "character_name"],
  ["https://onepiecedle.net/laugh", "laugh", "Brook", "character_name"],

  ["https://narutodle.net/classic", "classic", "Nagato", "champion_name"],
  ["https://narutodle.net/jutsu", "jutsu", "Asura Otsutsuki", "champion_name"],
  ["https://narutodle.net/quote", "quote", "Yahiko", "champion_name"],
  ["https://narutodle.net/eye", "eye", "Kurama", "champion_name"],

  ["https://loldle.net/classic", "classic", "Ahri", "champion_name"],
  ["https://loldle.net/quote", "quote", "Jhin", "champion_name"],
  ["https://loldle.net/ability", "ability", "Lux", "champion_name"],
  ["https://loldle.net/emoji", "emoji", "Teemo", "champion_name"],
  ["https://loldle.net/splash", "splash", "Yasuo", "champion_name"],

  ["https://pokedle.net/classic", "classic", "Pikachu", "pokemon_name"],
  ["https://pokedle.net/card", "card", "Charizard", "pokemon_name"],
  ["https://pokedle.net/flavor", "flavor", "Mewtwo", "pokemon_name"],
  ["https://pokedle.net/silhouette", "silhouette", "Gengar", "pokemon_name"],

  ["https://dotadle.net/classic", "classic", "Invoker", "hero_name"],
  ["https://dotadle.net/quote", "quote", "Pudge", "hero_name"],
  ["https://dotadle.net/ability", "ability", "Crystal Maiden", "hero_name"],
  ["https://dotadle.net/loadingscreen", "loadingScreen", "Juggernaut", "hero_name"],

  ["https://smashdle.net/classic", "classic", "Mario", "fighter_name"],
  ["https://smashdle.net/finalsmash", "finalSmash", "Kirby", "fighter_name"],
  ["https://smashdle.net/kirby", "kirby", "Link", "fighter_name"],
  ["https://smashdle.net/emoji", "emoji", "Pikachu", "fighter_name"],
  ["https://smashdle.net/silhouette", "silhouette", "Samus", "fighter_name"]
];

const bleachdleClassicUrl = "https://bleachdle.org/bleach.html";
const bleachdleWordlyUrl = "https://bleachdle.org/bleach-wordly.htm";
const jujutsudleClassicUrl = "https://jujutsudle.com/";
const jujutsupointUrl = "https://jujutsudle.com/jujutsupoint/";
const jujutsudleWordlyUrl = "https://jujutsudle.com/jujutsu-wordly.htm";
const urls = [
  ...cases.map(item => item[0]),
  bleachdleClassicUrl,
  bleachdleWordlyUrl,
  jujutsudleClassicUrl,
  jujutsupointUrl,
  jujutsudleWordlyUrl
];
const expectedByRequest = new Map();
for (const [url, endpoint, answer, field] of cases) {
  const target = new URL(url);
  const apiHost = `${target.hostname.replace(/^www\./, "").split(".")[0]}.apimeko.link`;
  expectedByRequest.set(`${apiHost}|${endpoint}`, { answer, field, url });
}

const indexHtml = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
for (const url of urls) {
  assert.ok(indexHtml.includes(`data-url="${url}"`), `Link esempio mancante: ${url}`);
}
assert.ok(indexHtml.includes("const DIRECT_HOSTS = new Set"));
assert.ok(indexHtml.includes("narutodle.net"));
assert.ok(indexHtml.includes("smashdle.net"));
assert.ok(indexHtml.includes("bleachdle.org"));
assert.ok(indexHtml.includes('data-url="https://bleachdle.org/bleach.html"'));
assert.ok(indexHtml.includes('data-url="https://bleachdle.org/bleach-wordly.htm"'));
assert.ok(indexHtml.includes('/backgrounds/bleach.webp'));
assert.ok(indexHtml.includes('/logos/bleachdle.png'));
assert.ok(indexHtml.includes('data-url="https://jujutsudle.com/"'));
assert.ok(indexHtml.includes('data-url="https://jujutsudle.com/jujutsupoint/"'));
assert.ok(indexHtml.includes('data-url="https://jujutsudle.com/jujutsu-wordly.htm"'));
assert.ok(indexHtml.includes('/backgrounds/jujutsudle.webp'));
assert.ok(indexHtml.includes('/logos/jujutsudle.webp'));
assert.ok(indexHtml.includes("<html lang=\"en\">"));
assert.ok(indexHtml.includes('rel="canonical" href="https://dlesolver.reav.website/"'));
assert.ok(indexHtml.includes('hreflang="it" href="https://dlesolver.reav.website/it/"'));
assert.ok(indexHtml.includes('hreflang="fr" href="https://dlesolver.reav.website/fr/"'));
assert.ok(indexHtml.includes('hreflang="es" href="https://dlesolver.reav.website/es/"'));
assert.ok(indexHtml.includes('navigator.languages'));
assert.ok(indexHtml.includes('dleLanguagePreference'));

const localizedPages = [
  ["it", "../public/it/index.html", "https://dlesolver.reav.website/it/"],
  ["fr", "../public/fr/index.html", "https://dlesolver.reav.website/fr/"],
  ["es", "../public/es/index.html", "https://dlesolver.reav.website/es/"]
];

const htmlPages = [["en", indexHtml]];
for (const [language, file, canonical] of localizedPages) {
  const html = await readFile(new URL(file, import.meta.url), "utf8");
  assert.ok(html.includes(`<html lang="${language}">`));
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
  assert.ok(html.includes('data-language-code="en"'));
  assert.ok(html.includes('data-language-code="it"'));
  assert.ok(html.includes('data-language-code="fr"'));
  assert.ok(html.includes('data-language-code="es"'));
  assert.ok(html.includes('data-url="https://bleachdle.org/bleach.html"'));
  assert.ok(html.includes('data-url="https://bleachdle.org/bleach-wordly.htm"'));
  assert.ok(html.includes('/backgrounds/bleach.webp'));
  assert.ok(html.includes('/logos/bleachdle.png'));
  assert.ok(html.includes('data-url="https://jujutsudle.com/"'));
  assert.ok(html.includes('data-url="https://jujutsudle.com/jujutsupoint/"'));
  assert.ok(html.includes('data-url="https://jujutsudle.com/jujutsu-wordly.htm"'));
  assert.ok(html.includes('/backgrounds/jujutsudle.webp'));
  assert.ok(html.includes('/logos/jujutsudle.webp'));
  htmlPages.push([language, html]);
}

for (const [language, html] of htmlPages) {
  const scripts = [...html.matchAll(/<script(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 1, `Script inline mancante per ${language}`);
  for (const [index, match] of scripts.entries()) {
    new vm.Script(match[1], { filename: `public-${language}-${index}.js` });
  }
}

const sitemapXml = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
for (const url of [
  "https://dlesolver.reav.website/",
  "https://dlesolver.reav.website/it/",
  "https://dlesolver.reav.website/fr/",
  "https://dlesolver.reav.website/es/"
]) {
  assert.ok(sitemapXml.includes(url));
}

for (const url of urls) {
  const transformed = transformTargetHtml(
    "<!doctype html><html><head></head><body><div id=\"app\"></div></body></html>",
    new URL(url)
  );
  const match = transformed.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, `Bootstrap runtime mancante per ${url}`);
  new vm.Script(match[1], { filename: `${new URL(url).hostname}-${new URL(url).pathname}.js` });
}

function evpBytesToKey(password, salt, keyLength = 32, ivLength = 16) {
  const passwordBytes = Buffer.from(password, "utf8");
  const blocks = [];
  let previous = Buffer.alloc(0);
  let length = 0;
  while (length < keyLength + ivLength) {
    const hash = crypto.createHash("md5");
    hash.update(previous);
    hash.update(passwordBytes);
    hash.update(salt);
    previous = hash.digest();
    blocks.push(previous);
    length += previous.length;
  }
  const derived = Buffer.concat(blocks);
  return {
    key: derived.subarray(0, keyLength),
    iv: derived.subarray(keyLength, keyLength + ivLength)
  };
}

function encryptCryptoJs(text, password) {
  const salt = Buffer.from("12345678", "ascii");
  const { key, iv } = evpBytesToKey(password, salt);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from("Salted__", "ascii"), salt, encrypted]).toString("base64");
}

// Conferma la chiave condivisa usando quattro valori reali Narutodle già acquisiti.
assert.equal(decryptCryptoJsOpenSsl("U2FsdGVkX1+L9b49V/xEUrgEaRgXNoQ9XHj6OWF5CMM=", "QhDZJfngdx"), "Nagato");
assert.equal(decryptCryptoJsOpenSsl("U2FsdGVkX19PSqossrJ/v668HPKxnaMmJSsk4QKYT8Q=", "QhDZJfngdx"), "Kurama");
assert.equal(decryptCryptoJsOpenSsl("U2FsdGVkX18Tbd1iuIL051G4cBQvswbGQeE3MKxapXk=", "QhDZJfngdx"), "Asura Otsutsuki");
assert.equal(decryptCryptoJsOpenSsl("U2FsdGVkX19j+Vj6OP1l2rtC8MxNk2dR6EXMYNgXuRM=", "QhDZJfngdx"), "Yahiko");

const syntheticBleachdleNames = Array.from(
  { length: 80 },
  (_, index) => index === 27 ? "Su\\xec-Fēng" : `Bleach Character ${index}`
);
const syntheticBleachdleBundle =
  `let l=[${syntheticBleachdleNames.map(name => `{name:"${name}"}`).join(",")}];` +
  `function u(){return l[g()]}function g(){return dayOfYear(new Date())%l.length}`;

const parsedSyntheticBleachdleNames = extractBleachdleCharacterNames(
  syntheticBleachdleBundle
);
assert.equal(parsedSyntheticBleachdleNames.length, 80);
assert.equal(parsedSyntheticBleachdleNames[27], "Suì-Fēng");

const syntheticJujutsudleNames = Array.from(
  { length: 97 },
  (_, index) => index === 21 ? "Hana Kurusu" : `Jujutsu Character ${index}`
);
const syntheticJujutsudleBundle =
  `let c=[${syntheticJujutsudleNames.map(name => `{name:"${name}",hints:[]}`).join(",")}];` +
  `function f(){return c[x()]}function x(){return dayOfYear(new Date())%c.length}`;
const parsedSyntheticJujutsudleNames = extractJujutsudleCharacterNames(
  syntheticJujutsudleBundle
);
assert.deepEqual(parsedSyntheticJujutsudleNames, syntheticJujutsudleNames);

const syntheticJujutsupointHistory = {
  "2026-01-03": {
    id: 3,
    date: "2026-01-03",
    category: "Yorozu",
    clues: ["One", "Two", "Three", "Four", "Five"],
    image: "/images/characters/jjk/yorozu.webp"
  },
  "2026-01-02": {
    id: 2,
    date: "2026-01-02",
    category: "Choso",
    clues: ["One", "Two", "Three", "Four", "Five"],
    image: "/images/characters/jjk/choso.webp"
  }
};
const syntheticJujutsupointJson = JSON.stringify(syntheticJujutsupointHistory);
assert.equal(
  extractJujutsupointPuzzle(syntheticJujutsupointJson, "2026-01-02").answer,
  "Choso"
);
assert.equal(
  extractJujutsupointPuzzle(syntheticJujutsupointJson, "2026-01-04").answer,
  "Yorozu"
);

const syntheticWordlySolutions = Array.from(
  { length: 80 },
  (_, index) => index === 53 ? "rangiku-matsumoto" : `wordly-character-${index}`
);
const syntheticWordlyBundle =
  `let w=[${syntheticWordlySolutions.map(solution => `{solution:"${solution}"}`).join(",")}];` +
  `let daily=function(){var e=new Date(2022,0),t=new Date(e),r=new Date;` +
  `r.setHours(0,0,0,0);for(var n=0;t<r;)n++,t.setDate(t.getDate()+1);` +
  `return G((n+-22)%w.length)}();`;

const parsedSyntheticWordly = extractBleachdleWordlyRotation(
  syntheticWordlyBundle
);
assert.equal(parsedSyntheticWordly.solutions.length, 80);
assert.equal(parsedSyntheticWordly.solutions[53], "rangiku-matsumoto");
assert.equal(parsedSyntheticWordly.baseYear, 2022);
assert.equal(parsedSyntheticWordly.baseMonth, 0);
assert.equal(parsedSyntheticWordly.baseDay, 1);
assert.equal(parsedSyntheticWordly.dayOffset, -22);

const syntheticJujutsudleWordlySolutions = Array.from(
  { length: 70 },
  (_, index) => index === 41 ? "satoru-gojo" : `jujutsu-wordly-character-${index}`
);
const syntheticJujutsudleWordlyBundle =
  `let w=[${syntheticJujutsudleWordlySolutions.map(solution => `{solution:"${solution}"}`).join(",")}];` +
  `let daily=function(){var e=new Date(2022,0),t=new Date(e),r=new Date;` +
  `r.setHours(0,0,0,0);for(var n=0;t<r;)n++,t.setDate(t.getDate()+1);` +
  `return G((n+-22)%w.length)}();`;
const parsedSyntheticJujutsudleWordly = extractJujutsudleWordlyRotation(
  syntheticJujutsudleWordlyBundle
);
assert.equal(parsedSyntheticJujutsudleWordly.solutions.length, 70);
assert.equal(parsedSyntheticJujutsudleWordly.solutions[41], "satoru-gojo");
assert.equal(parsedSyntheticJujutsudleWordly.dayOffset, -22);

function currentLocalDayOfYear(timezoneOffsetMinutes) {
  const shifted = new Date(Date.now() - timezoneOffsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  return Math.floor(
    (Date.UTC(year, shifted.getUTCMonth(), shifted.getUTCDate()) -
      Date.UTC(year, 0, 1)) /
      86_400_000
  ) + 1;
}

function currentLocalDateKey(timezoneOffsetMinutes) {
  const shifted = new Date(Date.now() - timezoneOffsetMinutes * 60_000);
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0")
  ].join("-");
}

const currentJujutsupointDate = currentLocalDateKey(-120);
const currentJujutsupointHistory = JSON.stringify({
  [currentJujutsupointDate]: {
    id: 112,
    date: currentJujutsupointDate,
    category: "Yorozu",
    clues: ["One", "Two", "Three", "Four", "Five"],
    image: "/images/characters/jjk/yorozu.webp"
  }
});

const nativeFetch = globalThis.fetch;
globalThis.fetch = async url => {
  const parsed = new URL(String(url));

  if (parsed.hostname === "bleachdle.org" && parsed.pathname === "/bleach.html") {
    return new Response(
      '<!doctype html><script src="/_next/static/chunks/app/bleach/page-test.js"></script>',
      { status: 200, headers: { "content-type": "text/html" } }
    );
  }

  if (
    parsed.hostname === "bleachdle.org" &&
    parsed.pathname === "/_next/static/chunks/app/bleach/page-test.js"
  ) {
    return new Response(syntheticBleachdleBundle, {
      status: 200,
      headers: { "content-type": "application/javascript" }
    });
  }

  if (
    parsed.hostname === "bleachdle.org" &&
    parsed.pathname === "/bleach-wordly.htm"
  ) {
    return new Response(
      '<!doctype html><script defer src="/static/js/bleachlev2.js"></script>',
      { status: 200, headers: { "content-type": "text/html" } }
    );
  }

  if (
    parsed.hostname === "bleachdle.org" &&
    parsed.pathname === "/static/js/bleachlev2.js"
  ) {
    return new Response(syntheticWordlyBundle, {
      status: 200,
      headers: { "content-type": "application/javascript" }
    });
  }

  if (
    parsed.hostname === "jujutsudle.com" &&
    parsed.pathname === "/jujutsukaisen.html"
  ) {
    return new Response(
      '<!doctype html><script src="/_next/static/chunks/app/jujutsukaisen/page-test.js"></script>',
      { status: 200, headers: { "content-type": "text/html" } }
    );
  }

  if (
    parsed.hostname === "jujutsudle.com" &&
    parsed.pathname === "/_next/static/chunks/app/jujutsukaisen/page-test.js"
  ) {
    return new Response(syntheticJujutsudleBundle, {
      status: 200,
      headers: { "content-type": "application/javascript" }
    });
  }

  if (
    parsed.hostname === "jujutsudle.com" &&
    parsed.pathname === "/static/js/jujutsudle.json"
  ) {
    return new Response(currentJujutsupointHistory, {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  if (
    parsed.hostname === "jujutsudle.com" &&
    parsed.pathname === "/jujutsu-wordly.htm"
  ) {
    return new Response(
      '<!doctype html><script defer src="/static/js/jujutsudlev2.js"></script>',
      { status: 200, headers: { "content-type": "text/html" } }
    );
  }

  if (
    parsed.hostname === "jujutsudle.com" &&
    parsed.pathname === "/static/js/jujutsudlev2.js"
  ) {
    return new Response(syntheticJujutsudleWordlyBundle, {
      status: 200,
      headers: { "content-type": "application/javascript" }
    });
  }

  const match = parsed.pathname.match(/^\/games\/([^/]+)\/answer$/);

  if (!match) {
    return new Response("not found", { status: 404 });
  }

  const key = `${parsed.hostname}|${match[1]}`;
  const expected = expectedByRequest.get(key);
  if (!expected) {
    return new Response("not found", { status: 404 });
  }

  assert.equal(parsed.searchParams.get("utc"), "2", `UTC errato per ${expected.url}`);
  const payload = encryptCryptoJs(
    JSON.stringify({ game_numero: 999, [expected.field]: expected.answer }),
    "QhDZJfngdx"
  );

  return new Response(JSON.stringify({ data: payload }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};

try {
  for (const [url, endpoint, expectedAnswer] of cases) {
    const solved = await solveDirect(url, -120);
    assert.equal(solved.success, true, url);
    assert.equal(solved.answer, expectedAnswer, url);
    assert.equal(solved.endpointName, endpoint, url);
    assert.equal(solved.region, "europe", url);
  }

  const bleachdleSolved = await solveDirect(bleachdleClassicUrl, -120);
  const expectedBleachdleIndex =
    currentLocalDayOfYear(-120) % syntheticBleachdleNames.length;
  assert.equal(bleachdleSolved.success, true);
  assert.equal(
    bleachdleSolved.answer,
    parsedSyntheticBleachdleNames[expectedBleachdleIndex]
  );
  assert.equal(bleachdleSolved.endpointName, "classic");
  assert.equal(bleachdleSolved.source, "bleachdle-bundle");

  const wordlySolved = await solveDirect(bleachdleWordlyUrl, -120);
  const shifted = new Date(Date.now() - -120 * 60_000);
  const elapsedWordlyDays = Math.floor(
    (Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
      Date.UTC(2022, 0, 1)) /
      86_400_000
  );
  const expectedWordlyIndex =
    ((elapsedWordlyDays - 22) % syntheticWordlySolutions.length +
      syntheticWordlySolutions.length) %
    syntheticWordlySolutions.length;
  assert.equal(wordlySolved.success, true);
  assert.equal(
    wordlySolved.answer,
    syntheticWordlySolutions[expectedWordlyIndex].toUpperCase()
  );
  assert.equal(wordlySolved.endpointName, "wordly");
  assert.equal(wordlySolved.source, "bleachdle-wordly-bundle");

  const jujutsudleSolved = await solveDirect(jujutsudleClassicUrl, -120);
  const expectedJujutsudleIndex =
    currentLocalDayOfYear(-120) % syntheticJujutsudleNames.length;
  assert.equal(jujutsudleSolved.success, true);
  assert.equal(
    jujutsudleSolved.answer,
    parsedSyntheticJujutsudleNames[expectedJujutsudleIndex]
  );
  assert.equal(jujutsudleSolved.mode, "classic");
  assert.equal(jujutsudleSolved.endpointName, "classic");
  assert.equal(jujutsudleSolved.source, "jujutsudle-bundle");

  const jujutsupointSolved = await solveDirect(jujutsupointUrl, -120);
  assert.equal(jujutsupointSolved.success, true);
  assert.equal(jujutsupointSolved.answer, "Yorozu");
  assert.equal(jujutsupointSolved.gameNumero, 112);
  assert.equal(jujutsupointSolved.puzzleDate, currentJujutsupointDate);
  assert.equal(jujutsupointSolved.mode, "jujutsupoint");
  assert.equal(jujutsupointSolved.endpointName, "jujutsupoint");
  assert.equal(jujutsupointSolved.source, "jujutsudle-point-json");

  const jujutsudleWordlySolved = await solveDirect(jujutsudleWordlyUrl, -120);
  const expectedJujutsudleWordlyIndex =
    ((elapsedWordlyDays - 22) % syntheticJujutsudleWordlySolutions.length +
      syntheticJujutsudleWordlySolutions.length) %
    syntheticJujutsudleWordlySolutions.length;
  assert.equal(jujutsudleWordlySolved.success, true);
  assert.equal(
    jujutsudleWordlySolved.answer,
    syntheticJujutsudleWordlySolutions[expectedJujutsudleWordlyIndex].toUpperCase()
  );
  assert.equal(jujutsudleWordlySolved.mode, "wordly");
  assert.equal(jujutsudleWordlySolved.endpointName, "wordly");
  assert.equal(jujutsudleWordlySolved.source, "jujutsudle-wordly-bundle");

  const fallback = await solveDirect("https://example.com/classic", -120);
  assert.equal(fallback.fallback, true);
} finally {
  globalThis.fetch = nativeFetch;
}

const directSites = getDirectSites();
assert.equal(directSites.length, 8);
assert.equal(directSites.reduce((sum, site) => sum + site.modes.length, 0), 31);

console.log(`Self-check completato: 31 modalità dirette verificate su ${directSites.length} siti.`);
