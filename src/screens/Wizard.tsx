// Wizard.tsx — kreator pierwszego uruchomienia (§39): 5 kroków (rodzaj
// pojazdu, ustawienia kierowcy, domyślne odpoczynki, domyślny zapas, gotowe).
// Wyniki zapisywane są w prawdziwym storage (pojazd/kierowca/opcje/ustawienia
// app) — kreator nie jest tylko dekoracją, faktycznie inicjalizuje dane
// używane później przez silnik planowania.

import { useState } from "react";
import type { OpcjePlanowania, ProfilKierowcy, ProfilPojazdu, RodzajPojazdu } from "../types";
import { pelniWypoczetyStan } from "../types";

const RODZAJE: { value: RodzajPojazdu; label: string; icon: string }[] = [
  { value: "bus", label: "Bus do 3,5 t", icon: "🚐" },
  { value: "ciezarowy", label: "Ciężarowy", icon: "🚛" },
  { value: "inny", label: "Inny", icon: "👥" },
];

const ZAPASY = [0, 15, 30, 45, 60, 90, 120];

export default function Wizard({
  onZakoncz,
}: {
  onZakoncz: (dane: { pojazd: ProfilPojazdu; kierowca: ProfilKierowcy; opcje: OpcjePlanowania }) => void;
}) {
  const [krok, setKrok] = useState(1);
  const [rodzaj, setRodzaj] = useState<RodzajPojazdu>("bus");
  const [nazwaPojazdu, setNazwaPojazdu] = useState("Mój pojazd");
  const [nazwaKierowcy, setNazwaKierowcy] = useState("Kierowca 1");
  const [trybOdpoczynku, setTrybOdpoczynku] = useState<OpcjePlanowania["trybOdpoczynku"]>("auto");
  const [zapas, setZapas] = useState(30);

  function dalej() {
    if (krok < 5) setKrok(krok + 1);
    else zakoncz();
  }

  function zakoncz() {
    onZakoncz({
      pojazd: {
        id: crypto.randomUUID(),
        nazwa: nazwaPojazdu.trim() || "Mój pojazd",
        rodzaj,
      },
      kierowca: {
        id: crypto.randomUUID(),
        nazwa: nazwaKierowcy.trim() || "Kierowca 1",
        stan: { ...pelniWypoczetyStan },
      },
      opcje: { trybOdpoczynku, trybLimituDziennego: "auto", zapasCzasuMin: zapas },
    });
  }

  return (
    <div className="overlay-screen">
      <div className="screen" style={{ paddingTop: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🚛</div>
          <h1 style={{ margin: "8px 0 2px" }}>TachoPlan 2.0</h1>
          <p style={{ color: "var(--text-dim)", margin: 0 }}>Planuj trasę. Pilnuj czasu. Dojedź na czas.</p>
        </div>

        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map((k) => (
            <div
              key={k}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: k <= krok ? "var(--accent)" : "var(--card-border)",
              }}
            />
          ))}
        </div>

        {krok === 1 && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              Krok 1 — Rodzaj pojazdu
            </div>
            {RODZAJE.map((r) => (
              <button
                key={r.value}
                className={`btn ${rodzaj === r.value ? "btn-primary" : "btn-secondary"}`}
                style={{ marginBottom: 8, justifyContent: "flex-start", gap: 12 }}
                onClick={() => setRodzaj(r.value)}
              >
                <span style={{ fontSize: 20 }}>{r.icon}</span> {r.label}
              </button>
            ))}
            <div className="field" style={{ marginTop: 8 }}>
              <label>Nazwa pojazdu</label>
              <input type="text" value={nazwaPojazdu} onChange={(e) => setNazwaPojazdu(e.target.value)} />
            </div>
          </div>
        )}

        {krok === 2 && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              Krok 2 — Ustawienia kierowcy
            </div>
            <div className="field">
              <label>Imię / nazwa kierowcy</label>
              <input type="text" value={nazwaKierowcy} onChange={(e) => setNazwaKierowcy(e.target.value)} />
              <div className="hint">Domyślnie kierowca "w pełni wypoczęty" — stan tachografu edytujesz później.</div>
            </div>
          </div>
        )}

        {krok === 3 && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              Krok 3 — Domyślne czasy odpoczynku
            </div>
            {(["standardowy", "skrocony", "auto"] as const).map((v) => (
              <button
                key={v}
                className={`btn ${trybOdpoczynku === v ? "btn-primary" : "btn-secondary"}`}
                style={{ marginBottom: 8 }}
                onClick={() => setTrybOdpoczynku(v)}
              >
                {v === "standardowy" && "Standardowy (11 h)"}
                {v === "skrocony" && "Skrócony (9 h), gdy dostępny"}
                {v === "auto" && "Automatyczny (silnik wybiera najlepszy)"}
              </button>
            ))}
          </div>
        )}

        {krok === 4 && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              Krok 4 — Domyślny zapas czasu
            </div>
            <div className="row-3">
              {ZAPASY.map((v) => (
                <button
                  key={v}
                  className={`btn btn-sm ${zapas === v ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setZapas(v)}
                >
                  {v >= 60 ? `${v / 60} godz.` : `${v} min`}
                </button>
              ))}
            </div>
          </div>
        )}

        {krok === 5 && (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div className="section-title" style={{ marginTop: 0 }}>
              Krok 5 — Gotowe
            </div>
            <p style={{ color: "var(--text-dim)" }}>
              {nazwaPojazdu} · {nazwaKierowcy} · zapas {zapas} min. Możesz to zmienić później w Ustawieniach.
            </p>
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 16 }}>
          {krok > 1 && (
            <button className="btn btn-secondary" onClick={() => setKrok(krok - 1)}>
              Wstecz
            </button>
          )}
          <button className="btn btn-primary" onClick={dalej}>
            {krok < 5 ? "Dalej" : "Zacznij korzystać z TachoPlan"}
          </button>
        </div>
      </div>
    </div>
  );
}
