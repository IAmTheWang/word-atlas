"""Validation and merging for Japanese entry patches.

A patch rewrites the learner-facing text of one entry in Japanese and adds the richer fields
(syllables, more senses, forms, grammar remark, etymology). Fields:
  id, syl, senses[{pos, ja, en, note?, gram?, reg?}], ex_ja[2], col[], tip, note, forms[], gram, etym, etym_confidence
Every key but id is optional. Merging a patch that carries `senses` / `ex_ja` removes the old Chinese `zh` fields.
"""
import json
import re

from common import FORGE

POS = {"n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.", "phr.", "num.", "int.", "det.", "aux.", "abbr."}
FORM_LABELS = {"複数形", "過去形", "過去分詞", "現在分詞", "三人称単数現在", "比較級", "最上級", "名詞形", "その他"}
GRAM = {"可算", "不可算", "可算/不可算", "他動詞", "自動詞", "他動詞/自動詞", "単数形", "複数形", "受動態で多用", "進行形で多用"}
REG = {"口語", "文語", "フォーマル", "米", "英", "比喩", "古風", "俗語", "専門", "軽蔑", "称賛", "婉曲"}

KANA = re.compile(r"[぀-ヿ]")
HAN = re.compile(r"[一-鿿]")
# Characters that exist only in simplified Chinese: their presence means Chinese leaked into the Japanese text.
# Only glyphs whose Japanese form differs (国 or 会 are shared with Japanese and must not be listed).
SIMPLIFIED = set("们个这为说话时过还进动对务应开关发长门问间题见现认让设语读请谈连运远选")


def _japanese(text, need_kana=True):
    """Return an error string when `text` is not plausibly Japanese."""
    if not text or not text.strip():
        return "empty"
    if need_kana and HAN.search(text) and not KANA.search(text):
        return "has kanji but no kana (looks Chinese)"
    bad = sorted({c for c in text if c in SIMPLIFIED})
    if bad:
        return f"simplified-Chinese characters {bad}"
    return None


def _chinese(text):
    """Return an error string when `text` is not plausibly Chinese (the optional 中文 view)."""
    if not text or not text.strip():
        return "empty"
    if KANA.search(text):
        return "contains kana (looks Japanese)"
    if not HAN.search(text):
        return "no Chinese characters"
    return None


def check_patch(entry, patch, youdao=None):
    """Return (errors, warnings). Errors mean the patch must not be applied."""
    errs, warns = [], []
    word = entry["w"]
    syl = patch.get("syl")
    if syl is not None:
        flat = re.sub(r"[\s-]+", "", word).lower()
        if not (isinstance(syl, list) and syl and all(isinstance(s, str) and s for s in syl)):
            errs.append("syl must be a non-empty list of strings")
        elif "".join(syl).lower() != flat:
            errs.append(f"syl {syl} does not spell {word}")
    senses = patch.get("senses")
    if senses is not None:
        if not isinstance(senses, list) or not 1 <= len(senses) <= 5:
            errs.append("senses must hold 1-5 items")
        else:
            for i, s in enumerate(senses):
                if s.get("pos") not in POS:
                    errs.append(f"sense {i}: bad pos {s.get('pos')!r}")
                e = _japanese(s.get("ja"), need_kana=False)
                if e or len(s.get("ja", "")) > 40:
                    errs.append(f"sense {i}: ja {e or 'longer than 40 chars'}")
                if s.get("zh"):
                    e = _chinese(s["zh"])
                    if e or len(s["zh"]) > 30:
                        errs.append(f"sense {i}: zh {e or 'longer than 30 chars'}")
                if not s.get("en") or len(s["en"].split()) > 22:
                    errs.append(f"sense {i}: en missing or longer than 22 words")
                if s.get("note"):
                    e = _japanese(s["note"])
                    if e or len(s["note"]) > 80:
                        errs.append(f"sense {i}: note {e or 'longer than 80 chars'}")
                if s.get("gram") and s["gram"] not in GRAM:
                    warns.append(f"sense {i}: unusual gram {s['gram']!r}")
                if s.get("reg") and s["reg"] not in REG:
                    warns.append(f"sense {i}: unusual reg {s['reg']!r}")
            first = senses[0]
            if first.get("pos") != entry["senses"][0]["pos"]:
                warns.append(f"first sense pos changed {entry['senses'][0]['pos']} -> {first.get('pos')}")
    ex = patch.get("ex_ja")
    if ex is not None:
        if not (isinstance(ex, list) and len(ex) == len(entry["ex"])):
            errs.append(f"ex_ja must have {len(entry['ex'])} items")
        else:
            for i, t in enumerate(ex):
                e = _japanese(t)
                if e:
                    errs.append(f"ex_ja {i}: {e}")
    exz = patch.get("ex_zh")
    if exz is not None:
        if not (isinstance(exz, list) and len(exz) == len(entry["ex"])):
            errs.append(f"ex_zh must have {len(entry['ex'])} items")
        else:
            for i, t in enumerate(exz):
                e = _chinese(t)
                if e:
                    errs.append(f"ex_zh {i}: {e}")
    colz = patch.get("col_zh")
    if colz is not None:
        if not (isinstance(colz, list) and len(colz) == len(entry["col"])):
            errs.append(f"col_zh must have {len(entry['col'])} items")
        else:
            for i, t in enumerate(colz):
                e = _chinese(t)
                if e:
                    errs.append(f"col_zh {i}: {e}")
    if patch.get("tip_zh"):
        e = _chinese(patch["tip_zh"])
        if e or len(patch["tip_zh"]) > 90:
            errs.append(f"tip_zh: {e or 'longer than 90 chars'}")
    col = patch.get("col")
    if col is not None:
        if not isinstance(col, list) or len(col) != len(entry["col"]):
            errs.append(f"col must have {len(entry['col'])} items, same order as the current ones")
        else:
            for i, c in enumerate(col):
                en, _, ja = c.partition("｜")
                if en.strip().lower() != entry["col"][i].partition("｜")[0].strip().lower():
                    errs.append(f"col {i}: English part changed")
                e = _japanese(ja, need_kana=False)
                if e:
                    errs.append(f"col {i}: {e}")
    for key, limit in (("tip", 90), ("note", 90)):
        if patch.get(key):
            e = _japanese(patch[key])
            if e or len(patch[key]) > limit:
                errs.append(f"{key}: {e or f'longer than {limit} chars'}")
    forms = patch.get("forms")
    if forms is not None:
        if not isinstance(forms, list):
            errs.append("forms must be a list")
        else:
            for f in forms:
                if f.get("label") not in FORM_LABELS:
                    errs.append(f"bad form label {f.get('label')!r}")
                if not f.get("form") or re.search(r"[\d/]", f["form"]):
                    errs.append(f"bad form {f.get('form')!r}")
            if youdao and youdao.get("forms"):
                theirs = {t.strip().lower() for x in youdao["forms"] for t in x.split("或")}
                ours = {f["form"].strip().lower() for f in forms}
                noted = " ".join(f.get("note", "") for f in forms).lower()
                lack = {t for t in theirs - ours - {word.lower()} if t not in noted}
                if lack:
                    warns.append(f"Youdao lists forms we lack: {sorted(lack)}")
                if ours - theirs:
                    warns.append(f"forms not confirmed by Youdao: {sorted(ours - theirs)}")
    if patch.get("gram"):
        e = _japanese(patch["gram"])
        if e or len(patch["gram"]) > 150:
            errs.append(f"gram: {e or 'longer than 150 chars'}")
    if patch.get("etym"):
        if patch.get("etym_confidence") != "high":
            warns.append("etym dropped: confidence is not 'high'")
        else:
            e = _japanese(patch["etym"])
            if e or len(patch["etym"]) > 200:
                errs.append(f"etym: {e or 'longer than 200 chars'}")
    return errs, warns


def merge_patch(entry, patch):
    """Apply a validated patch to an entry in place; Chinese `zh` fields it replaces are dropped."""
    if patch.get("syl"):
        entry["syl"] = patch["syl"]
    if patch.get("senses"):
        keep = ("pos", "ja", "zh", "en", "note", "gram", "reg")
        entry["senses"] = [{k: s[k].strip() for k in keep if s.get(k) and s[k].strip()} for s in patch["senses"]]
    elif any("zh" in s for s in entry["senses"]):
        pass  # not translated yet; keep the legacy text until a patch with senses arrives
    if patch.get("ex_ja"):
        entry["ex"] = [{"en": x["en"], "ja": ja.strip()} for x, ja in zip(entry["ex"], patch["ex_ja"])]
    if patch.get("col"):
        entry["col"] = [c.strip() for c in patch["col"]]
    if patch.get("ex_zh") and "ja" in entry["ex"][0]:
        for x, zh in zip(entry["ex"], patch["ex_zh"]):
            x["zh"] = zh.strip()
    if patch.get("col_zh"):
        entry["colZh"] = [c.strip() for c in patch["col_zh"]]
    if patch.get("tip_zh"):
        entry["tipZh"] = patch["tip_zh"].strip()
    for key in ("tip", "note"):
        if patch.get(key) is not None and patch[key].strip():
            entry[key] = patch[key].strip()
    if patch.get("forms") is not None:
        forms = [{k: f[k].strip() for k in ("label", "form", "note") if f.get(k) and f[k].strip()} for f in patch["forms"]]
        if forms:
            entry["forms"] = forms
        else:
            entry.pop("forms", None)
    if patch.get("gram"):
        entry["gram"] = patch["gram"].strip()
    if patch.get("etym") and patch.get("etym_confidence") == "high":
        entry["etym"] = patch["etym"].strip()


def is_japanese_entry(e):
    """True once every sense and example has Japanese text (`zh` beside it is the optional Chinese view)."""
    return all("ja" in s for s in e["senses"]) and all("ja" in x for x in e["ex"])


def load_patches(path):
    """Read one patch file, or every *.json in a directory; each holds a list of patches."""
    out = []
    files = [path] if path.is_file() else sorted(path.glob("*.json"))
    for f in files:
        data = json.loads(f.read_text())
        if isinstance(data, dict) and "patches" in data:  # the shape the model returns
            data = data["patches"]
        out.extend(data if isinstance(data, list) else [data])
    return out


def youdao_cache():
    p = FORGE / "youdao.json"
    return json.loads(p.read_text()) if p.exists() else {}
