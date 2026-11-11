"""Write Youdao phonetics into the dataset (uk / us), keeping the old value when Youdao has none.

Usage: python3 scripts/atlas/apply_ipa.py [--dry-run]
Input:  .local/forge/youdao.json (from fetch_youdao_ipa.py)
Output: rewrites entries, index, data/*.json|csv; writes .local/forge/ipa-diff.json with every change.
"""
import argparse
import json
import re

from common import FORGE
from dataset import load, save

IPA_PART = re.compile(r"^[^/\s;]+$")


def norm(p):
    """Youdao returns bare phonetics such as 'dʌv', or 'a;b' for several readings.

    The dataset stores them in slashes, several readings as '/a/, /b/'.
    """
    parts = [re.sub(r"\s+", "", x.strip().strip("/")) for x in (p or "").split(";")]
    parts = [x for x in parts if x]
    return ", ".join(f"/{x}/" for x in parts)


def valid(ipa):
    return bool(ipa) and all(IPA_PART.match(x.strip().strip("/")) for x in ipa.split(", "))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    index, entries = load()
    got = json.loads((FORGE / "youdao.json").read_text())
    diff, missing, bad, kept_multi = [], 0, 0, []
    for e in entries:
        y = got.get(e["id"])
        if not y or not (y.get("uk") or y.get("us")):
            missing += 1
            continue
        for k in ("uk", "us"):
            new = norm(y.get(k))
            if not new:
                continue
            if not valid(new):
                bad += 1
                continue
            if e[k].count("/") > 2:  # heteronym with several readings: Youdao gives one, so keep ours
                kept_multi.append(e["id"])
                continue
            if new != e[k]:
                diff.append({"id": e["id"], "accent": k, "old": e[k], "new": new})
                e[k] = new
    FORGE.mkdir(parents=True, exist_ok=True)
    (FORGE / "ipa-diff.json").write_text(json.dumps(diff, ensure_ascii=False, indent=1))
    print(f"changed {len(diff)} values, {missing} words not found at Youdao (kept), {bad} malformed (skipped), {len(set(kept_multi))} multi-reading words kept")
    if not a.dry_run:
        save(index, entries)


if __name__ == "__main__":
    main()
