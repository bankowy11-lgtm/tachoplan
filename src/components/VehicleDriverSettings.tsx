// VehicleDriverSettings.tsx — profile pojazdu (§28, wiele pojazdów) i
// kierowcy (§29). Architektura pod tryb dwóch kierowców (§30) jest
// zapewniona przez to, że `ProfilKierowcy[]` już jest listą, nie jednym
// obiektem — dodanie drugiego aktywnego kierowcy i przełączania zmiany nie
// wymaga zmiany typów, tylko UI (poza zakresem Etapu 1).

import { useEffect, useState } from "react";
import {
  dodajOrAktualizujKierowce,
  dodajOrAktualizujPojazd,
  usunKierowce,
  usunPojazd,
  wczytajKierowcow,
  wczytajPojazdy,
} from "../storage";
import type { ProfilKierowcy, ProfilPojazdu, RodzajPojazdu } from "../types";
import { pelniWypoczetyStan } from "../types";

const RODZAJE: { value: RodzajPojazdu; label: string; icon: string }[] = [
  { value: "bus", label: "Bus do 3,5 t", icon: "🚐" },
  { value: "ciezarowy", label: "Ciężarowy", icon: "🚛" },
  { value: "inny", label: "Inny", icon: "👥" },
];

export default function VehicleDriverSettings() {
  const [pojazdy, setPojazdy] = useState<ProfilPojazdu[]>([]);
  const [kierowcy, setKierowcy] = useState<ProfilKierowcy[]>([]);
  const [nowyPojazd, setNowyPojazd] = useState("");
  const [rodzajNowegoPojazdu, setRodzajNowegoPojazdu] = useState<RodzajPojazdu>("bus");
  const [nowyKierowca, setNowyKierowca] = useState("");

  useEffect(() => {
    setPojazdy(wczytajPojazdy());
    setKierowcy(wczytajKierowcow());
  }, []);

  function dodajPojazd() {
    if (!nowyPojazd.trim()) return;
    const lista = dodajOrAktualizujPojazd({
      id: crypto.randomUUID(),
      nazwa: nowyPojazd.trim(),
      rodzaj: rodzajNowegoPojazdu,
    });
    setPojazdy(lista);
    setNowyPojazd("");
  }

  function edytujDmc(p: ProfilPojazdu, dmcKg: number) {
    setPojazdy(dodajOrAktualizujPojazd({ ...p, dmcKg }));
  }

  function edytujPredkosc(p: ProfilPojazdu, v: number) {
    setPojazdy(dodajOrAktualizujPojazd({ ...p, sredniaPredkoscKmH: v }));
  }

  function usun(id: string) {
    setPojazdy(usunPojazd(id));
  }

  function dodajKierowce() {
    if (!nowyKierowca.trim()) return;
    const lista = dodajOrAktualizujKierowce({
      id: crypto.randomUUID(),
      nazwa: nowyKierowca.trim(),
      stan: { ...pelniWypoczetyStan },
    });
    setKierowcy(lista);
    setNowyKierowca("");
  }

  function usunKier(id: string) {
    setKierowcy(usunKierowce(id));
  }

  return (
    <>
      <div className="section-title">🚛 Pojazdy</div>
      <div className="card">
        {pojazdy.map((p) => (
          <div className="setting-row" key={p.id}>
            <div className="sr-text">
              <div className="sr-title">
                {RODZAJE.find((r) => r.value === p.rodzaj)?.icon} {p.nazwa}
              </div>
              <div className="sr-desc" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <label>
                  DMC (kg){" "}
                  <input
                    type="number"
                    style={{ width: 76 }}
                    value={p.dmcKg ?? ""}
                    onChange={(e) => edytujDmc(p, Number(e.target.value) || 0)}
                  />
                </label>
                <label>
                  śr. km/h{" "}
                  <input
                    type="number"
                    style={{ width: 60 }}
                    value={p.sredniaPredkoscKmH ?? ""}
                    onChange={(e) => edytujPredkosc(p, Number(e.target.value) || 0)}
                  />
                </label>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => usun(p.id)}>
              Usuń
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <select
            value={rodzajNowegoPojazdu}
            onChange={(e) => setRodzajNowegoPojazdu(e.target.value as RodzajPojazdu)}
            style={{ width: 130 }}
          >
            {RODZAJE.map((r) => (
              <option key={r.value} value={r.value}>
                {r.icon} {r.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="np. Mój bus"
            value={nowyPojazd}
            onChange={(e) => setNowyPojazd(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" style={{ width: "auto", padding: "0 14px" }} onClick={dodajPojazd}>
            ＋
          </button>
        </div>
      </div>

      <div className="section-title">🧑‍✈️ Kierowcy</div>
      <div className="card">
        {kierowcy.map((k) => (
          <div className="setting-row" key={k.id}>
            <div className="sr-text">
              <div className="sr-title">{k.nazwa}</div>
              <div className="sr-desc">Stan tachografu edytujesz na ekranie „Mój tachograf”.</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => usunKier(k.id)}>
              Usuń
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <input
            type="text"
            placeholder="np. Kierowca 2"
            value={nowyKierowca}
            onChange={(e) => setNowyKierowca(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" style={{ width: "auto", padding: "0 14px" }} onClick={dodajKierowce}>
            ＋
          </button>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          Architektura wspiera wielu kierowców (np. tryb dwóch kierowców) — pełne planowanie zmian kierowców na
          jednej trasie to Etap 2.
        </div>
      </div>
    </>
  );
}
