# 内容生成流程 / Content pipeline

所有脚本在 `scripts/atlas/`，凭据只从环境变量或仓库外目录读取（见 [SECURITY.md](../SECURITY.md)）。中间产物写入被 Git 忽略的 `.local/forge/`，可断点续跑。

1. **词头**：`.local/forge/headwords.json`，每项 `{hid, word, raw}`。`raw` 是可选的义项提示，只用于判断哪些义项重要，不会被复制进输出。
2. **词条文本** `gen_text.py`：每批 10 个词，按 [`gen_text.py`](../scripts/atlas/gen_text.py) 中的编写规范（准确优先、原创、两类例句、不编造词源、安全中立）生成 JSON。
3. **插画** `gen_images.py`：每个词条自带一个场景描述 `scene`，与统一画风提示词组合后生成 1024px 图片，压缩为 768px WebP 母版。按学习路线顺序生成。
4. **发音** `gen_word_audio.py`：ElevenLabs，英音 Alice、美音 Sarah。
5. **例句朗读** `gen_sentence_audio.py`：为 `ex[0]` 合成朗读，按学习路线顺序。
6. **编译** `build_atlas.py`：清洗字段、排序、切块，生成 `public/atlas/` 与 `data/`。
7. **校验** `bun run check:atlas`：结构、顺序、引用与媒体文件存在性。
8. **音标** `fetch_youdao_ipa.py` + `apply_ipa.py`：用有道词典的英、美音标覆盖现有音标，只入库音标字符串；有道查不到的词保留原值。接口为非官方，请低速、少量运行，结果缓存在 `.local/forge/youdao.json`。
9. **日语释义与丰富内容** `enrich_entries.py` + `apply_enrichment.py`：把词条的学习者文字（义项、例句译文、搭配、提示）改写成日语，并补充音节、更多义项（语感、可算 / 他動詞、米英 / 口語标注）、词形变化、语法提醒和有把握的词源；应用补丁时会删除被替换的旧 `zh` 字段。模型只写原创内容；补丁先经 `enrich_lib.py` 校验（音节必须拼出词头、词形标签合法等），再与有道的词形对照，不一致的列入 `.local/forge/enrich-report.json` 供人工抽查。`enrich_sample.json` 是一份可直接应用的样例补丁。

重新运行 `build_atlas.py` 会从 `.local/forge/` 重新生成全部词条，覆盖第 8、9 步的结果；编译后请再依次运行 `apply_ipa.py` 和 `apply_enrichment.py`。

```bash
export SUB2_BASE_URL=... SUB2_API_KEY=... ELEVENLABS_API_KEY=...
python3 scripts/atlas/gen_text.py --workers 8
python3 scripts/atlas/gen_images.py --workers 8 --follow
python3 scripts/atlas/gen_word_audio.py
python3 scripts/atlas/gen_sentence_audio.py --follow
python3 scripts/atlas/build_atlas.py
bun run check:atlas

# 音标与丰富释义（作用于已发布的数据，无需 forge 中间文件）
python3 scripts/atlas/fetch_youdao_ipa.py --delay 0.4
python3 scripts/atlas/apply_ipa.py
python3 scripts/atlas/enrich_entries.py --sample 100   # 先试跑，检查质量后再扩大范围
python3 scripts/atlas/apply_enrichment.py
bun run check:atlas
```

`SUB2_BASE_URL` 指向任意 OpenAI 兼容的接口。

## 质量边界

自动校验覆盖结构、字段、顺序和文件，不覆盖语义正确性。插画和例句没有逐条人工审校；发现问题请提 Issue 或 PR。
