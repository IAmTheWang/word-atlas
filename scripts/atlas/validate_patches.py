"""Check patch files without touching the dataset: python3 scripts/atlas/validate_patches.py FILE_OR_DIR [--ids ids.json]

Prints every error and ends with 'OK n' or 'ERRORS n'. With --ids, also requires exactly those ids in that order.
"""
import json
import pathlib
import sys

from dataset import load
from enrich_lib import check_patch, load_patches, youdao_cache


def main():
    args = sys.argv[1:]
    path = pathlib.Path(args[0])
    want = json.loads(pathlib.Path(args[args.index("--ids") + 1]).read_text()) if "--ids" in args else None
    _, entries = load()
    by = {e["id"]: e for e in entries}
    yd = youdao_cache()
    patches = load_patches(path)
    bad = 0
    if want is not None and [p.get("id") for p in patches] != want:
        print("ids differ from the expected list/order")
        bad += 1
    for p in patches:
        e = by.get(p.get("id"))
        if not e:
            print(p.get("id"), "unknown id")
            bad += 1
            continue
        errs, _ = check_patch(e, p, yd.get(e["id"]))
        for m in errs:
            print(p["id"], m)
        bad += bool(errs)
    print(("ERRORS " if bad else "OK ") + str(bad or len(patches)))
    sys.exit(1 if bad else 0)


main()
