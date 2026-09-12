import { useState } from "react";
import Timeline from "../components/Timeline";
import Disclaimer from "../components/Disclaimer";
import { formatDzienGodzina, formatHMSlownie } from "../format";
import { dodajOrAktualizujTrase } from "../storage";
import type { AktualnyPlan } from "../App";
import type { ZapisanaTrasa } from "../types";

export default function TrasaScreen({
  plan,
  onZapisano,
  onNowaTrasa,
}: {
  plan: AktualnyPlan | null;
  onZapisano: (id: string) => void;
  onNowaTrasa: () => void;
}) {
  const [zapisano, setZapisano] = useState(false);

  if (!plan) {
    return (
      <div className="screen">
        <div className="empty-state">
          <span className="emoji">🗺️</span>
          <p>Nie masz jeszcze obliczonej trasy.</p>
          <button className="btn btn-primary" onClick={onNowaTrasa} style={{ marginTop: 12 }}>
            Zaplanuj nową trasę
          </button>
        </div>
      </div>
    );
  }

  const { wynik } = plan;

  if (wynik.zablokowany) {
    return (
      <div className="screen">
        <div className="banner banner-czerwony">
          <div className="banner-label">🔴 PLAN ZABLOKOWANY</div>
          <div className="banner-value" style={{ fontSize: 18 }}>
            {wynik.powodBlokady ?? "Przekroczono limity czasu jazdy."}
          </div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            📍 {plan.start} → 🏁 {plan.cel}
          </div>
        </div>
        {wynik.ostrzezenia.map((o, i) => (
          <div key={i} className="warning-box">
            ⚠️ {o}
          </div>
        ))}
        <button className="btn btn-secondary" onClick={onNowaTrasa} style={{ marginBottom: 20 }}>
          ← Wróć i zaktualizuj stan tachografu
        </button>
        <Disclaimer />
      </div>
    );
  }

  function zapisz() {
    if (!plan) return;
    const trasa: ZapisanaTrasa = {
      id: plan.zapisanaTrasaId ?? crypto.randomUUID(),
      start: plan.start,
      cel: plan.cel,
      wymaganyPrzyjazdIso: plan.wymaganyPrzyjazdIso,
      czasJazdyMin: plan.czasJazdyMin,
      utworzonoIso: new Date().toISOString(),
      opcje: plan.opcje,
      stanTachografu: plan.stanTachografu,
      waypoints: plan.waypoints,
      dystansKm: plan.dystansKm,
    };
    dodajOrAktualizujTrase(trasa);
    onZapisano(trasa.id);
    setZapisano(true);
    setTimeout(() => setZapisano(false), 2500);
  }

  return (
    <div className="screen">
      <div className={`banner banner-${wynik.poziomZapasu}`}>
        <div className="banner-label">
          {wynik.poziomZapasu === "zielony" && "🟢 PLAN GOTOWY"}
          {wynik.poziomZapasu === "zolty" && "🟡 PLAN GOTOWY — MAŁY ZAPAS"}
          {wynik.poziomZapasu === "czerwony" && "🔴 PLAN NAPIĘTY — SPRAWDŹ ZAPAS"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", marginBottom: 2 }}>
          MUSISZ WYJECHAĆ:
        </div>
        <div className="banner-value">{formatDzienGodzina(wynik.wyjazd).toUpperCase()}</div>
      </div>

      <div className="result-grid">
        <div className="result-tile">
          <div className="rt-label">🏁 PLANOWANY PRZYJAZD</div>
          <div className="rt-value">{formatDzienGodzina(wynik.przyjazd)}</div>
        </div>
        <div className="result-tile">
          <div className="rt-label">⏳ ZAPAS CZASU</div>
          <div className="rt-value">{formatHMSlownie(wynik.zapasMin)}</div>
        </div>
        <div className="result-tile">
          <div className="rt-label">🚚 CAŁKOWITY CZAS PODRÓŻY</div>
          <div className="rt-value">{formatHMSlownie(wynik.calkowityCzasMin)}</div>
        </div>
        <div className="result-tile">
          <div className="rt-label">📆 LICZBA DNI JAZDY</div>
          <div className="rt-value">{wynik.liczbaDni}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          📍 {plan.start}
          {plan.waypoints && plan.waypoints.length > 0 && (
            <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>
              {" "}
              → {plan.waypoints.join(" → ")}
            </span>
          )}{" "}
          → 🏁 {plan.cel}
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          Wymagany przyjazd: {formatDzienGodzina(new Date(plan.wymaganyPrzyjazdIso))} · Czas jazdy:{" "}
          {formatHMSlownie(plan.czasJazdyMin)}
          {plan.dystansKm ? ` · ${plan.dystansKm} km` : ""}
        </div>
        {plan.kraje && plan.kraje.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {plan.kraje.map((k) => (
              <span
                key={k}
                style={{
                  background: "var(--graphite)",
                  border: "1px solid var(--card-border)",
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      {wynik.ostrzezenia.length > 0 &&
        wynik.ostrzezenia.map((o, i) => (
          <div key={i} className="warning-box">
            ⚠️ {o}
          </div>
        ))}

      <button className="btn btn-primary" onClick={zapisz} style={{ marginBottom: 10 }}>
        {zapisano ? "✅ Zapisano w Moich trasach" : plan.zapisanaTrasaId ? "💾 Zaktualizuj trasę" : "💾 Zapisz trasę"}
      </button>
      <button className="btn btn-secondary" onClick={onNowaTrasa} style={{ marginBottom: 20 }}>
        ➕ Zaplanuj kolejną trasę
      </button>

      <div className="section-title">🚛 Oś czasu podróży</div>
      <Timeline zdarzenia={wynik.timeline} />

      <Disclaimer />
    </div>
  );
}
