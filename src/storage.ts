// Trwałe przechowywanie danych aplikacji w localStorage (bez backendu).
// Wszystko działa w pełni offline (§31) — kalkulator, zapisane trasy, stan
// tachografu, historia i ustawienia nie wymagają połączenia z internetem
// (jedynie automatyczne wyznaczanie trasy z mapy i geokodowanie miast tego
// wymagają — patrz `services/`).

import type {
  OpcjePlanowania,
  ProfilKierowcy,
  ProfilPojazdu,
  TachographState,
  UstawieniaAplikacji,
  ZapisanaTrasa,
} from "./types";
import { domyslneOpcje, domyslneUstawieniaAplikacji, pelniWypoczetyStan } from "./types";

const KLUCZ_TRASY = "tachoplan.trasy.v1";
const KLUCZ_OPCJE = "tachoplan.opcje.v1";
const KLUCZ_TACHOGRAF = "tachoplan.tachograf.v1";
const KLUCZ_POJAZDY = "tachoplan.pojazdy.v1";
const KLUCZ_KIEROWCY = "tachoplan.kierowcy.v1";
const KLUCZ_USTAWIENIA_APP = "tachoplan.ustawieniaApp.v1";

export function wczytajTrasy(): ZapisanaTrasa[] {
  try {
    const raw = localStorage.getItem(KLUCZ_TRASY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function zapiszTrasy(trasy: ZapisanaTrasa[]): void {
  localStorage.setItem(KLUCZ_TRASY, JSON.stringify(trasy));
}

export function dodajOrAktualizujTrase(trasa: ZapisanaTrasa): void {
  const trasy = wczytajTrasy();
  const idx = trasy.findIndex((t) => t.id === trasa.id);
  if (idx >= 0) trasy[idx] = trasa;
  else trasy.unshift(trasa);
  zapiszTrasy(trasy);
}

export function usunTrase(id: string): void {
  zapiszTrasy(wczytajTrasy().filter((t) => t.id !== id));
}

export function powielTrase(id: string): ZapisanaTrasa | null {
  const trasy = wczytajTrasy();
  const oryginal = trasy.find((t) => t.id === id);
  if (!oryginal) return null;
  const kopia: ZapisanaTrasa = {
    ...oryginal,
    id: crypto.randomUUID(),
    utworzonoIso: new Date().toISOString(),
    start: oryginal.start,
    cel: oryginal.cel + " (kopia)",
  };
  dodajOrAktualizujTrase(kopia);
  return kopia;
}

export function wczytajOpcje(): OpcjePlanowania {
  try {
    const raw = localStorage.getItem(KLUCZ_OPCJE);
    if (!raw) return { ...domyslneOpcje };
    return { ...domyslneOpcje, ...JSON.parse(raw) };
  } catch {
    return { ...domyslneOpcje };
  }
}

export function zapiszOpcje(opcje: OpcjePlanowania): void {
  localStorage.setItem(KLUCZ_OPCJE, JSON.stringify(opcje));
}

export function wczytajStanTachografu(): TachographState {
  try {
    const raw = localStorage.getItem(KLUCZ_TACHOGRAF);
    if (!raw) return { ...pelniWypoczetyStan };
    return { ...pelniWypoczetyStan, ...JSON.parse(raw) };
  } catch {
    return { ...pelniWypoczetyStan };
  }
}

export function zapiszStanTachografu(stan: TachographState): void {
  localStorage.setItem(KLUCZ_TACHOGRAF, JSON.stringify(stan));
}

// --- Pojazdy (§28) ---------------------------------------------------------

export function wczytajPojazdy(): ProfilPojazdu[] {
  try {
    const raw = localStorage.getItem(KLUCZ_POJAZDY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function zapiszPojazdy(pojazdy: ProfilPojazdu[]): void {
  localStorage.setItem(KLUCZ_POJAZDY, JSON.stringify(pojazdy));
}

export function dodajOrAktualizujPojazd(pojazd: ProfilPojazdu): ProfilPojazdu[] {
  const pojazdy = wczytajPojazdy();
  const idx = pojazdy.findIndex((p) => p.id === pojazd.id);
  if (idx >= 0) pojazdy[idx] = pojazd;
  else pojazdy.push(pojazd);
  zapiszPojazdy(pojazdy);
  return pojazdy;
}

export function usunPojazd(id: string): ProfilPojazdu[] {
  const pojazdy = wczytajPojazdy().filter((p) => p.id !== id);
  zapiszPojazdy(pojazdy);
  return pojazdy;
}

// --- Kierowcy (§29, architektura pod §30 — dwóch kierowców) -----------------

export function wczytajKierowcow(): ProfilKierowcy[] {
  try {
    const raw = localStorage.getItem(KLUCZ_KIEROWCY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function zapiszKierowcow(kierowcy: ProfilKierowcy[]): void {
  localStorage.setItem(KLUCZ_KIEROWCY, JSON.stringify(kierowcy));
}

export function dodajOrAktualizujKierowce(kierowca: ProfilKierowcy): ProfilKierowcy[] {
  const kierowcy = wczytajKierowcow();
  const idx = kierowcy.findIndex((k) => k.id === kierowca.id);
  if (idx >= 0) kierowcy[idx] = kierowca;
  else kierowcy.push(kierowca);
  zapiszKierowcow(kierowcy);
  return kierowcy;
}

export function usunKierowce(id: string): ProfilKierowcy[] {
  const kierowcy = wczytajKierowcow().filter((k) => k.id !== id);
  zapiszKierowcow(kierowcy);
  return kierowcy;
}

// --- Ustawienia aplikacji (kreator, tryb kierowcy, aktywny pojazd/kierowca) --

export function wczytajUstawieniaApp(): UstawieniaAplikacji {
  try {
    const raw = localStorage.getItem(KLUCZ_USTAWIENIA_APP);
    if (!raw) return { ...domyslneUstawieniaAplikacji };
    return { ...domyslneUstawieniaAplikacji, ...JSON.parse(raw) };
  } catch {
    return { ...domyslneUstawieniaAplikacji };
  }
}

export function zapiszUstawieniaApp(u: UstawieniaAplikacji): void {
  localStorage.setItem(KLUCZ_USTAWIENIA_APP, JSON.stringify(u));
}
