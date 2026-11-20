"""把 EVP 抓取得到的 CSV 转成便于阅读的 Markdown（B2 / C1 / C2 各一个文件）。

用法: python3 evp_to_markdown.py
输入: evp_b2_vocabulary.csv, evp_c1_c2_vocabulary.csv
输出: evp_markdown/evp_b2.md, evp_c1.md, evp_c2.md
"""
import csv
import re
from collections import Counter, OrderedDict
from pathlib import Path

SOURCES = ["evp_b2_vocabulary.csv", "evp_c1_c2_vocabulary.csv"]
OUT_DIR = Path("evp_markdown")
LEVEL_TITLES = {
    "B2": "B2 · Upper Intermediate（中高级）",
    "C1": "C1 · Advanced（高级）",
    "C2": "C2 · Proficiency（精通）",
}
POS_ICON = {
    "noun": "🟦",
    "verb": "🟥",
    "adjective": "🟩",
    "adverb": "🟨",
    "phrase": "🟪",
    "phrasal verb": "🟧",
}


def esc(s):
    return s.replace("|", "\\|").replace("\n", " ").strip()


def letter_of(word):
    m = re.match(r"[A-Za-z]", word.strip())
    return m.group(0).upper() if m else "#"


def sort_key(row):
    return (row[0].lower(), row[1].lower(), row[3].lower())


def load():
    by_level = {}
    for name in SOURCES:
        path = Path(name)
        if not path.exists():
            print(f"跳过（文件不存在）: {name}")
            continue
        with path.open(encoding="utf-8-sig", newline="") as f:
            rows = list(csv.reader(f))[1:]
        for r in rows:
            by_level.setdefault(r[2], []).append(r[:5])
    return by_level


def render(level, rows):
    total_raw = len(rows)
    seen, uniq = set(), []
    for r in sorted(rows, key=sort_key):
        k = tuple(r)
        if k in seen:
            continue
        seen.add(k)
        uniq.append(r)

    groups = OrderedDict()
    for r in uniq:
        groups.setdefault(letter_of(r[0]), []).append(r)
    letters = sorted(groups, key=lambda c: ("~" if c == "#" else c))

    pos_count = Counter(r[3] for r in uniq)
    pos_line = " · ".join(
        f"{POS_ICON.get(p, '⬜')} {p or '—'} **{n}**" for p, n in pos_count.most_common()
    )

    out = [
        f"# {LEVEL_TITLES.get(level, level)}",
        "",
        "> 数据来源：[English Vocabulary Profile Online](https://englishprofile.org/?menu=evp-online)（英式英语）",
        "",
        f"**共 {len(uniq)} 条**"
        + (f"（原始 {total_raw} 条，已合并 {total_raw - len(uniq)} 条完全相同的重复行）" if total_raw != len(uniq) else ""),
        "",
        pos_line,
        "",
        "## 目录",
        "",
        " ".join(f"[{c}](#{'0-9' if c == '#' else c.lower()})" for c in letters),
        "",
        "---",
        "",
    ]

    for c in letters:
        items = groups[c]
        out += [f"## {'0-9' if c == '#' else c}", "", f"<sub>{len(items)} 条</sub>", ""]
        out += ["| 单词 / 短语 | 释义提示 | 词性 | 主题 |", "| :-- | :-- | :-: | :-- |"]
        for w, gw, _lv, pos, topic in items:
            icon = POS_ICON.get(pos, "⬜")
            out.append(
                f"| **{esc(w)}** | {('`' + esc(gw) + '`') if gw else ''} | {icon} {esc(pos)} | {esc(topic)} |"
            )
        out += ["", "<sub>[↑ 回到目录](#目录)</sub>", ""]

    return "\n".join(out), len(uniq)


def main():
    by_level = load()
    OUT_DIR.mkdir(exist_ok=True)
    for level in ["B2", "C1", "C2"]:
        if level not in by_level:
            print(f"{level}: 没有数据，跳过")
            continue
        md, n = render(level, by_level[level])
        path = OUT_DIR / f"evp_{level.lower()}.md"
        path.write_text(md, encoding="utf-8")
        print(f"{level}: {n} 条 -> {path}")


if __name__ == "__main__":
    main()
