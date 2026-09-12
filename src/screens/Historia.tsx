import { useEffect, useState } from "react";
import Segmented from "../components/Segmented";
import { planTripBackward } from "../engine/tripPlanner";
import { formatDzienGodzina, formatHMSlownie } from "../format";
import { dodajOrAktualizujTrase, powielTrase, usunTrase, wczytajTrasy } from "../storage";
import type { ZapisanaTrasa } from "../types";
import type { TachographRules } from "../tachographRules";
import type { AktualnyPlan } from "../App";

export default function HistoriaScreen({
  rules,
  onOtworz,
  onEdytuj,
}: {
  rules: TachographRules;
  onOtworz: (plan: AktualnyPlan) => void;
  onEdytuj: (t: ZapisanaTrasa) => void;
}) {
  const [trasy, setTrasy] = useState<ZapisanaTrasa[]>([]);
  const [filtr, setFiltr] = useState<"wszystkie" | "ulubione">("wszystkie");

  useEffect(() => {
    setTrasy(wczytajTrasy());
  }, []);

  function odswiez() {
    setTrasy(wczytajTrasy());
  }

  function przelaczUlubiona(t: ZapisanaTrasa) {
    dodajOrAktualizujTrase({ ...t, ulubiona: !t.ulubiona });
    odswiez();
  }

  const widoczne = filtr === "ulubione" ? trasy.filter((t) => t.ulubiona) : trasy;

  function otworz(t: ZapisanaTrasa) {
    const wynik = planTripBackward(
      t.czasJazdyMin,
      new Date(t.wymaganyPrzyjazdIso),
      t.stanTachografu,
      t.opcje,
      rules
    );
    onOtworz({
      start: t.start,
      cel: t.cel,
      wymaganyPrzyjazdIso: t.wymaganyPrzyjazdIso,
      czasJazdyMin: t.czasJazdyMin,
      opcje: t.opcje,
      stanTachografu: t.stanTachografu,
      wynik,
      zapisanaTrasaId: t.id,
      waypoints: t.waypoints,
      dystansKm: t.dystansKm,
    });
  }

  function usun(id: string) {
    if (!confirm("Usunąć tę trasę?")) return;
    usunTrase(id);
    odswiez();
  }

  function powiel(id: string) {
    powielTrase(id);
    odswiez();
  }

  return (
    <div className="screen">
      <div className="section-title">Moje trasy</div>

      <Segmented
        value={filtr}
        onChange={setFiltr}
        options={[
          { value: "wszystkie", label: "Wszystkie" },
          { value: "ulubione", label: "⭐ Ulubione" },
        ]}
      />

      {widoczne.length === 0 && (
        <div className="empty-state">
          <span className="emoji">📂</span>
          <p>{filtr === "ulubione" ? "Nie masz jeszcze ulubionych tras." : "Nie masz jeszcze zapisanych tras."}</p>
        </div>
      )}

      {widoczne.map((t) => (
        <div className="route-card" key={t.id}>
          <div className="rc-places">
            <button
              onClick={() => przelaczUlubiona(t)}
              style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: 0 }}
              title={t.ulubiona ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
            >
              {t.ulubiona ? "⭐" : "☆"}
            </button>
            📍 {t.wlasnaNazwa ?? t.start} <span style={{ color: "var(--text-faint)" }}>→</span> 🏁 {t.cel}
          </div>
          <div className="rc-meta">
            <span>📅 {formatDzienGodzina(new Date(t.wymaganyPrzyjazdIso))}</span>
            <span>⏱️ {formatHMSlownie(t.czasJazdyMin)}</span>
            {t.dystansKm ? <span>📏 {t.dystansKm} km</span> : null}
          </div>
          <div className="rc-actions">
            <button className="btn btn-primary" onClick={() => otworz(t)}>
              Otwórz
            </button>
            <button className="btn btn-secondary" onClick={() => onEdytuj(t)}>
              Edytuj
            </button>
            <button className="btn btn-secondary" onClick={() => powiel(t.id)}>
              Powiel
            </button>
            <button className="btn btn-danger" onClick={() => usun(t.id)}>
              Usuń
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
