import { useState } from "react";
import DurationInput from "../components/DurationInput";
import Disclaimer from "../components/Disclaimer";
import { czyZdaze } from "../engine/tripPlanner";
import { formatDzienGodzina, formatHMSlownie } from "../format";
import type { OpcjePlanowania, TachographState } from "../types";
import type { TachographRules } from "../tachographRules";
import type { WynikCzyZdaze } from "../engine/tripPlanner";

function domyslnaData(offsetMin = 0): string {
  const d = new Date(Date.now() + offsetMin * 60000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function CzyZdazeScreen({
  rules,
  opcje,
  stanTachografu,
  onClose,
}: {
  rules: TachographRules;
  opcje: OpcjePlanowania;
  stanTachografu: TachographState;
  onClose: () => void;
}) {
  const [teraz, setTeraz] = useState(domyslnaData());
  const [cel, setCel] = useState("");
  const [wymaganyPrzyjazd, setWymaganyPrzyjazd] = useState(domyslnaData(6 * 60));
  const [czasJazdyMin, setCzasJazdyMin] = useState(0);
  const [wynik, setWynik] = useState<WynikCzyZdaze | null>(null);
  const [blad, setBlad] = useState<string | null>(null);

  function sprawdz() {
    setBlad(null);
    const terazDate = new Date(teraz);
    const przyjazdDate = new Date(wymaganyPrzyjazd);
    if (isNaN(terazDate.getTime()) || isNaN(przyjazdDate.getTime())) {
      setBlad("Podaj poprawne daty i godziny.");
      return;
    }
    if (!czasJazdyMin || czasJazdyMin <= 0) {
      setBlad("Podaj czas jazdy większy od zera.");
      return;
    }
    setWynik(czyZdaze(terazDate, przyjazdDate, czasJazdyMin, stanTachografu, opcje, rules));
  }

  return (
    <div className="overlay-screen">
      <div className="back-row">
        <button className="back-btn" onClick={onClose}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 19 }}>⏱️ Czy zdążę?</h2>
      </div>

      <div className="screen">
        <div className="card">
          <div className="field">
            <label>🕐 Aktualna godzina</label>
            <input type="datetime-local" value={teraz} onChange={(e) => setTeraz(e.target.value)} />
          </div>
          <div className="field">
            <label>🏁 Cel (opcjonalnie)</label>
            <input
              type="text"
              placeholder="np. Pomigliano d'Arco, Włochy"
              value={cel}
              onChange={(e) => setCel(e.target.value)}
            />
          </div>
          <div className="field">
            <label>📅 Wymagana godzina przyjazdu</label>
            <input
              type="datetime-local"
              value={wymaganyPrzyjazd}
              onChange={(e) => setWymaganyPrzyjazd(e.target.value)}
            />
          </div>
          <DurationInput
            label="🚛 Pozostały czas jazdy"
            minutes={czasJazdyMin}
            onChange={setCzasJazdyMin}
            maxHours={200}
          />
          {blad && <div className="warning-box">{blad}</div>}
          <button className="btn btn-primary" onClick={sprawdz}>
            Sprawdź
          </button>
        </div>

        {wynik && (
          <div className={`banner banner-${wynik.status === "TAK" ? "zielony" : wynik.status === "TAK_MALO" ? "zolty" : "czerwony"}`}>
            {wynik.status === "TAK" && (
              <>
                <div className="banner-label">🟢 TAK — ZDĄŻYSZ</div>
                <div className="banner-value">Masz {formatHMSlownie(wynik.zapasMin)} zapasu</div>
              </>
            )}
            {wynik.status === "TAK_MALO" && (
              <>
                <div className="banner-label">🟡 ZDĄŻYSZ, ALE Z MAŁYM ZAPASEM</div>
                <div className="banner-value">Pozostało tylko {formatHMSlownie(wynik.zapasMin)} zapasu</div>
              </>
            )}
            {wynik.status === "NIE" && wynik.sym.zablokowany && (
              <>
                <div className="banner-label">🔴 PLAN ZABLOKOWANY</div>
                <div className="banner-value" style={{ fontSize: 18 }}>
                  {wynik.sym.powodBlokady ?? "Przekroczono limity czasu jazdy."}
                </div>
              </>
            )}
            {wynik.status === "NIE" && !wynik.sym.zablokowany && (
              <>
                <div className="banner-label">🔴 NIE ZDĄŻYSZ</div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", margin: "8px 0 2px" }}>
                  Najwcześniejszy możliwy przyjazd:
                </div>
                <div className="banner-value" style={{ fontSize: 22 }}>
                  {formatDzienGodzina(wynik.najwczesniejszyPrzyjazd)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", margin: "10px 0 2px" }}>
                  Aby dojechać na czas, powinieneś wyjechać wcześniej o:
                </div>
                <div className="banner-value" style={{ fontSize: 20 }}>
                  {formatHMSlownie(wynik.ilePotrzebaWczesniejszegoWyjazduMin)}
                </div>
              </>
            )}
          </div>
        )}

        {wynik && wynik.sym.ostrzezenia.map((o, i) => (
          <div key={i} className="warning-box">
            ⚠️ {o}
          </div>
        ))}

        <Disclaimer />
      </div>
    </div>
  );
}
