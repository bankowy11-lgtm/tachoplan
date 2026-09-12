// Jazda.tsx — ekran aktywnej jazdy (§21) + Tryb kierowcy (§22): duże cyfry,
// minimum informacji, wysoki kontrast, bez zbędnych elementów. Dane na żywo
// liczone są z `engine/liveStatus.ts` na podstawie realnej, zakotwiczonej osi
// czasu ostatnio obliczonego planu — nie są to wartości fikcyjne.

import { useEffect, useState } from "react";
import { obliczStanNaZywo } from "../engine/liveStatus";
import { formatHM } from "../format";
import type { AktualnyPlan } from "../App";
import type { TachographRules } from "../tachographRules";

export default function JazdaScreen({
  plan,
  rules,
  trybKierowcy,
  onTrybKierowcy,
}: {
  plan: AktualnyPlan | null;
  rules: TachographRules;
  trybKierowcy: boolean;
  onTrybKierowcy: (v: boolean) => void;
}) {
  const [teraz, setTeraz] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTeraz(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!plan || plan.wynik.zablokowany) {
    return (
      <div className="screen">
        <div className="empty-state">
          <span className="emoji">🚛</span>
          <p>Brak aktywnego planu podróży. Zaplanuj trasę na ekranie Start, żeby zobaczyć tu podgląd jazdy.</p>
        </div>
      </div>
    );
  }

  const status = obliczStanNaZywo(plan.wynik.timeline, plan.stanTachografu, rules, teraz);

  if (status.niezaczeta) {
    return (
      <div className="screen">
        <div className="empty-state">
          <span className="emoji">⏳</span>
          <p>Zaplanowany wyjazd jeszcze nie nastąpił — jazda zacznie się od zaplanowanej godziny wyjazdu.</p>
        </div>
      </div>
    );
  }

  if (status.zakonczona) {
    return (
      <div className="screen">
        <div className="empty-state">
          <span className="emoji">🏁</span>
          <p>Podróż zgodnie z planem już się zakończyła.</p>
        </div>
      </div>
    );
  }

  const naJezdzie = status.aktualneZdarzenie?.typ === "JAZDA";
  const naPrzerwie = status.aktualneZdarzenie?.typ === "PRZERWA";
  const naOdpoczynku = status.aktualneZdarzenie?.typ === "ODPOCZYNEK";

  if (trybKierowcy) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          padding: 20,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, color: "#93a0b8", marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>
          {naJezdzie && "🚛 JAZDA — DO PAUZY"}
          {naPrzerwie && "☕ PAUZA"}
          {naOdpoczynku && "🛏️ ODPOCZYNEK"}
        </div>
        <div style={{ fontSize: "min(26vw, 140px)", fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {naJezdzie && status.doPauzyMin !== null
            ? formatHM(status.doPauzyMin)
            : formatHM(status.doLimituTygodniowegoMin)}
        </div>
        <div style={{ fontSize: 20, color: "#22c55e", marginTop: 20, fontWeight: 700 }}>
          JAZDA DZISIAJ: {formatHM(status.todayDriveMin)}
        </div>
        <button
          onClick={() => onTrybKierowcy(false)}
          style={{
            marginTop: 40,
            background: "#16213a",
            color: "#fff",
            border: "1px solid #24304a",
            borderRadius: 14,
            padding: "16px 28px",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Wyjdź z trybu kierowcy
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="section-title">🚛 Jazda</div>

      <div className={`banner banner-${naJezdzie ? "zielony" : naPrzerwie ? "zolty" : "zielony"}`}>
        <div className="banner-label">
          {naJezdzie && "🚛 W TRASIE"}
          {naPrzerwie && "☕ PAUZA"}
          {naOdpoczynku && "🛏️ ODPOCZYNEK"}
        </div>
        <div className="banner-value">
          {naJezdzie && status.doPauzyMin !== null ? `DO PAUZY: ${formatHM(status.doPauzyMin)}` : "—"}
        </div>
      </div>

      <div className="result-grid">
        <div className="result-tile">
          <div className="rt-label">🚚 JAZDA DZISIAJ</div>
          <div className="rt-value">{formatHM(status.todayDriveMin)}</div>
        </div>
        <div className="result-tile">
          <div className="rt-label">📅 DO LIMITU TYGODNIOWEGO</div>
          <div className="rt-value">{formatHM(status.doLimituTygodniowegoMin)}</div>
        </div>
      </div>

      <div className="tile">
        <div className="tile-title">🅿️ NASTĘPNY POSTÓJ</div>
        <div className="tile-note" style={{ marginTop: 6 }}>
          Moduł automatycznego doboru parkingu (Overpass API) to Etap 2 — jeszcze niepodłączony. Silnik wyboru
          (ranking) jest już gotowy i przetestowany (patrz <code>src/parking/ParkingRanker.ts</code>), czeka na
          żywe źródło danych.
        </div>
      </div>

      <button className="btn btn-secondary" onClick={() => onTrybKierowcy(true)} style={{ marginTop: 8 }}>
        👁️ Tryb kierowcy (duże cyfry)
      </button>
    </div>
  );
}
