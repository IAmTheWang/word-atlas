# 词库格式 / Dataset format

## `data/word-atlas.json`

一个数组，按学习路线排序（CEFR 由易到难，同级内打散话题）。每个词条：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | URL 安全的唯一标识，同时是媒体文件名，例如 `principle`、`day-off` |
| `w` | string | 词头 |
| `uk` / `us` | string | 英式 / 美式 IPA，带斜杠 |
| `senses` | `{pos, ja, en}[]` | 义项：词性、日语释义、简明英文释义 |
| `ex` | `{en, ja}[]` | 两条原创例句及日语译文：`ex[0]` 日常短句，`ex[1]` 雅思语境长句 |
| `col` | string[] | 常用搭配，格式 `english｜日本語` |
| `fam` | string[] | 词族，格式 `word (pos)` |
| `syn` / `ant` | string[] | 近义 / 反义 |
| `tip` | string | 一条日语用法或辨析提示 |
| `cefr` | `A1`…`C2` | 估计难度 |
| `topic` | string | 19 个话题之一：education, work, technology, science, environment, health, society, government, economy, media, arts, travel, city, nature, daily, emotion, thinking, sport, history |
| `note` | string | 可选：用法提醒（冒犯性、过时用法、拼写说明等） |
| `syl` | string[] | 可选：音节划分，拼起来必须等于词头，例如 `["a","ban","don"]` |
| `forms` | `{label, form, note?}[]` | 可选：词形变化，`label` 为複数形、過去形、過去分詞、現在分詞、三人称単数現在、比較級、最上級等 |
| `gram` | string | 可选：一句语法提醒，只在不规则或容易出错时给出（例如 dove 也是 dive 的美式过去式） |
| `etym` | string | 可选：词源，只在有把握时给出 |

学习者看到的说明全部是日语和英语。词条正在从中文迁移到日语：尚未翻译的词条仍带有旧的 `zh` 字段（`senses[].zh`、`ex[].zh`），`bun run check:atlas` 会统计数量，`bun run check:atlas -- --strict` 要求全部迁移完成。

`senses` 最多 5 项；除 `pos`、`zh`、`en` 外，每项还可带可选字段：`note`（语感、范围或与近义词的区别）、`gram`（可算、不可算、他動詞、自動詞）、`reg`（口語、文語、米、英、比喩、古風等）。带可选字段的词条会逐步增加，没有这些字段的词条仍然有效。

`uk` / `us` 的音标取自有道词典，个别多音词保留多种读法（如 `/juːz/, /juːs/`）。

## `data/word-atlas.csv`

同样内容的表格版，多值字段用 ` | `、` ; ` 或 `, ` 连接，UTF-8 编码。

## 网页数据 `public/atlas/`

- `index.json`：紧凑索引，`words` 中每行为 `[id, word, zh, ipa, cefrIndex, topicIndex, media]`。`media` 是位标记：`1` 插画、`2` 英音、`4` 美音、`8` 例句朗读。
- `entries/<n>.json`：完整词条，每块 100 条，第 `n` 块对应索引中第 `n*100` 到 `n*100+99` 行。
- `img/<id>.webp`（512px）、`thumb/<id>.webp`（256px）。
- `audio/uk/<id>.mp3`、`audio/us/<id>.mp3`、`audio/ex/<id>.mp3`（`ex[0]` 的朗读）。

媒体覆盖情况以 `index.json` 的位标记为准，不要假设每个词都有全部文件。

## 授权

CC BY 4.0，署名 “Word Atlas contributors”。见 [CONTENT_LICENSE.md](../CONTENT_LICENSE.md)。
