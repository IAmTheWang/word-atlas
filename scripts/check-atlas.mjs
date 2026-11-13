#!/usr/bin/env node
/** Validate the public Word Atlas dataset: structure, references and media files. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public/atlas");
const index = JSON.parse(fs.readFileSync(path.join(pub, "index.json"), "utf8"));
const errors = [];
const warn = { headwordNotInExample: 0, missingIpa: 0, oneExample: 0, withSyllables: 0, withForms: 0, multiSense: 0, legacyChinese: 0, withChinese: 0 };
const fail = (msg) => errors.length < 50 && errors.push(msg);

if (index.words.length !== index.count) fail(`count ${index.count} != rows ${index.words.length}`);
const ids = new Set();
index.words.forEach((r, i) => {
  const [id, word, zh, , cefr, topic, media] = r;
  if (!/^[a-z0-9-]{1,64}$/.test(id) || ids.has(id)) fail(`bad or duplicate id at ${i}: ${id}`);
  ids.add(id);
  if (!word || !zh) fail(`empty word or meaning: ${id}`);
  if (!(cefr >= 0 && cefr < index.cefr.length)) fail(`bad level: ${id}`);
  if (!(topic >= 0 && topic < index.topics.length)) fail(`bad topic: ${id}`);
  const need = [
    [1, `img/${id}.webp`],
    [1, `thumb/${id}.webp`],
    [2, `audio/uk/${id}.mp3`],
    [4, `audio/us/${id}.mp3`],
    [8, `audio/ex/${id}.mp3`],
    [16, `audio/ex2/${id}.mp3`],
  ];
  for (const [bit, file] of need) if (media & bit && !fs.existsSync(path.join(pub, file))) fail(`missing ${file}`);
});

let entries = 0;
let examples = 0;
for (let n = 0; n * index.chunk < index.count; n++) {
  const chunk = JSON.parse(fs.readFileSync(path.join(pub, `entries/${n}.json`), "utf8"));
  chunk.forEach((e, k) => {
    const row = index.words[n * index.chunk + k];
    if (!row || row[0] !== e.id) return fail(`chunk ${n} out of order at ${e.id}`);
    entries++;
    if (!Array.isArray(e.senses) || !e.senses.length || e.senses.some((s) => !(s.ja || s.zh))) fail(`no senses: ${e.id}`);
    if (!Array.isArray(e.ex) || !e.ex.length || e.ex.some((x) => !x.en || !(x.ja || x.zh))) fail(`bad examples: ${e.id}`);
    // Entries are moving from Chinese to Japanese: an entry without `ja` is still legacy. `zh` next to `ja`
    // is the optional 中文 view and is fine.
    if (e.senses.some((s) => !s.ja) || e.ex.some((x) => !x.ja)) warn.legacyChinese++;
    if (e.colZh !== undefined && (!Array.isArray(e.colZh) || e.colZh.length !== e.col.length)) fail(`colZh does not match col: ${e.id}`);
    if (e.tipZh !== undefined && typeof e.tipZh !== "string") fail(`bad tipZh: ${e.id}`);
    if (e.senses.some((s) => s.zh !== undefined && typeof s.zh !== "string")) fail(`bad sense zh: ${e.id}`);
    if (e.senses.some((s) => s.zh) || e.tipZh) warn.withChinese++;
    examples += e.ex.length;
    if (e.ex.length < 2) warn.oneExample++;
    if (!e.uk && !e.us) warn.missingIpa++;
    const stem = e.w.toLowerCase().split(" ")[0].replace(/(e|y)$/, "").slice(0, 5);
    if (e.ex[0] && !e.ex[0].en.toLowerCase().includes(stem)) warn.headwordNotInExample++;
    for (const k of ["col", "fam", "syn", "ant"]) if (!Array.isArray(e[k])) fail(`${k} not array: ${e.id}`);
    // Optional richer fields: absent is fine, present must be well-formed.
    if (e.senses.length > 5) fail(`more than 5 senses: ${e.id}`);
    if (e.senses.some((s) => !s.pos || (s.note !== undefined && typeof s.note !== "string"))) fail(`bad sense fields: ${e.id}`);
    if (e.syl !== undefined) {
      const flat = e.w.toLowerCase().replace(/[\s-]+/g, "");
      if (!Array.isArray(e.syl) || !e.syl.length || e.syl.some((s) => typeof s !== "string" || !s) || e.syl.join("").toLowerCase() !== flat) fail(`syl does not spell the word: ${e.id}`);
      warn.withSyllables++;
    }
    if (e.forms !== undefined) {
      if (!Array.isArray(e.forms) || e.forms.some((f) => !f.label || !f.form || /[\d/]/.test(f.form))) fail(`bad forms: ${e.id}`);
      warn.withForms++;
    }
    for (const k of ["gram", "etym"]) if (e[k] !== undefined && (typeof e[k] !== "string" || !e[k].trim())) fail(`bad ${k}: ${e.id}`);
    if (e.senses.length > 1) warn.multiSense++;
    // Heteronyms (use, wind, mouth...) legitimately list several readings, some tagged with a part of speech.
    if (!/^\/[^/]+\//.test(e.uk || "/x/") || !/^\/[^/]+\//.test(e.us || "/x/")) fail(`ipa not wrapped in /slashes/: ${e.id}`);
  });
}
if (entries !== index.count) fail(`entries ${entries} != count ${index.count}`);
if (examples !== index.examples) fail(`examples ${examples} != ${index.examples}`);

const bits = (b) => index.words.filter((r) => r[6] & b).length;
console.log(
  JSON.stringify(
    { words: index.count, examples, illustrated: bits(1), ukAudio: bits(2), usAudio: bits(4), sentenceAudio: bits(8), ieltsSentenceAudio: bits(16), warnings: warn, errors: errors.length },
    null,
    1,
  ),
);
if (process.argv.includes("--strict") && warn.legacyChinese) errors.push(`${warn.legacyChinese} entries still carry Chinese (zh) text`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
