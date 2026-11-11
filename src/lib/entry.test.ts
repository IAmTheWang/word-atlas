import assert from "node:assert/strict";
import { test } from "node:test";
import { groupSenses, senseTags, syllables } from "./entry";

test("groups senses by part of speech in order of first appearance", () => {
  const g = groupSenses([
    { pos: "n.", ja: "鳩", en: "" },
    { pos: "v.", ja: "diveの過去形", en: "" },
    { pos: "n.", ja: "ハト派", en: "" },
  ]);
  assert.deepEqual(g.map((x) => [x.pos, x.senses.length]), [["n.", 2], ["v.", 1]]);
});

test("shows grammar and register tags, skipping blanks", () => {
  assert.deepEqual(senseTags({ pos: "n.", ja: "x", en: "", gram: "可数", reg: " " }), ["可数"]);
  assert.deepEqual(senseTags({ pos: "n.", ja: "x", en: "" }), []);
});

test("only shows syllables that spell the headword", () => {
  assert.equal(syllables("abandon", ["a", "ban", "don"]), "a·ban·don");
  assert.equal(syllables("abandon", ["a", "ban"]), "");
  assert.equal(syllables("day off", ["day", "off"]), "day·off");
  assert.equal(syllables("dove", undefined), "");
  assert.equal(syllables("dove", ["dove"]), "");
});
