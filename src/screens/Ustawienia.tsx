import { useState } from "react";
import Segmented from "../components/Segmented";
import Switch from "../components/Switch";
import Disclaimer from "../components/Disclaimer";
import VehicleDriverSettings from "../components/VehicleDriverSettings";
import { RULES_VERSION, resetRules, type RuleNumber, type RuleToggle, type TachographRules } from "../tachographRules";
import { formatHM } from "../format";
import type { OpcjePlanowania, TrybLimituDziennego, TrybOdpoczynku } from "../types";

const RULE_NUMBER_KEYS: (keyof TachographRules)[] = [
  "maksymalnaJazdaBezPrzerwy",
  "standardowaPrzerwa",
  "standardowyDziennyLimitJazdy",
  "wydluzonyDziennyLimitJazdy",
  "maksymalnaLiczbaWydluzonychDni",
  "standardowyOdpoczynekDobowy",
  "skroconyOdpoczynekDobowy",
  "maksymalnaLiczbaSkroconychOdpoczynkow",
  "maksymalnaJazdaTygodniowa",
  "maksymalnaJazdaWDwochTygodniach",
  "domyslnyZapasCzasu",
];

const RULE_TOGGLE_KEYS: (keyof TachographRules)[] = [
  "dopuszczajPodzielonaPrzerwe",
  "pozwolNaWydluzonyLimitDzienny",
  "pozwolNaSkroconyOdpoczynek",
  "pilnujLimitowTygodniowych",
];

export default function UstawieniaScreen({
  rules,
  opcje,
  onRules,
  onOpcje,
  onOtworzTachograf,
}: {
  rules: TachographRules;
  opcje: OpcjePlanowania;
  onRules: (r: TachographRules) => void;
  onOpcje: (o: OpcjePlanowania) => void;
  onOtworzTachograf: () => void;
}) {
  const [zapasWlasny, setZapasWlasny] = useState<number | "">("");

  function setNumber(klucz: keyof TachographRules, value: number) {
    const r = rules[klucz] as RuleNumber;
    onRules({ ...rules, [klucz]: { ...r, value } });
  }

  function setToggle(klucz: keyof TachographRules, enabled: boolean) {
    const r = rules[klucz] as RuleToggle;
    onRules({ ...rules, [klucz]: { ...r, enabled } });
  }

  return (
    <div className="screen">
      <button className="btn btn-secondary" onClick={onOtworzTachograf} style={{ marginBottom: 16 }}>
        ⏱️ Mój tachograf — aktualny stan
      </button>

      <VehicleDriverSettings />

      <div className="section-title">Ustawienia planowania</div>
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Czas odpoczynku</div>
        <Segmented<TrybOdpoczynku>
          value={opcje.trybOdpoczynku}
          onChange={(v) => onOpcje({ ...opcje, trybOdpoczynku: v })}
          options={[
            { value: "standardowy", label: "Standardowy" },
            { value: "skrocony", label: "Skrócony" },
            { value: "auto", label: "Automatyczny" },
          ]}
        />

        <div style={{ fontWeight: 700, margin: "10px 0 8px" }}>Limit dziennej jazdy</div>
        <Segmented<TrybLimituDziennego>
          value={opcje.trybLimituDziennego}
          onChange={(v) => onOpcje({ ...opcje, trybLimituDziennego: v })}
          options={[
            { value: "standardowy", label: "Standardowy" },
            { value: "wydluzony", label: "Wydłużony" },
            { value: "auto", label: "Automatyczny" },
          ]}
        />

        <div style={{ fontWeight: 700, margin: "10px 0 8px" }}>Domyślny zapas czasu</div>
        <div className="row-3">
          {[0, 15, 30, 60, 120].map((v) => (
            <button
              key={v}
              type="button"
              className={`btn btn-sm ${opcje.zapasCzasuMin === v && zapasWlasny === "" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setZapasWlasny("");
                onOpcje({ ...opcje, zapasCzasuMin: v });
              }}
            >
              {v >= 60 ? `${v / 60} godz.` : `${v} min`}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="własna wartość (min)"
          value={zapasWlasny}
          onChange={(e) => {
            const val = e.target.value === "" ? "" : Number(e.target.value);
            setZapasWlasny(val);
            if (val !== "") onOpcje({ ...opcje, zapasCzasuMin: val });
          }}
          style={{ marginTop: 8 }}
        />
      </div>

      <div className="section-title">Silnik reguł (tachographRules.ts) — wersja {RULES_VERSION}</div>
      <div className="card">
        {RULE_NUMBER_KEYS.map((klucz) => {
          const r = rules[klucz] as RuleNumber;
          return (
            <div className="setting-row" key={klucz}>
              <div className="sr-text">
                <div className="sr-title">{r.label}</div>
                <div className="sr-desc">{r.description}</div>
              </div>
              {r.jednostka === "czas" ? (
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={r.value}
                  onChange={(e) => setNumber(klucz, Number(e.target.value) || 0)}
                  title={`${formatHM(r.value)} h`}
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  value={r.value}
                  onChange={(e) => setNumber(klucz, Number(e.target.value) || 0)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        {RULE_TOGGLE_KEYS.map((klucz) => {
          const r = rules[klucz] as RuleToggle;
          return (
            <div className="setting-row" key={klucz}>
              <div className="sr-text">
                <div className="sr-title">{r.label}</div>
                <div className="sr-desc">{r.description}</div>
              </div>
              <Switch checked={r.enabled} onChange={(v) => setToggle(klucz, v)} />
            </div>
          );
        })}
      </div>

      <button
        className="btn btn-secondary"
        onClick={() => {
          if (confirm("Przywrócić domyślne ustawienia reguł?")) onRules(resetRules());
        }}
        style={{ marginBottom: 20 }}
      >
        Przywróć domyślne reguły
      </button>

      <Disclaimer />
    </div>
  );
}
