"""Bring the original Chinese text back as the optional 中文 view of each entry.

Usage: python3 scripts/atlas/restore_zh.py [--from COMMIT] [--dry-run]
Reads data/word-atlas.json as it was at COMMIT (before the Japanese rewrite) and adds, next to the Japanese:
  senses[].zh, ex[].zh, colZh[], tipZh
Senses are paired only when the part-of-speech sequence is identical to the old one (a rewrite may have
added, removed or reordered meanings); otherwise only the first sense is paired, if its part of speech
matches. Unpaired senses simply have no Chinese and the 中文 view shows their English definition.
"""
import argparse
import json
import subprocess

from common import ROOT
from dataset import load, save


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="commit", default="c70d57d2")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    old = {w["id"]: w for w in json.loads(subprocess.check_output(["git", "show", f"{a.commit}:data/word-atlas.json"], cwd=ROOT))}
    index, entries = load()
    paired = partial = skipped = 0
    for e in entries:
        o = old.get(e["id"])
        if not o or not any("zh" in s for s in o["senses"]):
            skipped += 1
            continue
        if not all("ja" in s for s in e["senses"]):
            continue  # still legacy Chinese in `zh`; nothing to restore
        same = [s["pos"] for s in e["senses"]] == [s["pos"] for s in o["senses"]]
        for i, s in enumerate(e["senses"]):
            if i < len(o["senses"]) and o["senses"][i]["pos"] == s["pos"] and (same or i == 0):
                s.setdefault("zh", o["senses"][i]["zh"])
        paired += same
        partial += not same
        for x, ox in zip(e["ex"], o["ex"]):
            if ox.get("zh"):
                x.setdefault("zh", ox["zh"])
        if len(o["col"]) == len(e["col"]) and all("｜" in c for c in o["col"]):
            e.setdefault("colZh", [c.partition("｜")[2].strip() for c in o["col"]])
        if o.get("tip"):
            e.setdefault("tipZh", o["tip"])
    print(f"entries with all senses paired: {paired}, first sense only: {partial}, no old Chinese: {skipped}")
    if not a.dry_run:
        save(index, entries)


if __name__ == "__main__":
    main()
