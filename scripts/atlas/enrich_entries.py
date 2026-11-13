"""Ask the model for richer explanations of existing entries, written as patches.

Usage: python3 scripts/atlas/enrich_entries.py [--ids a,b,c | --sample 100 | --min-level B2] [--workers 4] [--batch 10]
Output: .local/forge/enrich/<batch>.json  (resumable). Review, then:
        python3 scripts/atlas/apply_enrichment.py
Needs SUB2_BASE_URL / SUB2_API_KEY like gen_text.py. The model sees the current entry so new text stays
consistent with it, and the prompt forbids copying any dictionary; accuracy beats coverage.
"""
import argparse
import concurrent.futures as cf
import hashlib
import json
import re
import sys

from common import FORGE, load_env, stream_chat, with_retry
from dataset import CEFR, load
from enrich_lib import FORM_LABELS, GRAM, POS, REG, check_patch, youdao_cache

SYSTEM = f"""You are the lead lexicographer of an open-source English vocabulary atlas for Japanese-speaking learners of English (IELTS band 5.5-7.5).
You receive existing entries (currently explained in Chinese) and return the learner-facing text rewritten in natural JAPANESE, plus richer fields.
The main text is Japanese and English. Chinese appears ONLY in the fields named *zh* below, which feed an optional 中文 view; never put Chinese anywhere else. Write ORIGINAL wording; never copy any dictionary (Weblio, Eijiro, Youdao, Collins...).
Accuracy beats coverage: leave a field out when you are not sure. Return strict JSON only: {{"patches":[...]}}, one per input entry, same order:
{{
 "id": "same id as input",
 "syl": ["syllable","split"],   // orthographic syllables; they must join to the headword exactly (no spaces); for a phrase, one item per word
 "senses": [ {{"pos": one of {sorted(POS)}, "ja": "日本語の語義。簡潔に、近い意味は「、」で区切る ≤30字", "en": "learner English definition, ≤18 words, not using the headword",
              "note": "任意 ≤60字の日本語: ニュアンス、使われる場面、類義語との違い",
              "gram": "任意, one of {sorted(GRAM)}", "reg": "任意, one of {sorted(REG)}"}} ],
 "zh" inside each sense: "简体中文释义 ≤16字" (same meaning as that sense's ja),
 "ex_zh": ["中文翻译 of example 1", "中文翻译 of example 2"],  // same count and order as ex_ja
 "col_zh": ["中文 part only of each collocation", ...],  // same count and order as col
 "tip_zh": "≤45字的简体中文用法提示 (same content as tip)",
 "ex_ja": ["translation of example 1 into natural Japanese", "translation of example 2 into natural Japanese"],  // same count and order as the input examples
 "col": ["english phrase｜日本語訳", ...],  // the same English phrases in the same order as the input, with Japanese after ｜
 "tip": "≤60字の日本語: 最も役立つ用法・使い分け・覚え方。語源は確実なときだけ",
 "note": "optional usage caution in Japanese, only if the input had one (keep its meaning)",
 "forms": [ {{"label": one of {sorted(FORM_LABELS)}, "form": "the inflected word", "note": "任意の短い日本語"}} ],
 "gram": "任意 ≤80字の日本語: 不規則変化や間違えやすい点があるときだけ (例: 別の動詞の過去形と同形)",
 "etym": "任意 ≤90字の日本語の語源", "etym_confidence": "high only if you are certain; otherwise omit etym entirely"
}}
Rules:
- Cover every common meaning a learner will meet, up to 5 senses, most useful first. Keep the existing first sense's part of speech and core meaning first.
- Include a sense for a surprising common use (e.g. 'dove' = US past tense of 'dive').
- gram/reg tags are about THAT sense; do not invent tags to fill space. Use the exact tag strings listed.
- forms: list real inflections only (regular ones too); put US/UK variants in note. Use [] for words that do not inflect.
- Style: standard dictionary Japanese (見出し語の訳は名詞・動詞の基本形). Use kana where natural; do not mix in Chinese words or simplified characters.
- No etymology unless you are certain it is correct. Never invent one."""


def brief(e):
    s = "; ".join(f'{x["pos"]} {x.get("ja") or x.get("zh", "")}' for x in e["senses"])
    ex = " || ".join(x["en"] for x in e["ex"])
    return f'- id={e["id"]}  word={e["w"]}  level={e["cefr"]}  current senses: {s}\n  examples: {ex}\n  col: {e["col"]}  tip: {e["tip"]}  note: {e.get("note", "")}'


def run_batch(env, model, idx, batch, outdir, yd):
    out = outdir / f"{idx:04d}.json"
    if out.exists():
        return "cached"
    payload = {"model": model, "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": "Entries:\n" + "\n".join(brief(e) for e in batch)}]}

    def call():
        text = re.sub(r"^```(?:json)?|```$", "", stream_chat(env, payload).strip()).strip()
        patches = json.loads(text)["patches"]
        if [p.get("id") for p in patches] != [e["id"] for e in batch]:
            raise ValueError("ids do not match the batch")
        return patches

    patches = with_retry(call, tries=4, base=5)
    out.write_text(json.dumps(patches, ensure_ascii=False, indent=1))
    bad = sum(1 for e, p in zip(batch, patches) if check_patch(e, p, yd.get(e["id"]))[0])
    return f"ok ({bad} with errors)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", default="")
    ap.add_argument("--sample", type=int, default=0, help="deterministic sample of N entries across levels")
    ap.add_argument("--min-level", default="")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--batch", type=int, default=10)
    ap.add_argument("--model", default="gpt-6")
    a = ap.parse_args()
    env = load_env()
    _, entries = load()
    if a.ids:
        want = set(a.ids.split(","))
        entries = [e for e in entries if e["id"] in want]
    if a.min_level:
        entries = [e for e in entries if CEFR.index(e["cefr"]) >= CEFR.index(a.min_level)]
    if a.sample:
        entries = sorted(entries, key=lambda e: hashlib.sha1(e["id"].encode()).hexdigest())[: a.sample]
    outdir = FORGE / "enrich"
    outdir.mkdir(parents=True, exist_ok=True)
    yd = youdao_cache()
    batches = [entries[i : i + a.batch] for i in range(0, len(entries), a.batch)]
    # Name batches by their first id so reruns with a different selection never collide.
    names = [int(hashlib.sha1(b[0]["id"].encode()).hexdigest()[:6], 16) for b in batches]
    with cf.ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(run_batch, env, a.model, n, b, outdir, yd): n for n, b in zip(names, batches)}
        for f in cf.as_completed(futs):
            try:
                print(futs[f], f.result(), flush=True)
            except Exception as e:
                print("FAIL", futs[f], str(e)[:200], flush=True)


if __name__ == "__main__":
    sys.exit(main())
