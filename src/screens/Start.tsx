import { useEffect, useMemo, useState } from "react";
import Segmented from "../components/Segmented";
import DurationInput from "../components/DurationInput";
import Disclaimer from "../components/Disclaimer";
import RouteBuilder, { type RouteBuilderResult } from "../components/Route/RouteBuilder";
import { planTripBackward, szybkaKalkulacja } from "../engine/tripPlanner";
import { formatHM, formatHMSlownie } from "../format";
import type { OpcjePlanowania, TachographState, ZapisanaTrasa } from "../types";
import type { TachographRules } from "../tachographRules";
import type { AktualnyPlan } from "../App";

type TrybFormularza = "prosty" | "profesjonalny";
type TrybCzasu = "recznie" | "km" | "mapa";

const OPCJE_ZAPASU = [
  { value: 0, label: "0 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 godz." },
  { value: 120, label: "2 godz." },
];

function domyslnaDataPrzyjazdu(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  // format wymagany przez <input type="datetime-local">
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function StartScreen({
  opcje,
  stanTachografu,
  rules,
  trasaDoEdycji,
  onEdycjaZakonczona,
  onCompute,
  onOpenCzyZdaze,
}: {
  opcje: OpcjePlanowania;
  stanTachografu: TachographState;
  rules: TachographRules;
  trasaDoEdycji: ZapisanaTrasa | null;
  onEdycjaZakonczona: () => void;
  onCompute: (plan: AktualnyPlan) => void;
  onOpenCzyZdaze: () => void;
}) {
  const [tryb, setTryb] = useState<TrybFormularza>("prosty");
  const [start, setStart] = useState("");
  const [cel, setCel] = useState("");
  const [wymaganyPrzyjazd, setWymaganyPrzyjazd] = useState(domyslnaDataPrzyjazdu());
  const [trybCzasu, setTrybCzasu] = useState<TrybCzasu>("recznie");
  const [czasJazdyMin, setCzasJazdyMin] = useState(0);
  const [km, setKm] = useState<number | "">("");
  const [predkosc, setPredkosc] = useState<number | "">(70);
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [trasaZMapy, setTrasaZMapy] = useState<RouteBuilderResult | null>(null);
  const [zapasCzasu, setZapasCzasu] = useState<number>(opcje.zapasCzasuMin);
  const [zapasWlasny, setZapasWlasny] = useState<number | "">("");

  // pola trybu profesjonalnego
  const [jazdaOdOstatniejPrzerwy, setJazdaOdOstatniejPrzerwy] = useState(
    stanTachografu.jazdaOdOstatniejPrzerwyMin
  );
  const [jazdaDzisiaj, setJazdaDzisiaj] = useState(stanTachografu.jazdaDzisiajMin);
  const [jazdaWTymTygodniu, setJazdaWTymTygodniu] = useState(stanTachografu.jazdaWTymTygodniuMin);
  const [jazdaWPoprzednimTygodniu, setJazdaWPoprzednimTygodniu] = useState(
    stanTachografu.jazdaWPoprzednimTygodniuMin
  );
  const [wydluzoneDni, setWydluzoneDni] = useState(stanTachografu.wykorzystaneWydluzoneDni);
  const [skroconeOdpoczynki, setSkroconeOdpoczynki] = useState(
    stanTachografu.wykorzystaneSkroconeOdpoczynki
  );

  const [blad, setBlad] = useState<string | null>(null);

  // szybka kalkulacja
  const [szybkaMin, setSzybkaMin] = useState(0);

  useEffect(() => {
    if (!trasaDoEdycji) return;
    setStart(trasaDoEdycji.start);
    setCel(trasaDoEdycji.cel);
    setWymaganyPrzyjazd(trasaDoEdycji.wymaganyPrzyjazdIso);
    setCzasJazdyMin(trasaDoEdycji.czasJazdyMin);
    setZapasCzasu(trasaDoEdycji.opcje.zapasCzasuMin);
    setJazdaOdOstatniejPrzerwy(trasaDoEdycji.stanTachografu.jazdaOdOstatniejPrzerwyMin);
    setJazdaDzisiaj(trasaDoEdycji.stanTachografu.jazdaDzisiajMin);
    setJazdaWTymTygodniu(trasaDoEdycji.stanTachografu.jazdaWTymTygodniuMin);
    setJazdaWPoprzednimTygodniu(trasaDoEdycji.stanTachografu.jazdaWPoprzednimTygodniuMin);
    setWydluzoneDni(trasaDoEdycji.stanTachografu.wykorzystaneWydluzoneDni);
    setSkroconeOdpoczynki(trasaDoEdycji.stanTachografu.wykorzystaneSkroconeOdpoczynki);
    setWaypoints(trasaDoEdycji.waypoints ?? []);
    setTryb("profesjonalny");
    onEdycjaZakonczona();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trasaDoEdycji]);

  const czasZKm = useMemo(() => {
    if (trybCzasu !== "km") return null;
    const k = typeof km === "number" ? km : 0;
    const p = typeof predkosc === "number" ? predkosc : 0;
    if (k <= 0 || p <= 0) return 0;
    return Math.round((k / p) * 60);
  }, [trybCzasu, km, predkosc]);

  const efektywnyCzasJazdy =
    trybCzasu === "km" ? czasZKm ?? 0 : trybCzasu === "mapa" ? trasaZMapy?.czasJazdyMin ?? 0 : czasJazdyMin;
  const efektywnyZapas = zapasWlasny !== "" ? Number(zapasWlasny) : zapasCzasu;

  const szybki = useMemo(() => szybkaKalkulacja(szybkaMin, rules, opcje), [szybkaMin, rules, opcje]);

  function oblicz() {
    setBlad(null);
    if (!start.trim() || !cel.trim()) {
      setBlad("Podaj miejsce startu i cel podróży.");
      return;
    }
    if (!efektywnyCzasJazdy || efektywnyCzasJazdy <= 0) {
      setBlad("Podaj czas jazdy większy od zera.");
      return;
    }
    const przyjazdDate = new Date(wymaganyPrzyjazd);
    if (isNaN(przyjazdDate.getTime())) {
      setBlad("Podaj poprawną datę i godzinę przyjazdu.");
      return;
    }

    const stan: TachographState =
      tryb === "profesjonalny"
        ? {
            jazdaOdOstatniejPrzerwyMin: jazdaOdOstatniejPrzerwy,
            jazdaDzisiajMin: jazdaDzisiaj,
            jazdaWTymTygodniuMin: jazdaWTymTygodniu,
            jazdaWPoprzednimTygodniuMin: jazdaWPoprzednimTygodniu,
            wykorzystaneWydluzoneDni: wydluzoneDni,
            wykorzystaneSkroconeOdpoczynki: skroconeOdpoczynki,
          }
        : {
            jazdaOdOstatniejPrzerwyMin: 0,
            jazdaDzisiajMin: 0,
            jazdaWTymTygodniuMin: 0,
            jazdaWPoprzednimTygodniuMin: 0,
            wykorzystaneWydluzoneDni: 0,
            wykorzystaneSkroconeOdpoczynki: 0,
          };

    const opcjeUzyte: OpcjePlanowania = { ...opcje, zapasCzasuMin: efektywnyZapas };

    const wynik = planTripBackward(efektywnyCzasJazdy, przyjazdDate, stan, opcjeUzyte, rules);

    onCompute({
      start: start.trim(),
      cel: cel.trim(),
      wymaganyPrzyjazdIso: wymaganyPrzyjazd,
      czasJazdyMin: efektywnyCzasJazdy,
      opcje: opcjeUzyte,
      stanTachografu: stan,
      wynik,
      zapisanaTrasaId: trasaDoEdycji?.id,
      waypoints: waypoints.filter((w) => w.trim()),
      dystansKm: trasaZMapy?.dystansKm,
      kraje: trasaZMapy?.kraje,
    });
  }

  return (
    <div className="screen">
      <div className="section-title">Nowa trasa</div>
      <div className="card">
        <Segmented
          value={tryb}
          onChange={setTryb}
          options={[
            { value: "prosty", label: "Tryb prosty" },
            { value: "profesjonalny", label: "Mój tachograf" },
          ]}
        />

        <div className="field">
          <label>📍 Miejsce startu</label>
          <input
            type="text"
            placeholder="np. Bielsko-Biała, Polska"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div className="field">
          <label>🏁 Cel podróży</label>
          <input
            type="text"
            placeholder="np. Pomigliano d'Arco, Włochy"
            value={cel}
            onChange={(e) => setCel(e.target.value)}
          />
        </div>

        <div className="field">
          <label>📅 Muszę być na miejscu</label>
          <input
            type="datetime-local"
            value={wymaganyPrzyjazd}
            onChange={(e) => setWymaganyPrzyjazd(e.target.value)}
          />
        </div>

        <div className="field">
          <label>🚛 Czas jazdy według mapy</label>
          <Segmented
            value={trybCzasu}
            onChange={setTrybCzasu}
            options={[
              { value: "recznie", label: "Wpisz czas" },
              { value: "km", label: "Km + prędkość" },
              { value: "mapa", label: "Z mapy" },
            ]}
          />
          {trybCzasu === "recznie" && (
            <DurationInput label="" minutes={czasJazdyMin} onChange={setCzasJazdyMin} maxHours={200} />
          )}
          {trybCzasu === "km" && (
            <>
              <div className="row-2">
                <input
                  type="number"
                  placeholder="km"
                  value={km}
                  onChange={(e) => setKm(e.target.value === "" ? "" : Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="śr. km/h"
                  value={predkosc}
                  onChange={(e) => setPredkosc(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="hint">
                Szacowany czas jazdy: {formatHMSlownie(czasZKm ?? 0)}
              </div>
            </>
          )}
          {trybCzasu === "mapa" && (
            <>
              <RouteBuilder
                start={start}
                cel={cel}
                waypoints={waypoints}
                onWaypointsChange={setWaypoints}
                onResult={setTrasaZMapy}
                sredniaPredkoscKmH={typeof predkosc === "number" ? predkosc : 70}
              />
              {trasaZMapy && (
                <div className="hint" style={{ marginTop: 10 }}>
                  {trasaZMapy.dystansKm} km · czas jazdy: {formatHMSlownie(trasaZMapy.czasJazdyMin)}
                  {!trasaZMapy.rzeczywistaTrasa && " (orientacyjnie, linia prosta)"}
                </div>
              )}
            </>
          )}
        </div>

        {tryb === "profesjonalny" && (
          <>
            <div className="section-title" style={{ margin: "16px 2px 8px" }}>
              Mój tachograf — aktualny stan
            </div>
            <DurationInput
              label="Aktualna jazda dzisiaj"
              minutes={jazdaDzisiaj}
              onChange={setJazdaDzisiaj}
              maxHours={16}
            />
            <DurationInput
              label="Jazda od ostatniej wymaganej przerwy"
              minutes={jazdaOdOstatniejPrzerwy}
              onChange={setJazdaOdOstatniejPrzerwy}
              maxHours={16}
            />
            <DurationInput
              label="Jazda w bieżącym tygodniu"
              minutes={jazdaWTymTygodniu}
              onChange={setJazdaWTymTygodniu}
              maxHours={70}
            />
            <DurationInput
              label="Jazda w poprzednim tygodniu"
              minutes={jazdaWPoprzednimTygodniu}
              onChange={setJazdaWPoprzednimTygodniu}
              maxHours={70}
            />
            <div className="field">
              <label>Dostępne przedłużenia dziennego czasu jazdy (wykorzystane)</label>
              <select value={wydluzoneDni} onChange={(e) => setWydluzoneDni(Number(e.target.value))}>
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
                value={skroconeOdpoczynki}
                onChange={(e) => setSkroconeOdpoczynki(Number(e.target.value) || 0)}
              />
            </div>
          </>
        )}

        <div className="field">
          <label>⏳ Zapas czasu</label>
          <div className="row-3">
            {OPCJE_ZAPASU.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`btn btn-sm ${zapasCzasu === o.value && zapasWlasny === "" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setZapasCzasu(o.value);
                  setZapasWlasny("");
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="własna wartość (min)"
            value={zapasWlasny}
            onChange={(e) => setZapasWlasny(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ marginTop: 8 }}
          />
        </div>

        {blad && <div className="warning-box">{blad}</div>}

        <button className="btn btn-primary" onClick={oblicz}>
          OBLICZ TRASĘ
        </button>
      </div>

      <button className="btn btn-secondary" onClick={onOpenCzyZdaze} style={{ marginBottom: 18 }}>
        ⏱️ CZY ZDĄŻĘ?
      </button>

      <div className="section-title">Szybka kalkulacja</div>
      <div className="card">
        <DurationInput
          label="Czas jazdy"
          minutes={szybkaMin}
          onChange={setSzybkaMin}
          maxHours={200}
        />
        {szybkaMin > 0 && (
          <>
            <div className="quick-calc-result">
              <span className="qc-label">Jazda</span>
              <span>{formatHM(szybki.jazdaMin)}</span>
            </div>
            <div className="quick-calc-result">
              <span className="qc-label">Przerwy</span>
              <span>{formatHM(szybki.przerwyMin)}</span>
            </div>
            <div className="quick-calc-result">
              <span className="qc-label">Odpoczynek</span>
              <span>{formatHM(szybki.odpoczynkiMin)}</span>
            </div>
            <div className="quick-calc-result">
              <span className="qc-label">Łączny minimalny czas podróży</span>
              <span>{formatHM(szybki.calkowityCzasMin)}</span>
            </div>
          </>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}
