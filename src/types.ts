// Współdzielone typy domenowe aplikacji TachoPlan.

/** Aktualny stan tachografu kierowcy — wejście do trybu profesjonalnego,
 *  ale też baza dla trybu prostego (wtedy zakładamy stan "w pełni wypoczęty"). */
export interface TachographState {
  /** Jazda od ostatniej wymaganej przerwy (min). */
  jazdaOdOstatniejPrzerwyMin: number;
  /** Jazda dzisiaj / w bieżącej dobie (min). */
  jazdaDzisiajMin: number;
  /** Jazda w bieżącym tygodniu (min). */
  jazdaWTymTygodniuMin: number;
  /** Jazda w poprzednim tygodniu (min). */
  jazdaWPoprzednimTygodniuMin: number;
  /** Ile wydłużonych dni (10h) już wykorzystano w tym tygodniu. */
  wykorzystaneWydluzoneDni: number;
  /** Ile skróconych odpoczynków dobowych już wykorzystano od ostatniego odpoczynku tygodniowego. */
  wykorzystaneSkroconeOdpoczynki: number;
}

export const pelniWypoczetyStan: TachographState = {
  jazdaOdOstatniejPrzerwyMin: 0,
  jazdaDzisiajMin: 0,
  jazdaWTymTygodniuMin: 0,
  jazdaWPoprzednimTygodniuMin: 0,
  wykorzystaneWydluzoneDni: 0,
  wykorzystaneSkroconeOdpoczynki: 0,
};

export type TrybOdpoczynku = "standardowy" | "skrocony" | "auto";
export type TrybLimituDziennego = "standardowy" | "wydluzony" | "auto";

export interface OpcjePlanowania {
  trybOdpoczynku: TrybOdpoczynku;
  trybLimituDziennego: TrybLimituDziennego;
  /** Zapas czasu w minutach doliczany przed wymaganą godziną przyjazdu. */
  zapasCzasuMin: number;
}

export const domyslneOpcje: OpcjePlanowania = {
  trybOdpoczynku: "auto",
  trybLimituDziennego: "auto",
  zapasCzasuMin: 30,
};

export type TypZdarzenia = "START" | "JAZDA" | "PRZERWA" | "ODPOCZYNEK" | "PRZYJAZD";

export interface ZdarzenieOsi {
  typ: TypZdarzenia;
  /** Minuty od początku podróży (od momentu wyjazdu). */
  relStartMin: number;
  /** Czas trwania zdarzenia w minutach (0 dla punktowych zdarzeń typu START/PRZYJAZD). */
  czasTrwaniaMin: number;
  /** Ile minut jazdy pozostało do końca podróży PO tym zdarzeniu. */
  pozostalaJazdaMin: number;
  /** Data/godzina zdarzenia — uzupełniana po zakotwiczeniu osi w konkretnym momencie. */
  kiedy?: Date;
  /** Krótki opis dodatkowy (np. "Dzień 1", "wydłużony limit dzienny"). */
  opis?: string;
}

export interface WynikSymulacji {
  /** Oś czasu, czasy relatywne (od 0 = wyjazd). */
  timeline: ZdarzenieOsi[];
  /** Całkowity czas podróży w minutach (jazda + przerwy + odpoczynki), bez zapasu. */
  calkowityCzasMin: number;
  /** Liczba dni jazdy (odcinków dziennych). */
  liczbaDni: number;
  /** Ostrzeżenia silnika (np. przekroczenie limitu tygodniowego). */
  ostrzezenia: string[];
  /** Wykorzystane wydłużone dni po symulacji. */
  wydluzoneDniPoTrasie: number;
  /** Wykorzystane skrócone odpoczynki po symulacji. */
  skroconeOdpoczynkiPoTrasie: number;
  /** TEST F: plan zablokowany, ponieważ podany stan tachografu już przekracza
   *  limit jazdy w dwóch tygodniach — silnik nigdy nie zasugeruje jazdy w takim
   *  stanie (zasada priorytetu §42: zgodność z przepisami > dotarcie na czas). */
  zablokowany: boolean;
  /** Powód blokady (widoczny dla kierowcy), gdy `zablokowany === true`. */
  powodBlokady?: string;
}

export type PoziomZapasu = "zielony" | "zolty" | "czerwony";

export interface ZapisanaTrasa {
  id: string;
  start: string;
  cel: string;
  wymaganyPrzyjazdIso: string;
  czasJazdyMin: number;
  utworzonoIso: string;
  opcje: OpcjePlanowania;
  stanTachografu: TachographState;
  /** Punkty pośrednie (miasta), między startem a celem, w kolejności przejazdu. */
  waypoints?: string[];
  /** Nazwa własna, gdy trasa jest zapisana jako "Moja trasa" / ulubiona (§7, §27). */
  wlasnaNazwa?: string;
  ulubiona?: boolean;
  /** Zdystansowany dystans w km, jeśli policzony z mapy (§4). */
  dystansKm?: number;
}

// --- Geokodowanie i trasa z mapy (§4, §5, §6, §24, §25, §32) ---------------

/** Punkt zwrócony przez geokodowanie nazwy miejsca (Nominatim/OSM — bez klucza API). */
export interface GeocodedPlace {
  query: string;
  displayName: string;
  lat: number;
  lon: number;
  countryCode: string; // np. "pl"
  country: string; // np. "Polska"
  city?: string;
}

export interface RoutePoint {
  lat: number;
  lon: number;
}

/** Jeden wariant trasy zwrócony przez dostawcę mapy (§24). */
export interface RouteAlternative {
  id: string;
  etykieta: string; // "Najszybsza" | "Preferowana" | "Alternatywna"
  dystansKm: number;
  czasMin: number;
  geometry: RoutePoint[];
}

export type ProviderTrasy = "mapbox" | "google" | "brak";

/** Wynik zapytania o trasę — patrz `services/mapboxService.ts`. */
export interface RouteResult {
  provider: ProviderTrasy;
  alternatywy: RouteAlternative[];
  /** Kraje przecinane przez trasę, w kolejności przejazdu (§25). */
  kraje: { kod: string; nazwa: string }[];
}

// --- Pojazd i kierowca (§28, §29, §30) --------------------------------------

export type RodzajPojazdu = "bus" | "ciezarowy" | "inny";

export interface ProfilPojazdu {
  id: string;
  nazwa: string;
  rodzaj: RodzajPojazdu;
  dmcKg?: number;
  sredniaPredkoscKmH?: number;
  preferowanaTrasa?: string;
}

export interface ProfilKierowcy {
  id: string;
  nazwa: string;
  stan: TachographState;
}

/** Ustawienia aplikacji niezależne od reguł/opcji planowania. */
export interface UstawieniaAplikacji {
  kreatorZakonczony: boolean;
  aktywnyPojazdId?: string;
  aktywnyKierowcaId?: string;
  trybKierowcy: boolean; // §22 — duże cyfry, wysoki kontrast
}

export const domyslneUstawieniaAplikacji: UstawieniaAplikacji = {
  kreatorZakonczony: false,
  trybKierowcy: false,
};
