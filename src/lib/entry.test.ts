import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry } from "../atlas/types";
import { formLabel, groupSenses, hasChinese, senseTags, syllables, tagText } from "./entry";

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

test("offers the Chinese tab only when an entry has Chinese text", () => {
  const base = { id: "a", w: "a", senses: [{ pos: "n.", ja: "あ", en: "" }], ex: [{ en: "a", ja: "あ" }], col: [] } as unknown as Entry;
  assert.equal(hasChinese(base), false);
  assert.equal(hasChinese({ ...base, tipZh: "提示" }), true);
  assert.equal(hasChinese({ ...base, senses: [{ pos: "n.", ja: "あ", zh: "啊", en: "" }] }), true);
});

test("translates grammar tags and form labels for the Chinese view", () => {
  assert.equal(tagText("他動詞/自動詞", "zh"), "及物/不及物");
  assert.equal(tagText("他動詞/自動詞", "ja"), "他動詞/自動詞");
  assert.equal(formLabel("過去形", "zh"), "过去式");
  assert.equal(formLabel("未知", "zh"), "未知");
});
