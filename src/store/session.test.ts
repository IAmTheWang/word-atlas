import assert from "node:assert/strict";
import { test } from "node:test";
import { MEDIA, type WordRef } from "../atlas/types";
import { kindAllowed, quizKind, retryKind } from "./session";
import { emptyProgress, type Progress, type QuizKind } from "./store";

const ref = (i: number, media: number = MEDIA.img): WordRef => ({ id: `w${i}`, word: `word${i}`, ja: "n. 語", ipa: "", cefr: 1, topic: 0, media, order: i });
const base = { quiet: false, noArt: false, spell: true };
const young = emptyProgress("t");
// Stability 3 days: past the first look, not yet a spelling candidate by stability alone.
const seasoned = (id: string): Progress => ({ ...emptyProgress("t"), cards: { [id]: { due: 1, s: 3, d: 5, el: 0, sd: 1, ls: 0, reps: 5, lapses: 0, st: 2, seen: 1 } } });

function kinds(settings: typeof base, progress: (id: string) => Progress = () => young) {
  const seen = new Set<QuizKind>();
  for (let i = 0; i < 600; i++) seen.add(quizKind(ref(i), progress(`w${i}`), settings, i * 7));
  return seen;
}

test("work mode never asks listening questions", () => {
  assert.equal(kinds({ ...base, quiet: true }).has("listen"), false);
  assert.equal(kinds({ ...base, quiet: true }, (id) => seasoned(id)).has("listen"), false);
});

test("no-art mode never asks picture questions", () => {
  assert.equal(kinds({ ...base, noArt: true }).has("picture"), false);
  assert.equal(kinds({ ...base, noArt: true }, (id) => seasoned(id)).has("picture"), false);
});

test("with both off, only text questions remain and every word still gets one", () => {
  const seen = kinds({ ...base, quiet: true, noArt: true }, (id) => seasoned(id));
  assert.deepEqual([...seen].sort(), ["cloze", "define", "meaning", "spell"]);
});

test("the default mix includes the new text questions", () => {
  const seen = kinds(base);
  assert.equal(seen.has("cloze"), true);
  assert.equal(seen.has("define"), true);
});

test("words without an illustration never get a picture question", () => {
  assert.equal(kindAllowed("picture", { media: 0 }, base), false);
});

test("a missed word comes back in another allowed format", () => {
  assert.equal(retryKind("meaning", { media: MEDIA.img }, { ...base, quiet: true, noArt: true }), "cloze");
  assert.equal(retryKind("cloze", { media: MEDIA.img }, base), "meaning");
});
