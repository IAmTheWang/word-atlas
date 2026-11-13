"""Read and rewrite the published dataset consistently.

The published files describe the same entries in four places, and they must never drift apart:
  public/atlas/entries/<n>.json   full entries (source of truth here, carries media flags `m`)
  public/atlas/index.json         compact rows: [id, word, zh, ipa, cefr, topic, media]
  data/word-atlas.json            developer download (entries without `m`)
  data/word-atlas.csv             flat table of the same
Scripts that patch existing entries (IPA, enrichment) load with `load()`, edit, then `save()`.
"""
import csv
import json

from common import ROOT

PUB = ROOT / "public" / "atlas"
DATA = ROOT / "data"
CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]

# Fields added after the first release; kept in this order after the original ones.
NEW_FIELDS = ("syl", "forms", "gram", "etym", "colZh", "tipZh")


def load():
    """Return (index_meta, entries) with entries in learning order."""
    index = json.loads((PUB / "index.json").read_text())
    entries = []
    for n in range(0, index["count"], index["chunk"]):
        entries.extend(json.loads((PUB / "entries" / f"{n // index['chunk']}.json").read_text()))
    if len(entries) != index["count"] or any(e["id"] != r[0] for e, r in zip(entries, index["words"])):
        raise SystemExit("entries and index.json are out of step; rebuild before patching")
    return index, entries


def save(index, entries):
    """Write all four published files from `entries`."""
    chunk = index["chunk"]
    for n in range(0, len(entries), chunk):
        (PUB / "entries" / f"{n // chunk}.json").write_text(
            json.dumps(entries[n : n + chunk], ensure_ascii=False, separators=(",", ":"))
        )
    rows = []
    for old, e in zip(index["words"], entries):
        s0 = e["senses"][0]
        rows.append([e["id"], e["w"], f'{s0["pos"]} {s0.get("ja") or s0.get("zh", "")}'.strip(), e["uk"] or e["us"], old[4], old[5], old[6]])
    index["words"] = rows
    index["examples"] = sum(len(e["ex"]) for e in entries)
    (PUB / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))

    public = [{k: v for k, v in e.items() if k != "m"} for e in entries]
    (DATA / "word-atlas.json").write_text(json.dumps(public, ensure_ascii=False, indent=1))
    write_csv(public)


def write_csv(public):
    with open(DATA / "word-atlas.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "word", "ipa_uk", "ipa_us", "cefr", "topic", "meanings_ja", "definition_en",
                    "example1_en", "example1_ja", "example2_en", "example2_ja", "collocations", "word_family",
                    "synonyms", "antonyms", "tip_ja", "syllables", "forms", "grammar_note", "etymology",
                    "meanings_zh", "example1_zh", "example2_zh", "collocations_zh", "tip_zh"])
        for c in public:
            ex = c["ex"] + [{"en": "", "ja": ""}] * (2 - len(c["ex"]))
            jp = lambda x: x.get("ja") or x.get("zh", "")
            w.writerow([c["id"], c["w"], c["uk"], c["us"], c["cefr"], c["topic"],
                        " | ".join(f'{s["pos"]} {jp(s)}' for s in c["senses"]),
                        " | ".join(s["en"] for s in c["senses"]),
                        ex[0]["en"], jp(ex[0]), ex[1]["en"], jp(ex[1]),
                        " ; ".join(c["col"]), " ; ".join(c["fam"]),
                        ", ".join(c["syn"]), ", ".join(c["ant"]), c["tip"],
                        "·".join(c.get("syl") or []),
                        " | ".join(f'{x["label"]}: {x["form"]}' for x in c.get("forms") or []),
                        c.get("gram") or "", c.get("etym") or "",
                        " | ".join(f'{s["pos"]} {s["zh"]}' for s in c["senses"] if s.get("zh")),
                        ex[0].get("zh", ""), ex[1].get("zh", ""),
                        " ; ".join(c.get("colZh") or []), c.get("tipZh") or ""])
