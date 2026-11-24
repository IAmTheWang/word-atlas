"""Add newly written headwords to the published dataset (text only: no illustration or audio yet).

Usage: python3 scripts/atlas/add_entries.py --src DIR [--youdao FILE] [--cefr B2] [--dry-run]
  DIR      holds out_NN.json files, each a list of entries:
           {w, uk, us, senses[{pos, ja, en, zh, gram?, reg?, note?}], ex[{en, ja, zh}] x2, col[], col_zh[],
            fam[], syn[], ant[], tip, tip_zh, topic, note, syl[], forms[], gram?}
  FILE     optional Youdao cache {id: {uk, us}} (see fetch_youdao_ipa.py); its phonetics replace the generated ones
New entries get media flag 0 (the app only offers picture / listening quizzes for words that have the media),
are spread evenly through the block of their CEFR level, and topics are interleaved so neighbours differ.
Run `bun run check:atlas` afterwards.
"""
import argparse
import json
import re
import sys
from collections import defaultdict, deque

from apply_ipa import norm, valid
from dataset import CEFR, load, save


def build(raw, cefr):
    """Turn a generated entry into the published entry shape."""
    senses = []
    for s in raw["senses"]:
        keep = {"pos": s["pos"].strip(), "ja": s["ja"].strip(), "en": s["en"].strip()}
        for k in ("note", "gram", "reg", "zh"):
            if s.get(k) and s[k].strip():
                keep[k] = s[k].strip()
        senses.append(keep)
    ex = [{"en": x["en"].strip(), "ja": x["ja"].strip(), "zh": x["zh"].strip()} for x in raw["ex"]]
    e = {
        "w": raw["w"],
        "uk": raw["uk"].strip(),
        "us": raw["us"].strip(),
        "senses": senses,
        "ex": ex,
        "col": [c.strip() for c in raw["col"]],
        "fam": raw.get("fam", []),
        "syn": raw.get("syn", []),
        "ant": raw.get("ant", []),
        "tip": raw["tip"].strip(),
        "cefr": cefr,
        "topic": raw["topic"],
        "note": (raw.get("note") or "").strip(),
        "id": raw["w"].lower(),
        "syl": raw["syl"],
    }
    if raw.get("forms"):
        e["forms"] = [{k: f[k].strip() for k in ("label", "form", "note") if f.get(k) and f[k].strip()} for f in raw["forms"]]
    if raw.get("gram") and raw["gram"].strip():
        e["gram"] = raw["gram"].strip()
    e["colZh"] = [c.strip() for c in raw["col_zh"]]
    e["tipZh"] = raw["tip_zh"].strip()
    e["m"] = 0
    return e


def interleave_topics(items):
    """Round-robin over topics so neighbouring new words rarely share a topic."""
    buckets = defaultdict(deque)
    for e in items:
        buckets[e["topic"]].append(e)
    out = []
    while any(buckets.values()):
        for t in sorted(buckets, key=lambda k: -len(buckets[k])):
            if buckets[t]:
                out.append(buckets[t].popleft())
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--youdao", default="")
    ap.add_argument("--cefr", default="B2")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    from pathlib import Path

    raws = []
    for f in sorted(Path(a.src).glob("out_[0-9][0-9].json")):
        raws.extend(json.loads(f.read_text(encoding="utf-8")))
    youdao = json.loads(Path(a.youdao).read_text()) if a.youdao else {}

    index, entries = load()
    have = {e["id"] for e in entries}
    new = []
    ipa_from_youdao = 0
    for raw in raws:
        e = build(raw, a.cefr)
        if e["id"] in have:
            sys.exit(f"duplicate id {e['id']}")
        have.add(e["id"])
        y = youdao.get(e["id"]) or {}
        for k in ("uk", "us"):
            cand = norm(y.get(k))
            if cand and valid(cand) and e[k].count("/") <= 2:
                if cand != e[k]:
                    ipa_from_youdao += 1
                e[k] = cand
        new.append(e)
    new = interleave_topics(new)

    block = [i for i, e in enumerate(entries) if e["cefr"] == a.cefr]
    if not block or block != list(range(block[0], block[-1] + 1)):
        sys.exit(f"{a.cefr} entries are not one contiguous block")
    start, n_old, n_new = block[0], len(block), len(new)
    merged = entries[:start]
    old = entries[start : start + n_old]
    rows_old = index["words"][start : start + n_old]
    topics = [t[0] for t in index["topics"]]
    rows = index["words"][:start]
    j = 0
    for i, (e, r) in enumerate(zip(old, rows_old), 1):
        merged.append(e)
        rows.append(r)
        while j < n_new and (j + 1) * n_old <= i * n_new:  # spread new words evenly through the block
            merged.append(new[j])
            s0 = new[j]["senses"][0]
            rows.append([new[j]["id"], new[j]["w"], f'{s0["pos"]} {s0["ja"]}', new[j]["uk"] or new[j]["us"], CEFR.index(a.cefr), topics.index(new[j]["topic"]), 0])
            j += 1
    assert j == n_new, (j, n_new)
    merged += entries[start + n_old :]
    rows += index["words"][start + n_old :]
    index["words"] = rows
    index["count"] = len(merged)
    print(f"adding {n_new} {a.cefr} entries ({ipa_from_youdao} phonetics taken from Youdao); total {len(entries)} -> {len(merged)}")
    if not a.dry_run:
        save(index, merged)


if __name__ == "__main__":
    main()
