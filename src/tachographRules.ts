/**
 * tachographRules.ts
 * ---------------------------------------------------------------------------
 * JEDYNE miejsce, w którym zapisane są liczby wynikające z przepisów o czasie
 * jazdy i odpoczynku kierowców (rozporządzenie (WE) 561/2006).
 *
 * NIC z poniższych wartości nie powinno być powielane "na sztywno" w
 * komponentach interfejsu ani w silniku obliczeniowym — wszystko, co silnik
 * (`engine/tripPlanner.ts`) robi, odwołuje się do obiektu `defaultRules`
 * (lub do reguł zmienionych przez użytkownika w Ustawieniach i zapisanych
 * przez `loadRules()` / `saveRules()`).
 *
 * Każda reguła ma:
 *  - `value`   — wartość liczbowa używana przez silnik (w minutach, sztukach itp.),
 *  - `label`   — czytelna nazwa wyświetlana w Ustawieniach,
 *  - `description` — krótki opis wyjaśniający, co reguła oznacza,
 *  - `enabled` — czy reguła jest aktywnie egzekwowana przez silnik (część
 *                reguł da się wyłączyć w Ustawieniach — np. dopuszczenie
 *                wydłużonego dziennego czasu jazdy).
 */

export interface RuleNumber {
  /** Wartość reguły — w minutach dla `jednostka: "czas"`, w sztukach dla `"sztuki"`. */
  value: number;
  label: string;
  description: string;
  /** Jak interpretować/wyświetlać `value` w Ustawieniach: czas (godz./min) czy liczba sztuk. */
  jednostka: "czas" | "sztuki";
}

export interface RuleToggle {
  enabled: boolean;
  label: string;
  description: string;
}

export interface TachographRules {
  /** Maksymalny nieprzerwany czas jazdy zanim wymagana jest przerwa (min). */
  maksymalnaJazdaBezPrzerwy: RuleNumber;
  /** Standardowa długość wymaganej przerwy (min). Silnik dopuszcza też podział 15+30. */
  standardowaPrzerwa: RuleNumber;
  /** Czy dopuszczać podział przerwy na 15 min + 30 min zamiast jednej 45-minutowej. */
  dopuszczajPodzielonaPrzerwe: RuleToggle;

  /** Standardowy dzienny limit czasu jazdy (min). */
  standardowyDziennyLimitJazdy: RuleNumber;
  /** Wydłużony dzienny limit czasu jazdy (min), dostępny ograniczoną liczbę razy w tygodniu. */
  wydluzonyDziennyLimitJazdy: RuleNumber;
  /** Ile razy w tygodniu można skorzystać z wydłużonego dziennego limitu jazdy. */
  maksymalnaLiczbaWydluzonychDni: RuleNumber;
  /** Czy w ogóle silnik może automatycznie korzystać z wydłużonego limitu dziennego. */
  pozwolNaWydluzonyLimitDzienny: RuleToggle;

  /** Standardowy odpoczynek dobowy (min). */
  standardowyOdpoczynekDobowy: RuleNumber;
  /** Skrócony odpoczynek dobowy (min), dostępny ograniczoną liczbę razy między odpoczynkami tygodniowymi. */
  skroconyOdpoczynekDobowy: RuleNumber;
  /** Ile razy między dwoma odpoczynkami tygodniowymi można skorzystać ze skróconego odpoczynku dobowego. */
  maksymalnaLiczbaSkroconychOdpoczynkow: RuleNumber;
  /** Czy silnik może automatycznie planować skrócone odpoczynki dobowe. */
  pozwolNaSkroconyOdpoczynek: RuleToggle;

  /** Maksymalna jazda w jednym tygodniu (min). */
  maksymalnaJazdaTygodniowa: RuleNumber;
  /** Maksymalna łączna jazda w dwóch kolejnych tygodniach (min). */
  maksymalnaJazdaWDwochTygodniach: RuleNumber;
  /** Czy silnik ma pilnować limitów tygodniowych / dwutygodniowych. */
  pilnujLimitowTygodniowych: RuleToggle;

  /** Standardowy odpoczynek tygodniowy (min), wstawiany automatycznie, gdy
   *  dalsza jazda przekroczyłaby maksymalną jazdę tygodniową. */
  standardowyOdpoczynekTygodniowy: RuleNumber;
  /** Skrócony odpoczynek tygodniowy (min) — dozwolony wg przepisów, ale
   *  wymaga rekompensaty, którą silnik (uproszczenie 2.0) nie planuje
   *  automatycznie — dostępny do ręcznego wyboru w opcjach planowania. */
  skroconyOdpoczynekTygodniowy: RuleNumber;

  /** Domyślny zapas czasu doliczany do wymaganej godziny wyjazdu (min). */
  domyslnyZapasCzasu: RuleNumber;
}

/**
 * Wersjonowanie zasad — rośnie przy każdej zmianie interpretacji przepisów
 * (nie przy zmianie wartości przez użytkownika w Ustawieniach — to jest
 * osobny, wciąż ten sam `RULES_VERSION`). Pokazywane w Ustawieniach, żeby
 * było wiadomo, na jakiej wersji silnika regulaminowego oparty jest plan.
 */
export const RULES_VERSION = "2.0.0";

/**
 * Nazwane stałe konfiguracyjne w jednostkach z prompta specyfikacji
 * (minuty / sztuki), 1:1 z wartościami w `defaultRules` poniżej — jedno
 * miejsce prawdy. Wygodne do importu tam, gdzie zależy nam na krótkiej,
 * angielskiej nazwie stałej (np. w testach) zamiast pełnego obiektu reguły.
 */
export const MAX_DRIVING_WITHOUT_BREAK = 4 * 60 + 30; // 270 min
export const BREAK_DURATION = 45; // min
export const NORMAL_DAILY_DRIVING = 9 * 60; // 540 min
export const EXTENDED_DAILY_DRIVING = 10 * 60; // 600 min
export const MAX_EXTENDED_DAYS = 2; // razy / tydzień
export const WEEKLY_DRIVING_LIMIT = 56 * 60; // 3360 min
export const TWO_WEEK_DRIVING_LIMIT = 90 * 60; // 5400 min
export const NORMAL_DAILY_REST = 11 * 60; // 660 min
export const REDUCED_DAILY_REST = 9 * 60; // 540 min
/** Odpoczynek tygodniowy — nie był w oryginalnym silniku v1; dodany w 2.0,
 *  żeby silnik mógł poprawnie zablokować/rozłożyć jazdę przekraczającą
 *  limit tygodniowy (patrz `engine/tripPlanner.ts` → wstawianie odpoczynku
 *  tygodniowego, TEST F). */
export const NORMAL_WEEKLY_REST = 45 * 60; // 2700 min
export const REDUCED_WEEKLY_REST = 24 * 60; // 1440 min

export const defaultRules: TachographRules = {
  maksymalnaJazdaBezPrzerwy: {
    value: 4 * 60 + 30,
    label: "Maksymalna jazda bez przerwy",
    description: "Po tylu minutach jazdy kierowca musi zrobić przerwę.",
    jednostka: "czas",
  },
  standardowaPrzerwa: {
    value: 45,
    label: "Standardowa przerwa",
    description: "Długość przerwy wymaganej po osiągnięciu limitu jazdy bez przerwy.",
    jednostka: "czas",
  },
  dopuszczajPodzielonaPrzerwe: {
    enabled: false,
    label: "Dopuszczaj przerwę dzieloną 15 + 30 min",
    description: "Zamiast jednej przerwy 45 min silnik może zaplanować 15 min, a następnie 30 min.",
  },

  standardowyDziennyLimitJazdy: {
    value: 9 * 60,
    label: "Standardowy dzienny limit jazdy",
    description: "Maksymalny czas jazdy w ciągu doby roboczej (bez wydłużenia).",
    jednostka: "czas",
  },
  wydluzonyDziennyLimitJazdy: {
    value: 10 * 60,
    label: "Wydłużony dzienny limit jazdy",
    description: "Maksymalny czas jazdy w dniu, w którym wykorzystano dostępne wydłużenie.",
    jednostka: "czas",
  },
  maksymalnaLiczbaWydluzonychDni: {
    value: 2,
    label: "Maksymalna liczba wydłużonych dni / tydzień",
    description: "Ile razy w tygodniu wolno skorzystać z wydłużonego dziennego limitu jazdy (10 h).",
    jednostka: "sztuki",
  },
  pozwolNaWydluzonyLimitDzienny: {
    enabled: true,
    label: "Pozwól silnikowi używać wydłużonego limitu dziennego",
    description: "Gdy włączone, planer sięga po dostępne dni 10-godzinne, aby skrócić podróż.",
  },

  standardowyOdpoczynekDobowy: {
    value: 11 * 60,
    label: "Standardowy odpoczynek dobowy",
    description: "Minimalny nieprzerwany odpoczynek między dobami jazdy.",
    jednostka: "czas",
  },
  skroconyOdpoczynekDobowy: {
    value: 9 * 60,
    label: "Skrócony odpoczynek dobowy",
    description: "Minimalny skrócony odpoczynek dobowy, dostępny ograniczoną liczbę razy.",
    jednostka: "czas",
  },
  maksymalnaLiczbaSkroconychOdpoczynkow: {
    value: 3,
    label: "Maksymalna liczba skróconych odpoczynków",
    description: "Ile razy między dwoma odpoczynkami tygodniowymi wolno skorzystać ze skróconego odpoczynku dobowego.",
    jednostka: "sztuki",
  },
  pozwolNaSkroconyOdpoczynek: {
    enabled: true,
    label: "Pozwól silnikowi używać skróconego odpoczynku",
    description: "Gdy włączone, planer może zaplanować odpoczynek 9 h zamiast 11 h, aby skrócić podróż.",
  },

  maksymalnaJazdaTygodniowa: {
    value: 56 * 60,
    label: "Maksymalna jazda tygodniowa",
    description: "Maksymalny łączny czas jazdy w jednym tygodniu.",
    jednostka: "czas",
  },
  maksymalnaJazdaWDwochTygodniach: {
    value: 90 * 60,
    label: "Maksymalna jazda w dwóch tygodniach",
    description: "Maksymalny łączny czas jazdy w dowolnych dwóch kolejnych tygodniach.",
    jednostka: "czas",
  },
  pilnujLimitowTygodniowych: {
    enabled: true,
    label: "Pilnuj limitów tygodniowych",
    description: "Gdy włączone, planer ostrzega i blokuje plan przekraczający limity tygodniowe / dwutygodniowe.",
  },

  standardowyOdpoczynekTygodniowy: {
    value: NORMAL_WEEKLY_REST,
    label: "Standardowy odpoczynek tygodniowy",
    description: "Minimalny nieprzerwany odpoczynek tygodniowy, wstawiany automatycznie po osiągnięciu tygodniowego limitu jazdy.",
    jednostka: "czas",
  },
  skroconyOdpoczynekTygodniowy: {
    value: REDUCED_WEEKLY_REST,
    label: "Skrócony odpoczynek tygodniowy",
    description: "Skrócony odpoczynek tygodniowy (wymaga rekompensaty wg przepisów — nie planowanej automatycznie w tej wersji).",
    jednostka: "czas",
  },

  domyslnyZapasCzasu: {
    value: 30,
    label: "Domyślny zapas czasu",
    description: "Czas doliczany \"na zapas\" przed wymaganą godziną przyjazdu przy obliczaniu godziny wyjazdu.",
    jednostka: "czas",
  },
};

const STORAGE_KEY = "tachoplan.rules.v1";

/** Głęboka kopia domyślnych reguł, żeby nie mutować stałej `defaultRules`. */
function cloneDefaultRules(): TachographRules {
  return JSON.parse(JSON.stringify(defaultRules));
}

/** Wczytuje reguły zapisane przez użytkownika w Ustawieniach, scalając je z domyślnymi
 *  (tak, że dodanie nowej reguły w przyszłej wersji apki nie wywali starych zapisów). */
export function loadRules(): TachographRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultRules();
    const saved = JSON.parse(raw);
    const merged = cloneDefaultRules();
    for (const key of Object.keys(merged) as (keyof TachographRules)[]) {
      if (saved[key] && typeof saved[key] === "object") {
        merged[key] = { ...merged[key], ...saved[key] } as never;
      }
    }
    return merged;
  } catch {
    return cloneDefaultRules();
  }
}

export function saveRules(rules: TachographRules): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function resetRules(): TachographRules {
  localStorage.removeItem(STORAGE_KEY);
  return cloneDefaultRules();
}

/** Tekst ostrzeżenia pokazywany przy każdej kalkulacji w aplikacji (§40 specyfikacji). */
export const DISCLAIMER =
  "TachoPlan jest narzędziem pomocniczym do planowania podróży. Wyniki nie zastępują rzeczywistych zapisów tachografu ani obowiązujących przepisów. Kierowca jest odpowiedzialny za prawidłową organizację czasu pracy, jazdy i odpoczynku.";
