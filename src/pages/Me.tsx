import { Download, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { useAtlas } from "../atlas/context";
import { isMastered } from "../store/srs";
import { dayKey, exportBackup, importBackup, resetProgress, store, useStore, type Settings } from "../store/store";
import { toast } from "../ui/Toast";
import { streakOf } from "./Today";

export function Me({ privateAvailable }: { privateAvailable: boolean }) {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const saveError = useStore((s) => s.saveError);
  const file = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const cards = Object.values(progress.cards);
    const days = Object.values(progress.days);
    const r = days.reduce((n, d) => n + d.r, 0);
    const c = days.reduce((n, d) => n + d.c, 0);
    const t = days.reduce((n, d) => n + d.t, 0);
    const now = Date.now();
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() + i);
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      return cards.filter((x) => (i === 0 ? x.due <= end.getTime() : x.due >= start.getTime() && x.due <= end.getTime())).length;
    });
    void now;
    return { learned: cards.length, mastered: cards.filter(isMastered).length, reviews: r, accuracy: r ? Math.round((c / r) * 100) : 0, minutes: Math.round(t / 60), forecast };
  }, [progress]);

  const set = (patch: Partial<Settings>) => store.settings(patch);
  const work = settings.quiet && settings.noArt && settings.theme === "quiet";
  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `word-atlas-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const restore = async (f: File) => {
    if (f.size > 30 * 1024 * 1024) return toast("ファイルが大きすぎます。学習バックアップではないようです。", "warn");
    const r = importBackup(await f.text());
    toast(r.ok ? `${r.cards} 語の記憶を復元しました` : r.error, r.ok ? "ok" : "warn");
  };
  const maxF = Math.max(1, ...stats.forecast);

  return (
    <div className="page me">
      <header className="page-head">
        <p className="eyebrow">マイページ</p>
        <h1 className="display">あなたの星空</h1>
      </header>

      <section className="stat-strip">
        <div>
          <dt>連続学習</dt>
          <dd>
            {streakOf(progress.days)}
            <small>日</small>
          </dd>
        </div>
        <div>
          <dt>点灯済み</dt>
          <dd>{stats.learned.toLocaleString()}</dd>
        </div>
        <div>
          <dt>長期記憶</dt>
          <dd>{stats.mastered.toLocaleString()}</dd>
        </div>
        <div>
          <dt>初回正答率</dt>
          <dd>
            {stats.accuracy}
            <small>%</small>
          </dd>
        </div>
        <div>
          <dt>学習時間</dt>
          <dd>
            {stats.minutes}
            <small>分</small>
          </dd>
        </div>
      </section>

      <div className="me-grid">
        <section className="panel">
          <h3 className="eyebrow">過去 20 週間</h3>
          <Heatmap days={progress.days} />
          <p className="muted">1 マスが 1 日で、色が濃いほどその日の回答数が多くなります。「長期記憶」は記憶の安定度が 21 日を超えた状態です。</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">今後 7 日間の復習量</h3>
          <ol className="forecast">
            {stats.forecast.map((n, i) => (
              <li key={i}>
                <span style={{ height: `${(n / maxF) * 100}%` }} />
                <b>{n}</b>
                <small>{i === 0 ? "今日" : i === 1 ? "明日" : `+${i}`}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel settings">
          <h3 className="eyebrow">学習設定</h3>
          <Field label="仕事モード" hint="サイレント、イラストなし、シンプルな外観をワンタップでオンにします。個別に調整するには下のスイッチを使ってください。">
            <button className={`btn ${work ? "btn-ghost" : "btn-primary"}`} onClick={() => set(work ? { quiet: false, noArt: false, artChoice: true, theme: "system" } : { quiet: true, noArt: true, artChoice: true, theme: "quiet" })}>
              {work ? "オン（タップでオフ）" : "ワンタップでオン"}
            </button>
          </Field>
          <Field label="1 日の新出語" hint="復習に上限はなく、忘れかけの単語だけがアルゴリズムで出題されます。">
            <div className="segmented">
              {[5, 10, 15, 20, 30].map((n) => (
                <button key={n} className={settings.dailyNew === n ? "is-on" : ""} onClick={() => set({ dailyNew: n })}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="開始レベル" hint="すでに身についている下のレベルの単語を飛ばします。">
            <div className="segmented">
              {atlas.cefr.map((l, i) => (
                <button key={l} className={settings.startLevel === i ? "is-on" : ""} onClick={() => set({ startLevel: i })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="目標記憶率" hint="高いほど復習の頻度が増えます。90% が多くの人にちょうどよい設定です。">
            <div className="segmented">
              {[0.85, 0.9, 0.95].map((n) => (
                <button key={n} className={settings.retention === n ? "is-on" : ""} onClick={() => set({ retention: n })}>
                  {Math.round(n * 100)}%
                </button>
              ))}
            </div>
          </Field>
          <Field label="発音">
            <div className="segmented">
              <button className={settings.accent === "uk" ? "is-on" : ""} onClick={() => set({ accent: "uk" })}>
                イギリス英語
              </button>
              <button className={settings.accent === "us" ? "is-on" : ""} onClick={() => set({ accent: "us" })}>
                アメリカ英語
              </button>
            </div>
          </Field>
          <Field label="外観">
            <div className="segmented">
              {(
                [
                  ["system", "システムに合わせる"],
                  ["light", "ライト"],
                  ["dark", "ダーク"],
                  ["quiet", "シンプル"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={settings.theme === k ? "is-on" : ""} onClick={() => set({ theme: k })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Toggle label="サイレント学習" hint="リスニング問題を出さず、発音・操作音・環境音も自動では鳴りません。スピーカーをタップすれば手動で聞けます。" on={settings.quiet} set={(v) => set({ quiet: v })} />
          <Toggle label="イラストを使わない" hint="すべてのイラストを隠し、絵を見る問題も出さず、文字だけで覚えます。" on={settings.noArt} set={(v) => set({ noArt: v, artChoice: true })} />
          <Toggle label="発音を自動再生" on={settings.autoplay} set={(v) => set({ autoplay: v })} />
          <Toggle label="操作音" on={settings.sfx} set={(v) => set({ sfx: v })} />
          <Toggle label="オープニングアニメーション（1 日 1 回）" on={settings.splash} set={(v) => set({ splash: v })} />
          <Toggle label="復習にスペリング問題を加える" on={settings.spell} set={(v) => set({ spell: v })} />
          {privateAvailable && (
            <Field label="語彙データ" hint="非公開の語彙データはローカルの開発サーバーでのみ使え、パッケージには含まれません。">
              <div className="segmented">
                <button className={settings.dataset === "open" ? "is-on" : ""} onClick={() => set({ dataset: "open" })}>
                  公開図鑑
                </button>
                <button className={settings.dataset === "private" ? "is-on" : ""} onClick={() => set({ dataset: "private" })}>
                  非公開 8000
                </button>
              </div>
            </Field>
          )}
        </section>

        <section className="panel">
          <h3 className="eyebrow">データ</h3>
          <p className="muted">進捗はこの端末のブラウザ内にだけ保存されます。アカウントもサーバーもありません。端末を替えるときは、バックアップをエクスポートしてインポートしてください。</p>
          {saveError && <p className="warn-text">ブラウザが保存を拒否しました（プライベートモードか、空き容量不足の可能性があります）。早めにバックアップをエクスポートしてください。</p>}
          <div className="data-actions">
            <button className="btn btn-ghost" onClick={download}>
              <Download size={18} /> バックアップをエクスポート
            </button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}>
              <Upload size={18} /> バックアップをインポート
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0]).finally(() => (e.target.value = ""))} />
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => {
                if (confirm("この語彙データの学習記録をすべて消去しますか？ この操作は取り消せません。先にバックアップをエクスポートすることをおすすめします。")) {
                  resetProgress();
                  toast("学習記録を消去しました");
                }
              }}
            >
              <RotateCcw size={18} /> 記録を消去
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="field toggle">
      <div>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </div>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

function Heatmap({ days }: { days: Record<string, { r: number }> }) {
  const weeks = 20;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  const cells: { k: string; v: number; future: boolean }[] = [];
  const d = new Date(start);
  for (let i = 0; i < (weeks + 1) * 7; i++) {
    const k = dayKey(d);
    cells.push({ k, v: days[k]?.r ?? 0, future: d > end });
    d.setDate(d.getDate() + 1);
  }
  const lvl = (v: number) => (v === 0 ? 0 : v < 10 ? 1 : v < 25 ? 2 : v < 50 ? 3 : 4);
  return (
    <div className="heatmap" role="img" aria-label="学習ヒートマップ">
      {cells.map((c) => (
        <span key={c.k} className={`h${c.future ? "x" : lvl(c.v)}`} title={`${c.k} · ${c.v} 問`} />
      ))}
    </div>
  );
}
