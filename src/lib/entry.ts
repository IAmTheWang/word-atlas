import type { Sense } from "../atlas/types";

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
