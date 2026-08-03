import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformTargetHtml } from "../lib/runtime-proxy.js";
import {
  decryptCryptoJsOpenSsl,
  extractBleachdleCharacterNames,
  extractBleachdleWordlyRotation,
  extractConnectionsPuzzle,
  extractDailyPhraseRotation,
  extractJujutsudleCharacterNames,
  extractJujutsudleWordlyRotation,
  extractJujutsupointPuzzle,
  extractPublisherCharacterNames,
  extractSeededAbility,
  extractTimestampWordRotation,
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
const publisherCases = [
  ["https://narutodle.org/", "classic", "publisher-classic-bundle"],
  ["https://narutodle.org/narutopoint/", "narutopoint", "publisher-dated-json"],
  ["https://narutodle.org/naruto-wordly.htm", "wordly", "publisher-wordly-bundle"],
  ["https://narutodle.org/uzumakidle/", "uzumakidle", "publisher-phrase-bundle"],
  ["https://kimetsudle.com/", "classic", "publisher-classic-bundle"],
  ["https://kimetsudle.com/kimetsu-wordly.htm", "wordly", "publisher-wordly-bundle"],
  ["https://jojodle.com/", "classic", "publisher-classic-bundle"],
  ["https://jojodle.com/jojopoint/", "jojopoint", "publisher-dated-json"],
  ["https://jojodle.com/jojo-wordly.htm", "wordly", "publisher-wordly-bundle"],
  ["https://jojodle.com/joestardle/", "joestardle", "publisher-phrase-bundle"],
  ["https://bluelockdle.com/", "classic", "publisher-classic-bundle"],
  ["https://bluelockdle.com/bluelock-wordly.htm", "wordly", "publisher-wordly-bundle"],
  ["https://genshindle.org/", "wordly", "publisher-wordly-bundle"],
  ["https://genshindle.org/genshinle-game/", "daily", "genshinle-seeded-json"],
  ["https://genshindle.org/paimordle.html", "paimordle", "publisher-timestamp-word-bundle"],
  ["https://animedle.org/onepiecedle/", "onepiececlassic", "publisher-classic-bundle"],
  ["https://animedle.org/onepiecedle/onepiece-wordly.htm", "onepiecewordly", "publisher-wordly-bundle"],
  ["https://animedle.org/dragonballdle/", "dragonballclassic", "publisher-classic-bundle"],
  ["https://animedle.org/dragonballdle/dragonball-wordly.htm", "dragonballwordly", "publisher-wordly-bundle"],
  ["https://opmdle.com/", "classic", "publisher-classic-bundle"],
  ["https://opmdle.com/one-punch-man-wordly.htm", "wordly", "publisher-wordly-bundle"],
  ["https://pokedoku.org/pokentions/", "daily", "pokentions-connections-json"]
];
const urls = [
  ...cases.map(item => item[0]),
  bleachdleClassicUrl,
  bleachdleWordlyUrl,
  jujutsudleClassicUrl,
  jujutsupointUrl,
  jujutsudleWordlyUrl,
  ...publisherCases.map(item => item[0])
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
for (const asset of [
  "/backgrounds/narutodle-org.webp",
  "/backgrounds/kimetsudle.webp",
  "/backgrounds/jojodle.webp",
  "/backgrounds/bluelockdle.webp",
  "/backgrounds/genshindle.webp",
  "/backgrounds/animedle-onepiece.webp",
  "/backgrounds/animedle-dragonball.jpg",
  "/backgrounds/opmdle.webp",
  "/logos/pokentions.png"
]) {
  assert.ok(indexHtml.includes(asset), `Asset tema mancante: ${asset}`);
}
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
  for (const [url] of publisherCases) {
    assert.ok(html.includes(`data-url="${url}"`), `Link ${language} mancante: ${url}`);
  }
  assert.ok(html.includes('/backgrounds/animedle-onepiece.webp'));
  assert.ok(html.includes('/backgrounds/animedle-dragonball.jpg'));
  assert.ok(html.includes('/logos/pokentions.png'));
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

const syntheticPublisherNames = Array.from(
  { length: 48 },
  (_, index) => index === 17 ? "Publisher Hero" : `Publisher Character ${index}`
);
const syntheticPublisherBundle =
  `const heroes=[${syntheticPublisherNames.map(name => `{name:"${name}",hints:[]}`).join(",")}];` +
  `function daily(){return heroes[dayOfYear(new Date())%heroes.length]}`;
assert.deepEqual(
  extractPublisherCharacterNames(syntheticPublisherBundle, "Publisher test"),
  syntheticPublisherNames
);

const syntheticPhrasePuzzles = Array.from({ length: 40 }, (_, index) => ({
  id: index + 500,
  printDate: `Phrase day ${index}`,
  solution: { text: `Daily phrase ${index}` }
}));
const syntheticPhraseBundle =
  `var archive=JSON.parse(${JSON.stringify(JSON.stringify(syntheticPhrasePuzzles))});` +
  `var base=new Date("2024-10-08"),elapsed=Date.now()-base.getTime();` +
  `var selected=Math.floor(elapsed/864e5)%archive.length;`;
const parsedSyntheticPhrase = extractDailyPhraseRotation(syntheticPhraseBundle);
assert.equal(parsedSyntheticPhrase.puzzles.length, 40);
assert.equal(parsedSyntheticPhrase.puzzles[17].solution.text, "Daily phrase 17");
assert.equal(parsedSyntheticPhrase.baseYear, 2024);
assert.equal(parsedSyntheticPhrase.baseMonth, 9);
assert.equal(parsedSyntheticPhrase.baseDay, 8);

const syntheticTimestampWords = Array.from(
  { length: 64 },
  (_, index) => index === 29 ? "origin" : `paimon${index}`
);
const syntheticTimestampBundle =
  `var l=${JSON.stringify(syntheticTimestampWords)};` +
  `var base=new Date(2022,2,11),r=123;` +
  `var daily={solution:g(l[r%l.length])};`;
const parsedSyntheticTimestamp = extractTimestampWordRotation(syntheticTimestampBundle);
assert.equal(parsedSyntheticTimestamp.words.length, 64);
assert.equal(parsedSyntheticTimestamp.words[29], "origin");
assert.equal(parsedSyntheticTimestamp.baseYear, 2022);
assert.equal(parsedSyntheticTimestamp.baseMonth, 2);
assert.equal(parsedSyntheticTimestamp.baseDay, 11);

const syntheticAbilities = Object.fromEntries(
  Array.from({ length: 64 }, (_, index) => [`Hero${index}Skill`, { icon: `skill-${index}.webp` }])
);
const syntheticAbilitiesJson = JSON.stringify({
  ...syntheticAbilities,
  FOCALORSBurst: { icon: "excluded-burst.webp" },
  FOCALORSSkill: { icon: "excluded-skill.webp" }
});
const parsedSyntheticAbility = extractSeededAbility(syntheticAbilitiesJson, "03-01-2026");
assert.ok(parsedSyntheticAbility.answer.startsWith("Hero"));
assert.notEqual(parsedSyntheticAbility.key, "FOCALORSBurst");
assert.notEqual(parsedSyntheticAbility.key, "FOCALORSSkill");

const syntheticConnectionGroups = Array.from({ length: 4 }, (_, groupIndex) => ({
  number: groupIndex + 1,
  theme: `Theme ${groupIndex + 1}`,
  words: Array.from({ length: 4 }, (_, wordIndex) => `Pokemon ${groupIndex + 1}-${wordIndex + 1}`)
}));
const parsedSyntheticConnections = extractConnectionsPuzzle(
  JSON.stringify({ 7: { groups: syntheticConnectionGroups } }),
  7
);
assert.equal(parsedSyntheticConnections.groups.length, 4);
assert.ok(parsedSyntheticConnections.answer.includes("Theme 4: Pokemon 4-1"));

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

const shiftedPublisherDate = new Date(Date.now() - -120 * 60_000);
const currentPublisherSeedKey = [
  String(shiftedPublisherDate.getUTCDate()).padStart(2, "0"),
  String(shiftedPublisherDate.getUTCMonth() + 1).padStart(2, "0"),
  shiftedPublisherDate.getUTCFullYear()
].join("-");
const currentPublisherArchive = JSON.stringify({
  [currentJujutsupointDate]: {
    id: 808,
    date: currentJujutsupointDate,
    category: "Daily Category",
    clues: ["One", "Two", "Three", "Four", "Five"]
  }
});
const currentConnectionsNumber = Math.floor(
  (Date.UTC(
    shiftedPublisherDate.getUTCFullYear(),
    shiftedPublisherDate.getUTCMonth(),
    shiftedPublisherDate.getUTCDate()
  ) - Date.UTC(2023, 9, 1)) / 86_400_000
);
const currentConnectionsArchive = `\uFEFF${JSON.stringify({
  [currentConnectionsNumber]: { groups: syntheticConnectionGroups }
})}`;
const expectedSeededAbility = extractSeededAbility(
  syntheticAbilitiesJson,
  currentPublisherSeedKey
);

const publisherPageScripts = new Map([
  ["narutodle.org/narutodle-embed/", "/app/naruto/page-test.js"],
  ["kimetsudle.com/demonslayer.html", "/app/demonslayer/page-test.js"],
  ["jojodle.com/jojo.html", "/app/jojo/page-test.js"],
  ["bluelockdle.com/bluelock.html", "/app/bluelock/page-test.js"],
  ["animedle.org/onepiece.html", "/app/onepiece/page-test.js"],
  ["animedle.org/dragonball.html", "/app/dragonball/page-test.js"],
  ["opmdle.com/onepunchman.html", "/app/onepunchman/page-test.js"],
  ["narutodle.org/naruto-wordly.htm", "/static/js/narutolev2.js"],
  ["kimetsudle.com/kimetsu-wordly.htm", "/static/js/kimetsudlev2.js"],
  ["jojodle.com/jojo-wordly.htm", "/static/js/jojodlev2.js"],
  ["bluelockdle.com/bluelock-wordly.htm", "/static/js/bluelockdlev2.js"],
  ["genshindle.org/", "/static/js/genshindlev2.js"],
  ["animedle.org/onepiecedle/onepiece-wordly.htm", "/onepiecedle/static/js/onepiecedlev2.js"],
  ["animedle.org/dragonballdle/dragonball-wordly.htm", "/dragonballdle/static/js/dragonballdlev2.js"],
  ["opmdle.com/one-punch-man-wordly.htm", "/static/js/opmdlev2.js"],
  ["narutodle.org/uzumakidle/", "/uzumakidle/static/js/uzumakidlev2.js"],
  ["jojodle.com/joestardle/", "/joestardle/static/js/joestardlev2.js"],
  ["genshindle.org/paimordle-embed/", "/paimordle-embed/static/js/main.test.js"]
]);
const publisherScriptBodies = new Map();
for (const [pageKey, scriptPath] of publisherPageScripts) {
  const hostname = pageKey.split("/")[0];
  let body = syntheticPublisherBundle;
  if (/wordly/i.test(pageKey) || pageKey === "genshindle.org/") {
    body = syntheticWordlyBundle;
  }
  if (/uzumakidlev2|joestardlev2/i.test(scriptPath)) body = syntheticPhraseBundle;
  if (/paimordle-embed/i.test(scriptPath)) body = syntheticTimestampBundle;
  publisherScriptBodies.set(`${hostname}${scriptPath}`, body);
}

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

  const publisherKey = `${parsed.hostname}${parsed.pathname}`;
  const publisherScript = publisherPageScripts.get(publisherKey);
  if (publisherScript) {
    return new Response(`<!doctype html><script src="${publisherScript}"></script>`, {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }

  if (publisherScriptBodies.has(publisherKey)) {
    return new Response(publisherScriptBodies.get(publisherKey), {
      status: 200,
      headers: { "content-type": "application/javascript" }
    });
  }

  if (
    (parsed.hostname === "narutodle.org" && parsed.pathname === "/static/js/narutodle.json") ||
    (parsed.hostname === "jojodle.com" && parsed.pathname === "/static/js/jojodle.json")
  ) {
    return new Response(currentPublisherArchive, {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  if (
    parsed.hostname === "genshindle.org" &&
    parsed.pathname === "/genshinle-game/abilities.json"
  ) {
    return new Response(syntheticAbilitiesJson, {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  if (
    parsed.hostname === "pokedoku.org" &&
    parsed.pathname === "/pokentions/game-specs.json"
  ) {
    return new Response(currentConnectionsArchive, {
      status: 200,
      headers: { "content-type": "application/json" }
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

  const expectedPublisherClassic =
    syntheticPublisherNames[currentLocalDayOfYear(-120) % syntheticPublisherNames.length];
  const expectedPublisherWordly =
    syntheticWordlySolutions[expectedWordlyIndex].toUpperCase();
  const expectedPhraseIndex =
    ((Math.floor((Date.now() - Date.UTC(2024, 9, 8)) / 86_400_000) %
      syntheticPhrasePuzzles.length) + syntheticPhrasePuzzles.length) %
    syntheticPhrasePuzzles.length;
  const expectedPhrase = syntheticPhrasePuzzles[expectedPhraseIndex].solution.text;
  const expectedTimestampIndex =
    ((Math.floor((Date.UTC(
      shiftedPublisherDate.getUTCFullYear(),
      shiftedPublisherDate.getUTCMonth(),
      shiftedPublisherDate.getUTCDate()
    ) - Date.UTC(2022, 2, 11)) / 86_400_000) % syntheticTimestampWords.length) +
      syntheticTimestampWords.length) % syntheticTimestampWords.length;
  const expectedTimestamp = syntheticTimestampWords[expectedTimestampIndex].toUpperCase();

  for (const [url, expectedMode, expectedSource] of publisherCases) {
    const solved = await solveDirect(url, -120);
    assert.equal(solved.success, true, url);
    assert.equal(solved.mode, expectedMode, url);
    assert.equal(solved.endpointName, expectedMode, url);
    assert.equal(solved.source, expectedSource, url);
    assert.equal(solved.region, "local", url);

    if (expectedSource === "publisher-classic-bundle") {
      assert.equal(solved.answer, expectedPublisherClassic, url);
    } else if (expectedSource === "publisher-wordly-bundle") {
      assert.equal(solved.answer, expectedPublisherWordly, url);
    } else if (expectedSource === "publisher-dated-json") {
      assert.equal(solved.answer, "Daily Category", url);
      assert.equal(solved.gameNumero, 808, url);
    } else if (expectedSource === "publisher-phrase-bundle") {
      assert.equal(solved.answer, expectedPhrase, url);
    } else if (expectedSource === "publisher-timestamp-word-bundle") {
      assert.equal(solved.answer, expectedTimestamp, url);
    } else if (expectedSource === "genshinle-seeded-json") {
      assert.equal(solved.answer, expectedSeededAbility.answer, url);
    } else if (expectedSource === "pokentions-connections-json") {
      assert.equal(solved.answer, parsedSyntheticConnections.answer, url);
      assert.equal(solved.gameNumero, currentConnectionsNumber, url);
    }
  }

  const fallback = await solveDirect("https://example.com/classic", -120);
  assert.equal(fallback.fallback, true);
} finally {
  globalThis.fetch = nativeFetch;
}

const directSites = getDirectSites();
assert.equal(directSites.length, 16);
assert.equal(directSites.reduce((sum, site) => sum + site.modes.length, 0), 53);

console.log(`Self-check completato: 53 modalità dirette verificate su ${directSites.length} siti.`);
