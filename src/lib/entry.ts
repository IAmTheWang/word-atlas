import type { Entry, Sense } from "../atlas/types";

export interface SenseGroup {
  pos: string;
  senses: Sense[];
}

/** Group senses by part of speech, keeping the order in which each part of speech first appears. */
export function groupSenses(senses: Sense[]): SenseGroup[] {
  const groups: SenseGroup[] = [];
  for (const s of senses) {
    const g = groups.find((x) => x.pos === s.pos);
    if (g) g.senses.push(s);
    else groups.push({ pos: s.pos, senses: [s] });
  }
  return groups;
}

/** Small labels shown beside a sense: grammar first, then register. */
export function senseTags(s: Sense): string[] {
  return [s.gram, s.reg].filter((x): x is string => !!x && x.trim().length > 0);
}

/** Syllables as one display string: "ab·an·don". Empty for one-syllable words, or when the split is missing or does not match the word. */
export function syllables(word: string, syl?: string[]): string {
  if (!syl || syl.length < 2) return "";
  const joined = syl.join("");
  if (joined.toLowerCase() !== word.toLowerCase().replace(/[\s-]+/g, "")) return "";
  return syl.join("·");
}

/** Which language the explanation of one word is shown in: Japanese by default, Chinese on request. */
export type Lang = "ja" | "zh";

/** True when an entry carries Chinese text, so the 中文 tab is worth offering. */
export function hasChinese(e: Entry): boolean {
  return e.senses.some((s) => !!s.zh) || !!e.tipZh || e.ex.some((x) => !!x.zh) || !!e.colZh?.length;
}

const TAG_ZH: Record<string, string> = {
  可算: "可数",
  不可算: "不可数",
  "可算/不可算": "可数/不可数",
  他動詞: "及物",
  自動詞: "不及物",
  "他動詞/自動詞": "及物/不及物",
  単数形: "单数",
  複数形: "复数",
  受動態で多用: "常用被动",
  進行形で多用: "常用进行时",
  口語: "口语",
  文語: "书面",
  フォーマル: "正式",
  米: "美",
  英: "英",
  比喩: "比喻",
  古風: "旧式",
  俗語: "俚语",
  専門: "专业",
  軽蔑: "贬义",
  称賛: "褒义",
  婉曲: "委婉",
};

const FORM_ZH: Record<string, string> = {
  複数形: "复数",
  過去形: "过去式",
  過去分詞: "过去分词",
  現在分詞: "现在分词",
  三人称単数現在: "第三人称单数",
  比較級: "比较级",
  最上級: "最高级",
  名詞形: "名词形式",
  その他: "其他",
};

/** Grammar and register tags, and inflection labels, are stored in Japanese; translate them for the 中文 view. */
export const tagText = (t: string, lang: Lang) => (lang === "zh" ? TAG_ZH[t] ?? t : t);
export const formLabel = (t: string, lang: Lang) => (lang === "zh" ? FORM_ZH[t] ?? t : t);
