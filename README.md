<div align="center">

<a href="https://0xlei.tech/words/"><img src="docs/assets/cover-v2.jpg" alt="词光 · Word Atlas — 絵で覚える、ことばの世界" width="100%"></a>

# Word Atlas · 词光

**見て、聞いて、自分のものにする。**

IELTS 単語 7,298 語 · オリジナルイラスト · 英米音声 · 間隔反復

[**Word Atlas を開く ↗**](https://0xlei.tech/words/)　 /　 [48 秒の紹介動画](docs/assets/launch.mp4)　 /　 [データセットを入手](data/)　 /　 [English](README.en.md)　 /　 [简体中文](README.zh.md)

[![Code: MIT](https://img.shields.io/badge/Code-MIT-17283B?style=flat-square)](LICENSE)
[![Dataset: CC BY 4.0](https://img.shields.io/badge/Dataset-CC_BY_4.0-AD5038?style=flat-square)](CONTENT_LICENSE.md)

<br>

**Word Atlas の iOS アプリのベータ版を無料で公開中：[api.billswise.cn/app](https://api.billswise.cn/app/)**

[![Follow @yangleiocx3](https://img.shields.io/badge/Follow_me-@yangleiocx3-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/yangleiocx3)

</div>

---

Word Atlas（词光）は、イラストと文脈を軸にした IELTS 単語学習アプリです。絵で意味をつかみ、発音を聞いて結びつけ、思い出す練習と FSRS の間隔反復で定着させます。アカウント登録は不要で、学習の進捗は自分の端末に保存されます。

表示は **日本語＋英語が標準** です。語義・例文・コロケーション・使い方のヒントには中国語の表示も用意されており、語彙カードのタブでいつでも切り替えられます。

> **バージョンについて：** このリポジトリには、Word Atlas のオープンソース基本版とデータセットが入っています。公開中の Web サイトは別に更新されており、機能がこのリポジトリと異なる場合があります。ここにあるコードとコンテンツは、それぞれ MIT / CC BY 4.0 で利用できます。

[プレビュー](#プレビュー) · [学習の流れ](#学習の流れ) · [ローカルで動かす](#ローカルで動かす) · [オープンデータ](#オープンデータ) · [コントリビュート](#コントリビュート)

## プレビュー

### 聞いて、練習できる単語図鑑

<img src="docs/assets/atlas-desktop.jpg" alt="オープンソース版のデスクトップ画面：イラスト付き単語カードと語彙の一覧" width="100%">

<table>
<tr>
<td width="50%"><img src="docs/assets/today-mobile.jpg" alt="スマホの「今日の学習」画面" width="100%"></td>
<td width="50%"><img src="docs/assets/word-mobile.jpg" alt="イラスト・英米発音・例文を載せたスマホの単語カード" width="100%"></td>
</tr>
<tr><td align="center">今日やることに集中できる学習プラン</td><td align="center">イラスト・語義・発音が 1 枚のカードに</td></tr>
</table>

<sub>上はリポジトリのオープンソース版の実際の画面です。ページ冒頭の画像はブランドのコンセプトイラストです。</sub>

### 覚えた単語が、自分だけの星図になる

<img src="docs/assets/galaxy.jpg" alt="語彙の星図：トピック別に単語を並べ、学習の進み具合を表示" width="100%">

19 のトピックが語彙の星図を作ります。ドラッグで回転、スクロールで拡大縮小、星をタップすると単語カードが開きます。学習状況は星の明るさで表されます。WebGL2 で描画しており、非対応の端末には代替表示を用意しています。

<details>
<summary><b>48 秒の紹介動画を見る</b></summary>

<a href="docs/assets/launch.mp4"><img src="docs/assets/launch-preview.webp" alt="クリックして Word Atlas の紹介動画を再生" width="100%"></a>

[音声つきでフル再生](docs/assets/launch.mp4)

</details>

## 学習の流れ

| ステップ | できること |
| :--- | :--- |
| **見る** | 1 語ごとにイラスト、日本語と英語の語義、オリジナルの例文 2 つ、コロケーション、語族、使い方のヒントを確認できます。中国語表示に切り替えることもできます。 |
| **聞く** | 英音と米音を切り替え、例文の朗読を聞けます。一部の単語は 2 つ目の例文の録音も付いています。 |
| **思い出す** | 語義から単語を選ぶ、イラストを見て穴埋め、聞き取り、スペリングで、能動的な想起を練習します。 |
| **復習する** | FSRS が学習履歴からタイミングを決めて復習を出題します。目標とする記憶率は調整できます。正答率に数えるのは最初の解答だけです。 |
| **積み上げる** | 星図で進捗を確認でき、タイピング練習は別に集計されます。ローカルの進捗はエクスポート・復元ができます。 |

**仕事の合間にも学べます。** 「マイページ → 学習設定」から、ワンタップで仕事モードに切り替えられます。音を出さない学習（リスニング問題を出さず、発音・効果音・環境音が自動再生されない）、イラストなし（文字だけで覚える）、シンプルな外観（白背景・アニメーションなし・タブのタイトルは Notes）が揃っています。ホーム画面の「3 分でサクッと」では、最も復習が必要な 10 語だけを復習します。

**ローカル優先。** 登録は不要で、見た単語や音声・画像はオフライン用にキャッシュできます。端末を変える前に、進捗のバックアップをエクスポートしてください。

<details>
<summary><b>発音・例文・環境音のサンプル</b></summary>

*abandon* を例に、クリックして聞けます（オンライン再生）：

| | |
|---|---|
| 🇬🇧 英音 | [abandon /əˈbændən/](https://0xlei.tech/words/atlas/audio/uk/abandon.mp3) |
| 🇺🇸 米音 | [abandon /əˈbændən/](https://0xlei.tech/words/atlas/audio/us/abandon.mp3) |
| 📖 例文の朗読 | [We had to abandon our car in the snow.](https://0xlei.tech/words/atlas/audio/ex/abandon.mp3) |

7,298 語すべてに英音・米音・例文の朗読が付いています。さらに、重点語 1,011 語には 2 つ目の例文の朗読もあります。

### 環境音とインタラクションのサウンド

| | |
|---|---|
| 🎙 **オープニングのナレーション** | [「欢迎打开雅思大门」](https://0xlei.tech/words/sfx/splash-voice.mp3)（中国語）：星屑が集まって「词光」になり、扉が開きます |
| 🌌 **星図のナレーション** | [「这是你的词汇星图。每学会一个词，就点亮一颗星。」](https://0xlei.tech/words/sfx/voice-galaxy-hello.mp3)（中国語） |
| 🎵 **星空の音楽** | [継ぎ目なくループするオリジナル曲](https://0xlei.tech/words/sfx/amb-stars.mp3)。標準の BGM として流れます |
| 🌧 **6 種類の環境音** | [雨の日の図書館](https://0xlei.tech/words/sfx/amb-rain.mp3) · [朝の海岸](https://0xlei.tech/words/sfx/amb-sea.mp3) · [朝の森](https://0xlei.tech/words/sfx/amb-forest.mp3) · [夜の暖炉](https://0xlei.tech/words/sfx/amb-fire.mp3) · [航海の船室](https://0xlei.tech/words/sfx/amb-voyage.mp3) · [静かなカフェ](https://0xlei.tech/words/sfx/amb-cafe.mp3) |
| ✨ **UI の効果音** | 正解・不正解、カードをめくる、タイピング、連続正解、星が灯る……操作ごとに専用の音があります。単語の読み上げ中は BGM が自動で小さくなります |

素材はすべてリポジトリに入っています。イラストは `public/atlas/img/`、録音は `public/atlas/audio/` にあり、この 2 種類は CC BY 4.0 で公開しています。UI の効果音と音楽は `public/sfx/` にあり、アプリと一緒に配布されます。

</details>

## ローカルで動かす

[**Bun 1.2+**](https://bun.sh) と **Node.js 20+** が必要です（Vite と Playwright のスクリプトは引き続き Node 上で動きます）。リポジトリには画像と録音がすべて入っているため、最初のダウンロードには時間がかかることがあります。

```bash
git clone --depth 1 https://github.com/designfuchen/word-atlas.git
cd word-atlas
bun install --frozen-lockfile
bun run dev
```

**http://localhost:5188** を開いてください。

```bash
bun run test         # ユニットテスト
bun run check:atlas  # 語彙データとメディアの検証
bun run build        # dist/ にビルド
```

サブパスに配置する場合：`ATLAS_BASE=/words/ bun run build`。詳しくは[デプロイガイド](docs/deployment.md)をご覧ください。

**技術スタック**：React 19 · TypeScript · Vite · ts-fsrs · WebGL2

## オープンデータ

アプリをそのまま使うだけでなく、語彙データを自作の学習ツール、Anki デッキ、研究プロジェクトに使うこともできます。

| リソース | オープンソース版の内容 | 入口 |
| :--- | :--- | :--- |
| 単語 | **7,298** 語。CEFR A1–C2、19 トピック | [JSON](data/word-atlas.json) · [CSV](data/word-atlas.csv) |
| 例文 | **14,596** 文。日常と IELTS の文脈。日本語訳付きで、中国語訳も選べます | [フィールド説明](docs/dataset.md) |
| イラスト | **7,298** 枚。512 px の WebP、サムネイルもあり | [画像ディレクトリ](public/atlas/img/) |
| 録音 | **22,905** 本。英音・米音と例文の朗読 | [音声ディレクトリ](public/atlas/audio/) |

```python
import json
from pathlib import Path

words = json.loads(Path("data/word-atlas.json").read_text(encoding="utf-8"))
b2_environment = [w for w in words if w["cefr"] == "B2" and w["topic"] == "environment"]
```

<details>
<summary><b>1 語分のデータ構造を見る</b></summary>

```json
{
  "id": "principle",
  "w": "principle",
  "uk": "/ˈprɪnsəp(ə)l/",
  "us": "/ˈprɪnsəp(ə)l/",
  "senses": [
    {
      "pos": "n.",
      "ja": "原則、信条、行動の指針",
      "en": "a personal rule or belief that guides how someone behaves",
      "gram": "可算",
      "zh": "原则；行为准则"
    }
  ],
  "ex": [
    {
      "en": "I refused the extra money as a matter of principle.",
      "ja": "私は原則の問題として、その追加の報酬を断った。",
      "zh": "出于原则，我拒绝了那笔额外的钱。"
    }
  ],
  "col": ["in principle｜原則として、理論上は", "on principle｜主義として"],
  "colZh": ["原则上；理论上", "出于原则"],
  "fam": ["principled (adj.)"],
  "tip": "principal（主要な、校長）と綴りが紛らわしい。「原則」は -ple で終わる。",
  "tipZh": "勿混principal：它可指“主要的”或“校长”。",
  "cefr": "B2",
  "topic": "thinking"
}
```

日本語と英語が標準のフィールドです。`zh` / `colZh` / `tipZh` は、中国語表示用のオプションのフィールドです。

</details>

### コンテンツの出典と限界

語義、例文、イラスト、録音は本プロジェクトのために作成しました。文章とイラストは生成 AI、音声は ElevenLabs を使っています。構造と一貫性の自動チェックは行っていますが、**1 件ずつの人手による校閲は済んでいません**。語義、例文、イラスト、発音に誤りが含まれている可能性があります。公式の IELTS 単語リストではなく、スコアアップを保証するものでもありません。

[コンテンツ生成の流れ](docs/pipeline.md) · [記憶モデル](docs/learning-model.md) · [生成スクリプト](scripts/atlas/)

## コントリビュート

問題を報告するときは、**単語の ID、再現手順、期待する結果**を添えてください。語彙の修正は、辞書などの信頼できる根拠もあわせてもらえると助かります。

- [Issue を報告する](https://github.com/designfuchen/word-atlas/issues/new/choose)：単語の修正、画面の不具合、使い方の提案など。
- [コントリビューションガイド](CONTRIBUTING.md)：データの同期、コードの規約、提出前のチェック。
- [セキュリティポリシー](SECURITY.md)：セキュリティ上の問題の報告方法。

## ライセンス

| 対象 | ライセンス |
| :--- | :--- |
| アプリのコード | [MIT](LICENSE) |
| 語彙テキスト、イラスト、単語の録音 | [CC BY 4.0](CONTENT_LICENSE.md)。クレジットは Word Atlas contributors（词光） |
| 依存ライブラリとフォント | それぞれのライセンスに従います。詳細は各ファイルをご覧ください |

---

制作：[@designfuchen](https://github.com/designfuchen)。進捗や制作の様子は [X · @yangleiocx3](https://x.com/yangleiocx3) で公開しています。

Word Atlas が役に立ったら、ぜひ Star を付けたり、英語を学んでいる友達に紹介したりしてください。
