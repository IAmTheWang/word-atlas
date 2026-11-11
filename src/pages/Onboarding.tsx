import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAtlas } from "../atlas/context";
import { store } from "../store/store";

const LEVELS = [
  ["A2", "基礎", "日常語がまだ不安定"],
  ["B1", "中級", "目標 5.5 – 6 点"],
  ["B2", "中上級", "目標 6.5 – 7 点"],
  ["C1", "上級", "7.5 点以上を目指す"],
];

export function Onboarding() {
  const atlas = useAtlas();
  const [level, setLevel] = useState(1);
  const [goal, setGoal] = useState(10);
  const finish = () => store.settings({ onboarded: true, startLevel: atlas.cefr.indexOf(LEVELS[level][0]), dailyNew: goal });
  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="ようこそ">
      <div className="onboard-card">
        <img className="onboard-art" src={`${import.meta.env.BASE_URL}brand/hero.webp`} alt="" />
        <div className="onboard-body">
          <p className="eyebrow">ワード・アトラスへようこそ</p>
          <h1 className="display">
            {atlas.count.toLocaleString()} 個の星を、
            <br />
            ひとつずつ灯していきましょう。
          </h1>
          <fieldset>
            <legend>どこから始めますか？</legend>
            <div className="choice-grid">
              {LEVELS.map(([code, name, desc], i) => (
                <button key={code} className={`choice ${level === i ? "is-on" : ""}`} onClick={() => setLevel(i)} aria-pressed={level === i}>
                  <span className={`chip chip-level lv-${code}`}>{code}</span>
                  <b>{name}</b>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>毎日いくつの新しい星を灯しますか？</legend>
            <div className="segmented segmented-wide">
              {[5, 10, 15, 20].map((n) => (
                <button key={n} className={goal === n ? "is-on" : ""} onClick={() => setGoal(n)} aria-pressed={goal === n}>
                  {n} 個{n === 10 ? " · おすすめ" : ""}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn btn-primary btn-xl" onClick={finish}>
            出発 <ArrowRight size={20} />
          </button>
          <p className="muted">登録は不要です。進捗はこの端末にだけ保存され、設定はいつでも「マイページ」で変更できます。</p>
        </div>
      </div>
    </div>
  );
}
