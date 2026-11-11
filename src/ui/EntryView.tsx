import { Bookmark, BookmarkCheck, Lightbulb, Share2 } from "lucide-react";
import type { Entry, WordRef } from "../atlas/types";
import { useAtlas } from "../atlas/context";
import { groupSenses, senseTags, syllables } from "../lib/entry";
import { splitHighlight, splitPair } from "../lib/text";
import { formatInterval, isMastered } from "../store/srs";
import { toggleBookmark, useStore } from "../store/store";
import { Illustration } from "./Illustration";
import { Speak } from "./Speak";
import { shareWord } from "./share";
import { openWord } from "../lib/router";

export function Highlight({ text, word }: { text: string; word: string }) {
  const parts = splitHighlight(text, word);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <mark>{parts[1]}</mark>
      {parts[2]}
    </>
  );
}

export function Pronounce({ entry, refw }: { entry: Entry; refw: WordRef | Entry }) {
  const atlas = useAtlas();
  const accent = useStore((s) => s.settings.accent);
  const both = entry.uk && entry.us && entry.uk !== entry.us;
  const items: ["uk" | "us", string, string][] = both
    ? [["uk", "英", entry.uk], ["us", "米", entry.us]]
    : [[accent, accent === "uk" ? "英" : "米", entry.uk || entry.us]];
  if (!both && items[0][2] === "") return null;
  return (
    <div className="pron">
      {(accent === "us" ? [...items].reverse() : items).map(([acc, label, ipa]) => (
        <Speak
          key={acc}
          url={atlas.audio(refw, acc)}
          text={entry.w}
          accent={acc}
          size="sm"
          label={
            <>
              <em>{label}</em>
              <span className="ipa">{ipa}</span>
            </>
          }
        />
      ))}
    </div>
  );
}

export function EntryView({ entry, mode = "detail", eager = true }: { entry: Entry; mode?: "detail" | "intro" | "reveal"; eager?: boolean }) {
  const atlas = useAtlas();
  const ref = atlas.byId.get(entry.id);
  const card = useStore((s) => s.progress.cards[entry.id]);
  const saved = useStore((s) => s.progress.bookmarks.includes(entry.id));
  const accent = useStore((s) => s.settings.accent);
  const topicIdx = atlas.topics.findIndex((t) => t[0] === entry.topic);
  const topic = atlas.topics[topicIdx];
  const exUrls = [atlas.audio(entry, "ex"), atlas.audio(entry, "ex2")];
  const famLinks = entry.fam.map((f) => {
    const w = f.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
    const hit = atlas.words.find((x) => x.word.toLowerCase() === w);
    return { label: f, id: hit?.id };
  });
  const syl = syllables(entry.w, entry.syl);
  const forms = (entry.forms ?? []).filter((f) => f.form.trim());
  const status = card ? (isMastered(card) ? "習得済み" : "学習中") : null;

  return (
    <article className={`entry entry-${mode}`}>
      <div className="entry-art">
        <Illustration src={atlas.img(entry)} word={entry.w} topic={topicIdx} eager={eager} alt={`${entry.w} のイラスト`} />
      </div>
      <div className="entry-body">
        <header className="entry-head">
          <div className="entry-tags">
            <span className={`chip chip-level lv-${entry.cefr}`}>{entry.cefr}</span>
            {topic && <span className="chip">{topic[1]}</span>}
            {status && <span className={`chip chip-status ${status === "習得済み" ? "is-done" : ""}`}>{status}</span>}
          </div>
          {mode === "detail" && (
            <div className="entry-actions">
              <button className={`icon-btn ${saved ? "is-on" : ""}`} onClick={() => toggleBookmark(entry.id)} aria-pressed={saved} aria-label={saved ? "お気に入りを解除" : "お気に入りに追加"} title={saved ? "お気に入りを解除" : "お気に入りに追加"}>
                {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
              </button>
              <button className="icon-btn" onClick={() => shareWord(atlas, entry)} aria-label="共有カードを作成" title="共有カードを作成">
                <Share2 size={19} />
              </button>
            </div>
          )}
        </header>
        {ref && (
          <p className="specimen">
            № {String(ref.order + 1).padStart(4, "0")}
            <i />
            Word Atlas
          </p>
        )}
        <h2 className="headword" lang="en">
          {entry.w}
        </h2>
        {syl && (
          <p className="syl" lang="en" aria-label={`音節：${syl}`}>
            {syl}
          </p>
        )}
        <Pronounce entry={entry} refw={ref ?? entry} />

        <ol className="senses">
          {groupSenses(entry.senses).flatMap((g) =>
            g.senses.map((s, i) => (
              <li key={`${g.pos}-${i}-${s.ja}`} className={i === 0 ? "is-first" : ""}>
                <span className="pos">{i === 0 ? g.pos : ""}</span>
                <span className="zh" lang="ja">
                  {s.ja}
                  {senseTags(s).map((t) => (
                    <em key={t} className="sense-tag">
                      {t}
                    </em>
                  ))}
                </span>
                {s.en && (
                  <span className="en" lang="en">
                    {s.en}
                  </span>
                )}
                {s.note && <span className="sense-note">{s.note}</span>}
              </li>
            )),
          )}
        </ol>

        {(forms.length > 0 || entry.gram) && (
          <section className="block grammar">
            <h3 className="eyebrow">語形変化と文法</h3>
            {forms.length > 0 && (
              <dl className="forms">
                {forms.map((f) => (
                  <div key={`${f.label}-${f.form}`}>
                    <dt>{f.label}</dt>
                    <dd lang="en">
                      {f.form}
                      {f.note && <small>{f.note}</small>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {entry.gram && <p className="gram-note">{entry.gram}</p>}
          </section>
        )}

        {entry.ex.length > 0 && (
          <section className="block">
            <h3 className="eyebrow">例文</h3>
            <ul className="examples">
              {entry.ex.map((x, i) => (
                <li key={i}>
                  {entry.ex.length > 1 && <span className={`ex-tag ${i ? "is-ielts" : ""}`}>{i ? "IELTS 向け" : "日常"}</span>}
                  <p className="ex-en" lang="en">
                    <Highlight text={x.en} word={entry.w} />
                    <Speak url={exUrls[i] ?? null} text={x.en} accent={i === 1 && exUrls[1] ? "us" : accent} size="sm" className="ex-speak" />
                  </p>
                  <p className="ex-zh" lang="ja">{x.ja}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entry.col.length > 0 && (
          <section className="block">
            <h3 className="eyebrow">よく使うコロケーション</h3>
            <ul className="collocations">
              {entry.col.map((c) => {
                const { en, ja } = splitPair(c);
                return (
                  <li key={c}>
                    <span lang="en">{en}</span>
                    {ja && <small lang="ja">{ja}</small>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {(famLinks.length > 0 || entry.syn.length > 0 || entry.ant.length > 0) && (
          <section className="block relations">
            {famLinks.length > 0 && (
              <div>
                <h3 className="eyebrow">語族</h3>
                <p>
                  {famLinks.map((f) =>
                    f.id && mode === "detail" ? (
                      <button key={f.label} className="link" onClick={() => openWord(f.id!)}>
                        {f.label}
                      </button>
                    ) : (
                      <span key={f.label}>{f.label}</span>
                    ),
                  )}
                </p>
              </div>
            )}
            {entry.syn.length > 0 && (
              <div>
                <h3 className="eyebrow">類義語</h3>
                <p>{entry.syn.map((s) => <span key={s}>{s}</span>)}</p>
              </div>
            )}
            {entry.ant.length > 0 && (
              <div>
                <h3 className="eyebrow">対義語</h3>
                <p>{entry.ant.map((s) => <span key={s}>{s}</span>)}</p>
              </div>
            )}
          </section>
        )}

        {entry.etym && (
          <section className="block">
            <h3 className="eyebrow">語源</h3>
            <p className="etym">{entry.etym}</p>
          </section>
        )}

        {entry.tip && (
          <aside className="tip">
            <Lightbulb size={17} strokeWidth={1.8} />
            <p>{entry.tip}</p>
          </aside>
        )}

        {entry.note && <p className="usage-note">使い方の注意：{entry.note}</p>}

        {mode === "detail" && card && (
          <p className="memory-note">
            {card.due <= Date.now() ? "今すぐ復習できます" : `次の復習は ${formatInterval(card.due - Date.now())}後`} · 記憶の安定度 {card.s < 1 ? "<1" : Math.round(card.s)} 日 · 復習 {card.reps} 回
          </p>
        )}
      </div>
    </article>
  );
}
