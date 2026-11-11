import { ArrowRight, Flame, Keyboard, Sparkles, Timer } from "lucide-react";
import { useEffect, useMemo } from "react";
import { prefetch, useAtlas, useEntry } from "../atlas/context";
import { go, openWord } from "../lib/router";
import { cue } from "../lib/sound";
import { hashSeed } from "../lib/text";
import { buildSession, masteredCount, QUICK_SIZE, todayPlan } from "../store/session";
import { isMastered } from "../store/srs";
import { dayKey, store, useStore } from "../store/store";
import { Galaxy } from "../galaxy/Galaxy";
import { Highlight, Pronounce } from "../ui/EntryView";
import { Illustration } from "../ui/Illustration";
import { Ring } from "../ui/Ring";

const BRAND = `${import.meta.env.BASE_URL}brand`;

function greeting(h: number) {
  if (h < 5) return "夜遅くまでお疲れさまです";
  if (h < 11) return "おはようございます";
  if (h < 14) return "こんにちは";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

export function streakOf(days: Record<string, { r: number }>) {
  let n = 0;
  const d = new Date();
  if (!(days[dayKey(d)]?.r > 0)) d.setDate(d.getDate() - 1);
  while (days[dayKey(d)]?.r > 0) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function Today() {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const plan = useMemo(() => todayPlan(atlas, progress, settings), [atlas, progress, settings]);
  // Warm the first cards of today's journey so the session opens instantly.
  const firstIds = [...plan.due.slice(0, 4), ...plan.fresh.slice(0, 6)].join(",");
  useEffect(() => {
    const ids = firstIds.split(",").filter(Boolean);
    const t = window.setTimeout(() => void prefetch(atlas, ids), 800);
    return () => window.clearTimeout(t);
  }, [atlas, firstIds]);
  const now = new Date();
  const today = progress.days[dayKey()];
  const streak = streakOf(progress.days);
  const active = progress.session && !progress.session.finished ? progress.session : null;
  const total = plan.due.length + plan.fresh.length;
  const goal = settings.dailyNew + Math.min(plan.due.length, 60);
  const doneToday = today?.r ?? 0;

  const start = (opts?: { reviewOnly?: boolean; quick?: boolean; extra?: number }) => {
    if (!active) {
      const s = buildSession(atlas, progress, opts?.extra ? { ...settings, dailyNew: (today?.n ?? 0) + opts.extra } : settings, { reviewOnly: opts?.reviewOnly, quick: opts?.quick });
      if (!s.steps.length) return;
      store.progress((p) => ({ ...p, session: s }));
    }
    if (settings.sfx) void cue("start");
    go({ page: "learn" });
  };

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = dayKey(d);
    return { k, label: "日月火水木金土"[d.getDay()], v: progress.days[k]?.r ?? 0, today: i === 6 };
  });

  const learned = Object.keys(progress.cards).length;
  const mastered = masteredCount(progress);
  const teaser = settings.noArt ? [] : (active ? active.newIds : plan.fresh).slice(0, 5).map((id) => atlas.byId.get(id)!).filter(Boolean);

  return (
    <div className="page today">
      <header className="greet">
        <p className="eyebrow">
          {now.getMonth() + 1}月{now.getDate()}日 · {"日月火水木金土"[now.getDay()]}曜日
        </p>
        <h1 className="display">{greeting(now.getHours())}、探検者さん。</h1>
      </header>

      <section className={`journey ${total === 0 && !active ? "is-clear" : ""}`}>
        <img className="journey-art" src={`${BRAND}/hero.webp`} alt="" fetchPriority="high" />
        <div className="journey-body">
          {active ? (
            <>
              <p className="eyebrow eyebrow-light">ジャーニー進行中</p>
              <h2>
                残り <b>{active.steps.length - active.index}</b> ステップ
              </h2>
              <p className="journey-lede">進捗は保存済みです。いつでも続きから再開できます。</p>
            </>
          ) : total > 0 ? (
            <>
              <p className="eyebrow eyebrow-light">今日のジャーニー</p>
              <h2>
                {plan.due.length > 0 && (
                  <>
                    復習 <b>{plan.due.length}</b>
                  </>
                )}
                {plan.due.length > 0 && plan.fresh.length > 0 && <i> · </i>}
                {plan.fresh.length > 0 && (
                  <>
                    新出語 <b>{plan.fresh.length}</b>
                  </>
                )}
              </h2>
              <p className="journey-lede">約 {plan.minutes} 分。まず復習、それから新しい語です。</p>
            </>
          ) : (
            <>
              <p className="eyebrow eyebrow-light">今日の分は完了</p>
              <h2>今日の星は、すべて灯りました。</h2>
              <p className="journey-lede">記憶には少し余白が必要です。もう少し進みたい場合も大丈夫です。</p>
            </>
          )}
          {teaser.length > 0 && (
            <div className="teaser" aria-label="今日出会う新出語">
              {teaser.map((w, i) => (
                <Illustration key={w.id} src={atlas.img(w, "thumb")} word={w.word} topic={w.topic} className={`teaser-${i}`} />
              ))}
              <span>今日はこの語に出会います</span>
            </div>
          )}
          <div className="journey-actions">
            {active || total > 0 ? (
              <button className="btn btn-primary btn-xl" onClick={() => start()}>
                {active ? "ジャーニーを続ける" : "今日のジャーニーを始める"} <ArrowRight size={20} />
              </button>
            ) : (
              <button className="btn btn-primary btn-xl" onClick={() => start({ extra: 5 })}>
                新出語をあと 5 語 <Sparkles size={18} />
              </button>
            )}
            {!active && plan.due.length > 0 && (
              <button className="btn btn-glass" onClick={() => start({ quick: true })} title={`最も復習すべき ${Math.min(QUICK_SIZE, plan.due.length)} 語だけ復習します`}>
                <Timer size={18} /> スキマ3分
              </button>
            )}
            {!active && plan.due.length > 0 && plan.fresh.length > 0 && (
              <button className="btn btn-glass" onClick={() => start({ reviewOnly: true })}>
                復習のみ
              </button>
            )}
            {!active && total === 0 && (
              <button className="btn btn-glass" onClick={() => go({ page: "practice" })}>
                <Keyboard size={18} /> タイピング練習
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="today-grid">
        <WordOfDay />

        <section className="panel streak-panel">
          <div className="panel-head">
            <h3 className="eyebrow">今週</h3>
            <span className={`streak ${streak ? "is-on" : ""}`}>
              <Flame size={16} /> 連続 {streak} 日
            </span>
          </div>
          <div className="streak-body">
            <Ring value={goal ? doneToday / goal : 0} size={112} stroke={8} tone="terra">
              <b>{doneToday}</b>
              <small>今日の回答</small>
            </Ring>
            <ol className="week">
              {week.map((d) => (
                <li key={d.k} className={`${d.v ? "is-on" : ""} ${d.today ? "is-today" : ""}`} title={`${d.k}：${d.v} 問`}>
                  <span style={{ "--h": Math.min(1, d.v / 40) } as React.CSSProperties} />
                  <small>{d.label}</small>
                </li>
              ))}
            </ol>
          </div>
          <dl className="mini-stats">
            <div>
              <dt>点灯済み</dt>
              <dd>{learned.toLocaleString()}</dd>
            </div>
            <div>
              <dt>習得済み</dt>
              <dd>{mastered.toLocaleString()}</dd>
            </div>
            <div>
              <dt>全単語</dt>
              <dd>{atlas.count.toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <LevelPath />
        <GalaxyPanel learned={learned} total={atlas.count} />
        <Topics />
      </div>
    </div>
  );
}

function GalaxyPanel({ learned, total }: { learned: number; total: number }) {
  const today = useStore((s) => s.progress.days[dayKey()]);
  const ids = useStore((s) => s.progress.cards);
  const todayIds = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Object.entries(ids)
      .filter(([, c]) => c.seen >= start.getTime())
      .map(([id]) => id);
  }, [ids]);
  void today;
  return (
    <section className="galaxy-panel" onClick={() => go({ page: "atlas", view: "galaxy" })} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && go({ page: "atlas", view: "galaxy" })}>
      <Galaxy mode="mini" highlight={todayIds} />
      <div className="galaxy-panel-copy">
        <p className="eyebrow eyebrow-light">あなたの語彙星図</p>
        <h3>
          点灯済み <b>{learned.toLocaleString()}</b> 個の星
        </h3>
        <p>{learned ? `あと ${(total - learned).toLocaleString()} 個が待っています。金色は今日新しく灯った星です。` : `${total.toLocaleString()} 語は ${total.toLocaleString()} 個の星です。ひとつ覚えるたびに、ひとつ灯ります。`}</p>
        <span className="btn btn-glass">
          星図へ <ArrowRight size={18} />
        </span>
      </div>
    </section>
  );
}

function WordOfDay() {
  const atlas = useAtlas();
  const pick = useMemo(() => {
    const pool = atlas.words.filter((w) => w.cefr >= 2 && w.media & 1);
    const list = pool.length ? pool : atlas.words;
    return list[hashSeed(dayKey()) % list.length];
  }, [atlas]);
  const { entry } = useEntry(pick?.id);
  if (!pick) return null;
  return (
    <section className="panel wotd" onClick={() => openWord(pick.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openWord(pick.id)} aria-label={`今日の一語：${pick.word}`}>
      <Illustration src={atlas.img(pick)} word={pick.word} topic={pick.topic} className="wotd-art" />
      <div className="wotd-body">
        <h3 className="eyebrow">今日の一語</h3>
        <p className="wotd-word" lang="en">
          {pick.word}
        </p>
        {entry && (
          <div onClick={(e) => e.stopPropagation()}>
            <Pronounce entry={entry} refw={pick} />
          </div>
        )}
        <p className="wotd-zh" lang="ja">{pick.ja}</p>
        {entry?.ex[0] && (
          <p className="wotd-ex" lang="en">
            <Highlight text={entry.ex[0].en} word={entry.w} />
          </p>
        )}
      </div>
    </section>
  );
}

function LevelPath() {
  const atlas = useAtlas();
  const cards = useStore((s) => s.progress.cards);
  const start = useStore((s) => s.settings.startLevel);
  const levels = useMemo(() => {
    const out = atlas.cefr.map((name) => ({ name, total: 0, seen: 0, mastered: 0 }));
    for (const w of atlas.words) {
      const l = out[w.cefr];
      l.total++;
      const c = cards[w.id];
      if (c) {
        l.seen++;
        if (isMastered(c)) l.mastered++;
      }
    }
    return out;
  }, [atlas, cards]);
  const NAMES = ["入門", "基礎", "中級", "中上級", "上級", "熟達"];
  return (
    <section className="panel path-panel">
      <div className="panel-head">
        <h3 className="eyebrow">学習ルート · A1 から C2 まで</h3>
        <span className="legend">
          <i className="lg-seen" /> 学習済み <i className="lg-done" /> 習得済み
        </span>
      </div>
      <ol className="route">
        {levels.map((l, i) => {
          const seen = l.seen / Math.max(1, l.total);
          const done = l.mastered / Math.max(1, l.total);
          return (
            <li key={l.name} className={`${i === start ? "is-start" : ""} ${l.seen ? "is-on" : ""}`}>
              <button onClick={() => go({ page: "atlas", level: l.name })} aria-label={`${l.name} ${NAMES[i]}，学習済み ${l.seen} / ${l.total}`}>
                <span className="station" style={{ "--seen": seen, "--done": done } as React.CSSProperties}>
                  <b>{l.name}</b>
                </span>
                <span className="station-name">{NAMES[i]}</span>
                <span className="station-count">
                  {l.seen}
                  <small>/{l.total}</small>
                </span>
                {i === start && <span className="station-flag">スタート</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Topics() {
  const atlas = useAtlas();
  const counts = useMemo(() => {
    const c = new Array(atlas.topics.length).fill(0);
    atlas.words.forEach((w) => c[w.topic]++);
    return c;
  }, [atlas]);
  return (
    <section className="topics-panel">
      <div className="panel-head">
        <h3 className="eyebrow">IELTS のトピックから探す</h3>
        <button className="link" onClick={() => go({ page: "atlas" })}>
          図鑑を開く
        </button>
      </div>
      <ul className="topic-tiles">
        {atlas.topics.map(([key, name], i) => (
          <li key={key}>
            <button onClick={() => go({ page: "atlas", topic: key })}>
              <img src={`${BRAND}/topic-${key}.webp`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              <span>
                <b>{name}</b>
                <small>{counts[i]} 語</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
