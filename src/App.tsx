import { useState } from "react";
import BottomNav, { type Tab } from "./components/BottomNav";
import { loadRules, saveRules, type TachographRules } from "./tachographRules";
import {
  dodajOrAktualizujKierowce,
  dodajOrAktualizujPojazd,
  wczytajOpcje,
  wczytajStanTachografu,
  wczytajUstawieniaApp,
  zapiszOpcje,
  zapiszStanTachografu,
  zapiszUstawieniaApp,
} from "./storage";
import type { OpcjePlanowania, TachographState, UstawieniaAplikacji, ZapisanaTrasa } from "./types";
import type { WynikPlanowaniaWstecz } from "./engine/tripPlanner";

import StartScreen from "./screens/Start";
import TrasaScreen from "./screens/Trasa";
import JazdaScreen from "./screens/Jazda";
import ParkingiScreen from "./screens/Parkingi";
import TachografScreen from "./screens/Tachograf";
import HistoriaScreen from "./screens/Historia";
import UstawieniaScreen from "./screens/Ustawienia";
import CzyZdazeScreen from "./screens/CzyZdaze";
import Wizard from "./screens/Wizard";

export interface AktualnyPlan {
  start: string;
  cel: string;
  wymaganyPrzyjazdIso: string;
  czasJazdyMin: number;
  opcje: OpcjePlanowania;
  stanTachografu: TachographState;
  wynik: WynikPlanowaniaWstecz;
  zapisanaTrasaId?: string;
  waypoints?: string[];
  dystansKm?: number;
  kraje?: string[];
}

export default function App() {
  const [tab, setTabState] = useState<Tab>("start");
  const [rules, setRulesState] = useState<TachographRules>(() => loadRules());
  const [opcje, setOpcjeState] = useState<OpcjePlanowania>(() => wczytajOpcje());
  const [stanTachografu, setStanTachografuState] = useState<TachographState>(() =>
    wczytajStanTachografu()
  );
  const [ustawieniaApp, setUstawieniaAppState] = useState<UstawieniaAplikacji>(() => wczytajUstawieniaApp());
  const [pokazTachograf, setPokazTachograf] = useState(false);
  const [aktualnyPlan, setAktualnyPlan] = useState<AktualnyPlan | null>(null);
  const [czyZdazeOtwarte, setCzyZdazeOtwarte] = useState(false);
  const [trasaDoEdycji, setTrasaDoEdycji] = useState<ZapisanaTrasa | null>(null);

  function setTab(t: Tab) {
    // Wyjście z Trybu kierowcy przy zmianie zakładki, żeby nie "zablokować" nawigacji.
    if (ustawieniaApp.trybKierowcy) updateUstawieniaApp({ ...ustawieniaApp, trybKierowcy: false });
    setTabState(t);
  }

  function updateRules(r: TachographRules) {
    setRulesState(r);
    saveRules(r);
  }

  function updateOpcje(o: OpcjePlanowania) {
    setOpcjeState(o);
    zapiszOpcje(o);
  }

  function updateStanTachografu(s: TachographState) {
    setStanTachografuState(s);
    zapiszStanTachografu(s);
  }

  function updateUstawieniaApp(u: UstawieniaAplikacji) {
    setUstawieniaAppState(u);
    zapiszUstawieniaApp(u);
  }

  function otworzTraseZHistorii(plan: AktualnyPlan) {
    setAktualnyPlan(plan);
    setTab("trasa");
  }

  function edytujTrase(t: ZapisanaTrasa) {
    setTrasaDoEdycji(t);
    setTab("start");
  }

  if (!ustawieniaApp.kreatorZakonczony) {
    return (
      <div className="app-shell">
        <Wizard
          onZakoncz={({ pojazd, kierowca, opcje: opcjeZKreatora }) => {
            dodajOrAktualizujPojazd(pojazd);
            dodajOrAktualizujKierowce(kierowca);
            updateOpcje(opcjeZKreatora);
            updateUstawieniaApp({
              ...ustawieniaApp,
              kreatorZakonczony: true,
              aktywnyPojazdId: pojazd.id,
              aktywnyKierowcaId: kierowca.id,
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!ustawieniaApp.trybKierowcy && (
        <div className="app-header">
          <h1>🚛 TachoPlan</h1>
          <p className="subtitle">Planuj trasę. Pilnuj czasu. Dojedź na czas.</p>
        </div>
      )}

      {tab === "start" && (
        <StartScreen
          opcje={opcje}
          stanTachografu={stanTachografu}
          rules={rules}
          trasaDoEdycji={trasaDoEdycji}
          onEdycjaZakonczona={() => setTrasaDoEdycji(null)}
          onCompute={(plan) => {
            setAktualnyPlan(plan);
            setTab("trasa");
          }}
          onOpenCzyZdaze={() => setCzyZdazeOtwarte(true)}
        />
      )}

      {tab === "trasa" && (
        <TrasaScreen
          plan={aktualnyPlan}
          onZapisano={(id) =>
            setAktualnyPlan((p) => (p ? { ...p, zapisanaTrasaId: id } : p))
          }
          onNowaTrasa={() => setTab("start")}
        />
      )}

      {tab === "jazda" && (
        <JazdaScreen
          plan={aktualnyPlan}
          rules={rules}
          trybKierowcy={ustawieniaApp.trybKierowcy}
          onTrybKierowcy={(v) => updateUstawieniaApp({ ...ustawieniaApp, trybKierowcy: v })}
        />
      )}

      {tab === "parkingi" && <ParkingiScreen />}

      {tab === "historia" && (
        <HistoriaScreen
          rules={rules}
          onOtworz={otworzTraseZHistorii}
          onEdytuj={edytujTrase}
        />
      )}

      {tab === "ustawienia" && (
        <UstawieniaScreen
          rules={rules}
          opcje={opcje}
          onRules={updateRules}
          onOpcje={updateOpcje}
          onOtworzTachograf={() => setPokazTachograf(true)}
        />
      )}

      {pokazTachograf && (
        <TachografScreen
          stan={stanTachografu}
          rules={rules}
          onZapisz={updateStanTachografu}
          onClose={() => setPokazTachograf(false)}
        />
      )}

      {czyZdazeOtwarte && (
        <CzyZdazeScreen
          rules={rules}
          opcje={opcje}
          stanTachografu={stanTachografu}
          onClose={() => setCzyZdazeOtwarte(false)}
        />
      )}

      {!ustawieniaApp.trybKierowcy && <BottomNav active={tab} onChange={setTab} />}
    </div>
  );
}
