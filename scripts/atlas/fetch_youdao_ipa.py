"""Fetch UK / US phonetics from Youdao for every headword (IPA strings only).

Usage: python3 scripts/atlas/fetch_youdao_ipa.py [--limit N] [--ids a,b,c] [--delay 0.4]
Output: .local/forge/youdao.json  {id: {"uk": "dʌv", "us": "dʌv", "forms": ["doves"]}}  (resumable; entries whose
returned word differs from the query are stored as {"mismatch": "..."} and ignored)

Only pronunciations are meant to enter the dataset; `forms` is stored so enrichment can be
cross-checked, never copied. This uses an unofficial endpoint: keep the rate low, run it
sparingly, and note the source in docs/pipeline.md.
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request

from common import FORGE
from dataset import load

URL = "https://dict.youdao.com/jsonapi?le=en&q="
OUT = FORGE / "youdao.json"


def fetch(word):
    """Phonetics and inflections for `word`, or {"mismatch": ...} when the service answered about another word.

    The sibling endpoint `jsonapi_s` was found to return unrelated words for some queries, so the
    echoed `input` must equal the query before anything is trusted.
    """
    req = urllib.request.Request(URL + urllib.parse.quote(word), headers={"User-Agent": "Mozilla/5.0 (word-atlas ipa check)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read())
    echoed = str(data.get("input") or "").strip().lower()
    if echoed != word.strip().lower():
        return {"mismatch": echoed}
    simple = ((data.get("simple") or {}).get("word") or [{}])[0]
    ec = ((data.get("ec") or {}).get("word") or [{}])
    ec = ec[0] if isinstance(ec, list) and ec else (ec if isinstance(ec, dict) else {})
    uk = (simple.get("ukphone") or ec.get("ukphone") or "").strip()
    us = (simple.get("usphone") or ec.get("usphone") or "").strip()
    forms = [(wf.get("wf") or {}).get("value") for wf in ec.get("wfs") or []]
    return {"uk": uk, "us": us, "forms": [f for f in forms if f]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--ids", default="")
    ap.add_argument("--delay", type=float, default=0.4)
    ap.add_argument("--force", action="store_true", help="refetch ids even if cached")
    a = ap.parse_args()
    _, entries = load()
    if a.ids:
        want = set(a.ids.split(","))
        entries = [e for e in entries if e["id"] in want]
    FORGE.mkdir(parents=True, exist_ok=True)
    got = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [e for e in entries if a.force or e["id"] not in got]
    if a.limit:
        todo = todo[: a.limit]
    fails = 0
    for i, e in enumerate(todo, 1):
        try:
            got[e["id"]] = fetch(e["w"])
        except Exception as ex:  # network or parse error: leave it out so a rerun retries
            fails += 1
            print("FAIL", e["id"], str(ex)[:120], flush=True)
            if fails >= 25:
                print("too many failures, stopping")
                break
            time.sleep(5)
            continue
        if i % 50 == 0:
            OUT.write_text(json.dumps(got, ensure_ascii=False))
            print(f"{i}/{len(todo)}", flush=True)
        time.sleep(a.delay)
    OUT.write_text(json.dumps(got, ensure_ascii=False))
    print(f"fetched {len(got)} total, {fails} failures")


if __name__ == "__main__":
    sys.exit(main())
