"""Validate enrichment patches and merge them into the dataset.

Usage: python3 scripts/atlas/apply_enrichment.py PATH [--dry-run]
PATH is a patch file or a directory of them (default: .local/forge/enrich).
A patch is {"id", "syl", "senses", "forms", "gram", "etym", "etym_confidence"}; every key but id is optional.
Patches with errors are skipped and listed; warnings are printed for review.
"""
import argparse
import json
import pathlib

from common import FORGE
from dataset import load, save
from enrich_lib import check_patch, load_patches, merge_patch, youdao_cache


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default=str(FORGE / "enrich"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    index, entries = load()
    by_id = {e["id"]: e for e in entries}
    yd = youdao_cache()
    ok = skipped = 0
    report = []
    for patch in load_patches(pathlib.Path(a.path)):
        e = by_id.get(patch.get("id"))
        if not e:
            report.append({"id": patch.get("id"), "errors": ["unknown id"], "warnings": []})
            skipped += 1
            continue
        errs, warns = check_patch(e, patch, yd.get(e["id"]))
        if errs:
            skipped += 1
        else:
            merge_patch(e, patch)
            ok += 1
        if errs or warns:
            report.append({"id": e["id"], "errors": errs, "warnings": warns})
    FORGE.mkdir(parents=True, exist_ok=True)
    (FORGE / "enrich-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(f"applied {ok}, skipped {skipped}; report: {FORGE / 'enrich-report.json'}")
    for r in report[:20]:
        print(r["id"], "ERR" if r["errors"] else "warn", r["errors"] or r["warnings"])
    if not a.dry_run and ok:
        save(index, entries)


if __name__ == "__main__":
    main()
