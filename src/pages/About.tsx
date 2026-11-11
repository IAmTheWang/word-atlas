import { ArrowUpRight, Database, Github, Heart } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { REPO_URL } from "../config";

const BASE = import.meta.env.BASE_URL;

export function About() {
  const atlas = useAtlas();
  return (
    <div className="page about">
      <header className="about-hero">
        <img src={`${BASE}brand/og.webp`} alt="" />
        <div>
          <p className="eyebrow">ワード・アトラスについて</p>
          <h1 className="display">一語ずつ、IELTS を灯す。</h1>
          <p className="lede">
            ワード・アトラスは、IELTS リーディングの 8000 語を {atlas.count.toLocaleString()} の見出し語にまとめました。どの単語にもオリジナルのイラストが一枚、日常の例文と IELTS の例文が一文ずつ付き、イギリス英語・アメリカ英語の発音、よく使うコロケーション、紛らわしい語の注意も添えています。ひとつ覚えるたびに、星図の星が一つ灯ります。
          </p>
          <p className="lede">無料でオープンソース、登録も不要です。コードは MIT、語彙データは CC BY 4.0 で、どなたでもご自由にお使いいただけます。</p>
          <div className="about-actions">
            <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
              <Github size={18} /> GitHub で見る
            </a>
            <a className="btn btn-ghost" href={`${REPO_URL}/tree/main/data`} target="_blank" rel="noreferrer">
              <Database size={18} /> 語彙データをダウンロード JSON / CSV
            </a>
          </div>
        </div>
      </header>

      <div className="about-grid">
        <section className="panel">
          <h3 className="eyebrow">なぜ覚えられるのか</h3>
          <ul className="feature-list">
            <li>
              <b>まず読む。</b>どの単語にも日本語の語義、英語の定義、語形変化、例文が揃っています。イラストは設定でオンにできます。
            </li>
            <li>
              <b>次に思い出す。</b>意味選択、例文の穴埋め、英語の定義から単語を選ぶ問題、スペリング。見て分かる段階から書ける段階へ進みます。
            </li>
            <li>
              <b>忘れかけた頃にもう一度。</b>FSRS は新しい Anki でも使われているオープンソースの記憶アルゴリズムで、忘れそうなタイミングでだけ復習を出します。
            </li>
            <li>
              <b>正直なスコア。</b>集計するのは初回の回答だけです。間違えた単語は別の出題形式でもう一度出てきますが、正答率は上がりません。
            </li>
            <li>
              <b>進捗はあなただけのもの。</b>アカウントもサーバーもなく、データはブラウザ内に保存され、いつでもエクスポートできます。
            </li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="eyebrow">ショートカット</h3>
          <dl className="keys">
            <div>
              <dt>
                <kbd>⌘</kbd>
                <kbd>K</kbd> または <kbd>/</kbd>
              </dt>
              <dd>どの単語も検索</dd>
            </div>
            <div>
              <dt>
                <kbd>1</kbd>–<kbd>4</kbd>
              </dt>
              <dd>答えを選ぶ</dd>
            </div>
            <div>
              <dt>
                <kbd>Enter</kbd>
              </dt>
              <dd>決定 / 次へ</dd>
            </div>
            <div>
              <dt>
                <kbd>←</kbd> <kbd>→</kbd>
              </dt>
              <dd>カード内で前・次の単語へ</dd>
            </div>
            <div>
              <dt>
                <kbd>Esc</kbd>
              </dt>
              <dd>ダイアログを閉じる</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h3 className="eyebrow">コンテンツの出どころ</h3>
          <p className="muted">
            語義、例文、コロケーション、ヒントは、統一した辞書の基準にもとづいて大規模言語モデルが書き直したものです。イラストは画像モデルが統一したタッチで一語ずつ描き、発音と読み上げは ElevenLabs で合成しています（イギリス英語は Alice、アメリカ英語は Sarah）。すべての内容は構造と一貫性を自動で検証していますが、一件ずつの人手による校閲は行っていません。誤りを見つけたら、GitHub で Issue を立てるか、データを直接修正して PR を送ってください。
          </p>
          <p className="muted">ワード・アトラスは IELTS の公式単語リストではなく、スコアアップを約束するものでもありません。単語学習を、もう少し美しく、もう少し確かなものにしたいだけです。</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">開発者の方へ</h3>
          <p className="muted">
            <code>data/word-atlas.json</code> と <code>.csv</code> が語彙データの全体です。<code>public/atlas</code> には、Web 用に分割したデータ、イラスト、音声が入っています。Anki のデッキ、単語学習アプリ、ブラウザ拡張、AI アプリの評価セットなどにご利用いただけます。クレジット表記をお願いします。
          </p>
          <a className="link" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
            ドキュメントを読む <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
      <p className="colophon">
        <Heart size={14} /> 単語を覚えているすべての人のために。
      </p>
    </div>
  );
}
