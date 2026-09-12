import { useEffect, useState } from "react";
import ProgressTile from "../components/ProgressTile";
import DurationInput from "../components/DurationInput";
import Disclaimer from "../components/Disclaimer";
import type { TachographState } from "../types";
import type { TachographRules } from "../tachographRules";

export default function TachografScreen({
  stan,
  rules,
  onZapisz,
  onClose,
}: {
  stan: TachographState;
  rules: TachographRules;
  onZapisz: (s: TachographState) => void;
  onClose: () => void;
}) {
  const [edycja, setEdycja] = useState(false);
  const [lokalny, setLokalny] = useState<TachographState>(stan);

  useEffect(() => setLokalny(stan), [stan]);

  const dzienLimit = rules.standardowyDziennyLimitJazdy.value;
  const tydzienLimit = rules.maksymalnaJazdaTygodniowa.value;
  const dwaTygLimit = rules.maksymalnaJazdaWDwochTygodniach.value;
  const dwaTygSuma = stan.jazdaWTymTygodniuMin + stan.jazdaWPoprzednimTygodniuMin;

  return (
    <div className="overlay-screen">
      <div className="back-row">
        <button className="back-btn" onClick={onClose}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 19 }}>⏱️ Mój tachograf</h2>
      </div>
      <div className="screen">

      <ProgressTile
        icon="🚚"
        title="JAZDA OD OSTATNIEJ PRZERWY"
        wartoscMin={stan.jazdaOdOstatniejPrzerwyMin}
        maxMin={rules.maksymalnaJazdaBezPrzerwy.value}
      />
      <ProgressTile
        icon="🚚"
        title="JAZDA DZISIAJ"
        wartoscMin={stan.jazdaDzisiajMin}
        maxMin={dzienLimit}
        note={`Wydłużony limit dostępny: ${
          stan.wykorzystaneWydluzoneDni < rules.maksymalnaLiczbaWydluzonychDni.value ? "tak" : "nie"
        }`}
      />
      <ProgressTile
        icon="📅"
        title="JAZDA W TYM TYGODNIU"
        wartoscMin={stan.jazdaWTymTygodniuMin}
        maxMin={tydzienLimit}
      />
      <ProgressTile
        icon="📅"
        title="DWA OSTATNIE TYGODNIE"
        wartoscMin={dwaTygSuma}
        maxMin={dwaTygLimit}
      />

      <div className="row-2">
        <div className="tile">
          <div className="tile-title">🔵 DNI 10-GODZINNE</div>
          <div className="tile-values" style={{ marginTop: 8 }}>
            {stan.wykorzystaneWydluzoneDni} / {rules.maksymalnaLiczbaWydluzonychDni.value}
          </div>
          <div className="tile-note">wykorzystane w tygodniu</div>
        </div>
        <div className="tile">
          <div className="tile-title">🟣 SKRÓCONE ODPOCZYNKI</div>
          <div className="tile-values" style={{ marginTop: 8 }}>
            {stan.wykorzystaneSkroconeOdpoczynki} / {rules.maksymalnaLiczbaSkroconychOdpoczynkow.value}
          </div>
          <div className="tile-note">od odpoczynku tygodniowego</div>
        </div>
      </div>

      {!edycja ? (
        <button className="btn btn-secondary" onClick={() => setEdycja(true)} style={{ margin: "8px 0 20px" }}>
          ✏️ Edytuj mój stan
        </button>
      ) : (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            Edytuj aktualny stan
          </div>
          <DurationInput
            label="Jazda od ostatniej wymaganej przerwy"
            minutes={lokalny.jazdaOdOstatniejPrzerwyMin}
            onChange={(m) => setLokalny((s) => ({ ...s, jazdaOdOstatniejPrzerwyMin: m }))}
            maxHours={16}
          />
          <DurationInput
            label="Aktualna jazda dzisiaj"
            minutes={lokalny.jazdaDzisiajMin}
            onChange={(m) => setLokalny((s) => ({ ...s, jazdaDzisiajMin: m }))}
            maxHours={16}
          />
          <DurationInput
            label="Jazda w bieżącym tygodniu"
            minutes={lokalny.jazdaWTymTygodniuMin}
            onChange={(m) => setLokalny((s) => ({ ...s, jazdaWTymTygodniuMin: m }))}
            maxHours={70}
          />
          <DurationInput
            label="Jazda w poprzednim tygodniu"
            minutes={lokalny.jazdaWPoprzednimTygodniuMin}
            onChange={(m) => setLokalny((s) => ({ ...s, jazdaWPoprzednimTygodniuMin: m }))}
            maxHours={70}
          />
          <div className="field">
            <label>Wykorzystane wydłużone dni (10 h)</label>
            <select
              value={lokalny.wykorzystaneWydluzoneDni}
              onChange={(e) =>
                setLokalny((s) => ({ ...s, wykorzystaneWydluzoneDni: Number(e.target.value) }))
              }
            >
              <option value={0}>0 / {rules.maksymalnaLiczbaWydluzonychDni.value}</option>
              <option value={1}>1 / {rules.maksymalnaLiczbaWydluzonychDni.value}</option>
              <option value={2}>2 / {rules.maksymalnaLiczbaWydluzonychDni.value}</option>
            </select>
          </div>
          <div className="field">
            <label>Wykorzystane skrócone odpoczynki dobowe</label>
            <input
              type="number"
              min={0}
              max={rules.maksymalnaLiczbaSkroconychOdpoczynkow.value}
              value={lokalny.wykorzystaneSkroconeOdpoczynki}
              onChange={(e) =>
                setLokalny((s) => ({
                  ...s,
                  wykorzystaneSkroconeOdpoczynki: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={() => {
                onZapisz(lokalny);
                setEdycja(false);
              }}
            >
              Zapisz
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setLokalny(stan);
                setEdycja(false);
              }}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      <Disclaimer />
      </div>
    </div>
  );
}
