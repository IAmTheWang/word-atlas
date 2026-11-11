export type Accent = "uk" | "us";

/** Compact row from atlas/index.json: [id, word, ja, ipa, cefr, topic, media]. */
export type IndexRow = [string, string, string, string, number, number, number];

export interface Sense {
  pos: string;
  /** Japanese meaning. */
  ja: string;
  en: string;
  /** Shade of meaning, scope or typical context. */
  note?: string;
  /** Grammar label for this sense: 可算, 不可算, 他動詞, 自動詞... */
  gram?: string;
  /** Register or variety: 口語, 文語, 米, 英, 比喩, 古風... */
  reg?: string;
}

/** One inflected form, e.g. { label: "過去形", form: "led" }. */
export interface WordForm {
  label: string;
  form: string;
  note?: string;
}

export interface Example {
  en: string;
  /** Japanese translation. */
  ja: string;
}

export interface Entry {
  id: string;
  w: string;
  uk: string;
  us: string;
  senses: Sense[];
  ex: Example[];
  col: string[];
  fam: string[];
  syn: string[];
  ant: string[];
  tip: string;
  cefr: string;
  topic: string;
  /** Usage caution (register, offensiveness, spelling), shown with the entry. */
  note?: string;
  /** Syllable split of the headword, e.g. ["a", "ban", "don"]. */
  syl?: string[];
  /** Inflections: plural, past tense, comparative... */
  forms?: WordForm[];
  /** One-line grammar remark for irregular or surprising behaviour. */
  gram?: string;
  /** Etymology, only present when it is reliable. */
  etym?: string;
  /** Media bit flags, see MEDIA. */
  m: number;
  /** Absolute media URLs for datasets that do not follow the atlas layout. */
  media?: { img?: string | null; uk?: string | null; us?: string | null; ex?: string | null; ex2?: string | null };
}

export const MEDIA = { img: 1, uk: 2, us: 4, ex: 8, ex2: 16 } as const;

export interface WordRef {
  id: string;
  word: string;
  /** Part of speech and first Japanese meaning, e.g. "n. 鳩". */
  ja: string;
  ipa: string;
  cefr: number;
  topic: number;
  media: number;
  /** Position in the learning path. */
  order: number;
}

export interface Atlas {
  id: string;
  name: string;
  kind: "open" | "private";
  count: number;
  examples: number;
  illustrated: number;
  topics: [string, string][];
  cefr: string[];
  words: WordRef[];
  byId: Map<string, WordRef>;
  /** Loads full entries; chunked for the open atlas, in-memory for private sets. */
  entry: (id: string) => Promise<Entry>;
  peek: (id: string) => Entry | undefined;
  img: (ref: WordRef | Entry, size?: "thumb" | "full") => string | null;
  audio: (ref: WordRef | Entry, kind: "uk" | "us" | "ex" | "ex2") => string | null;
}
