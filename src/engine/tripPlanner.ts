// engine/tripPlanner.ts
// ---------------------------------------------------------------------------
// Prawdziwy silnik planowania podróży. Rozbija całkowity czas jazdy na
// odcinki zgodnie z regułami z `tachographRules.ts`, wstawia przerwy oraz
// odpoczynki dobowe, pilnuje limitów tygodniowych i pozwala liczyć trasę
// zarówno "w przód" (od godziny wyjazdu), jak i "wstecz" (od wymaganej
// godziny przyjazdu) — patrz `planTripBackward`.
//
// Silnik NIE zna żadnych liczb na sztywno — wszystko pochodzi z obiektu
// `TachographRules` przekazanego przez wywołującego (domyślnie
// `defaultRules` / reguły zapisane przez użytkownika).

import type { TachographRules } from "../tachographRules";
import type {
  OpcjePlanowania,
  TachographState,
  WynikSymulacji,
  ZdarzenieOsi,
} from "../types";

const MAX_ITERACJI = 2000;
const MAX_DNI = 40;

interface WewnStan {
  t: number; // minuty od startu symulacji
  pozostaleJazdy: number;
  sinceBreak: number;
  todayDrive: number;
  /** Jazda od ostatniego odpoczynku tygodniowego (resetowana, gdy silnik wstawi odpoczynek tygodniowy). */
  weekDrive: number;
  /** Jazda w "tygodniu" zakończonym ostatnim wstawionym odpoczynkiem tygodniowym — razem z
   *  `weekDrive` daje przybliżenie sumy z dwóch ostatnich tygodni (uproszczenie: silnik liczy
   *  "tydzień" jako okres między odpoczynkami tygodniowymi, a nie sztywny kalendarz). */
  prevCompletedWeekDrive: number;
  extUsed: number;
  redUsed: number;
  dayExtended: boolean;
  dzien: number;
}

/**
 * Symuluje podróż "w przód": zaczynając od stanu tachografu `stan`, dla
 * podanego całkowitego czasu jazdy `calkowitaJazdaMin`, zwraca pełną oś
 * czasu zdarzeń (relatywną, w minutach od 0 = wyjazd) oraz metadane.
 */
export function simulateForward(
  calkowitaJazdaMin: number,
  stan: TachographState,
  opcje: OpcjePlanowania,
  rules: TachographRules
): WynikSymulacji {
  const ostrzezenia: string[] = [];
  const timeline: ZdarzenieOsi[] = [];

  const standardDay = rules.standardowyDziennyLimitJazdy.value;
  const extendedDay = rules.wydluzonyDziennyLimitJazdy.value;
  const breakThreshold = rules.maksymalnaJazdaBezPrzerwy.value;
  const standardRest = rules.standardowyOdpoczynekDobowy.value;
  const reducedRest = rules.skroconyOdpoczynekDobowy.value;
  const maxExtDays = rules.maksymalnaLiczbaWydluzonychDni.value;
  const maxReducedRests = rules.maksymalnaLiczbaSkroconychOdpoczynkow.value;
  const weeklyLimit = rules.maksymalnaJazdaTygodniowa.value;
  const twoWeekLimit = rules.maksymalnaJazdaWDwochTygodniach.value;
  const weeklyRest = rules.standardowyOdpoczynekTygodniowy.value;
  const pilnujTygodni = rules.pilnujLimitowTygodniowych.enabled;

  // TEST F / zasada priorytetu §42: jeżeli stan wejściowy JUŻ przekracza limit
  // jazdy w dwóch tygodniach, silnik nigdy nie zasugeruje dalszej jazdy — plan
  // jest zablokowany niezależnie od tego, ile jazdy jeszcze trzeba wykonać.
  if (pilnujTygodni && stan.jazdaWTymTygodniuMin + stan.jazdaWPoprzednimTygodniuMin > twoWeekLimit) {
    return {
      timeline: [
        {
          typ: "START",
          relStartMin: 0,
          czasTrwaniaMin: 0,
          pozostalaJazdaMin: Math.max(0, Math.round(calkowitaJazdaMin)),
          opis: "Plan zablokowany",
        },
      ],
      calkowityCzasMin: 0,
      liczbaDni: 0,
      ostrzezenia: [
        `Podany stan tachografu (jazda w tym i poprzednim tygodniu razem: ${fmtHM(
          stan.jazdaWTymTygodniuMin + stan.jazdaWPoprzednimTygodniuMin
        )}) już przekracza limit jazdy w dwóch tygodniach (${fmtHM(
          twoWeekLimit
        )}). Wymagany jest odpoczynek tygodniowy przed dalszą jazdą — silnik nie zaplanuje trasy w tym stanie.`,
      ],
      wydluzoneDniPoTrasie: stan.wykorzystaneWydluzoneDni,
      skroconeOdpoczynkiPoTrasie: stan.wykorzystaneSkroconeOdpoczynki,
      zablokowany: true,
      powodBlokady: "Przekroczony limit jazdy w dwóch tygodniach (90 h) — wymagany odpoczynek tygodniowy.",
    };
  }

  const s: WewnStan = {
    t: 0,
    pozostaleJazdy: Math.max(0, Math.round(calkowitaJazdaMin)),
    sinceBreak: stan.jazdaOdOstatniejPrzerwyMin,
    todayDrive: stan.jazdaDzisiajMin,
    weekDrive: stan.jazdaWTymTygodniuMin,
    prevCompletedWeekDrive: stan.jazdaWPoprzednimTygodniuMin,
    extUsed: stan.wykorzystaneWydluzoneDni,
    redUsed: stan.wykorzystaneSkroconeOdpoczynki,
    dayExtended: false,
    dzien: 1,
  };

  timeline.push({
    typ: "START",
    relStartMin: 0,
    czasTrwaniaMin: 0,
    pozostalaJazdaMin: s.pozostaleJazdy,
    opis: `Dzień ${s.dzien}`,
  });

  let iter = 0;
  while (s.pozostaleJazdy > 0) {
    iter++;
    if (iter > MAX_ITERACJI || s.dzien > MAX_DNI) {
      ostrzezenia.push(
        "Trasa jest zbyt długa, aby ją sensownie zaplanować (przekroczono rozsądną liczbę dni). Sprawdź dane wejściowe."
      );
      break;
    }

    const dayCap = s.dayExtended ? extendedDay : standardDay;
    let allowedByDay = dayCap - s.todayDrive;
    const allowedByBreak = breakThreshold - s.sinceBreak;
    const allowedByWeek = pilnujTygodni ? weeklyLimit - s.weekDrive : Infinity;

    // Czy warto już teraz wydłużyć dzisiejszy dzień do limitu wydłużonego,
    // żeby uniknąć dokładania całego kolejnego dnia (z odpoczynkiem) dla
    // niewielkiej reszty jazdy?
    const chceWydluzycDzien =
      !s.dayExtended &&
      rules.pozwolNaWydluzonyLimitDzienny.enabled &&
      (opcje.trybLimituDziennego === "wydluzony" || opcje.trybLimituDziennego === "auto") &&
      s.extUsed < maxExtDays &&
      allowedByDay <= 0 === false && // dzień jeszcze nie wyczerpany do końca
      s.pozostaleJazdy > allowedByDay &&
      s.pozostaleJazdy <= extendedDay - s.todayDrive &&
      allowedByBreak > 0;

    if (chceWydluzycDzien) {
      s.dayExtended = true;
      s.extUsed++;
      allowedByDay = extendedDay - s.todayDrive;
    }

    const chunk = Math.min(s.pozostaleJazdy, allowedByDay, allowedByBreak, allowedByWeek);

    if (chunk > 0) {
      timeline.push({
        typ: "JAZDA",
        relStartMin: s.t,
        czasTrwaniaMin: chunk,
        pozostalaJazdaMin: s.pozostaleJazdy - chunk,
        opis: `Dzień ${s.dzien}${s.dayExtended ? " (wydłużony limit 10 h)" : ""}`,
      });
      s.t += chunk;
      s.pozostaleJazdy -= chunk;
      s.todayDrive += chunk;
      s.sinceBreak += chunk;
      s.weekDrive += chunk;

      if (s.pozostaleJazdy === 0) break;
      continue;
    }

    // Nie można teraz jechać — trzeba zrobić przerwę, odpoczynek dobowy albo
    // (gdy wyczerpany jest tygodniowy limit jazdy) odpoczynek tygodniowy.
    // Odpoczynek tygodniowy ma pierwszeństwo — w pełni pokrywa też wymóg
    // przerwy i odpoczynku dobowego, więc nie dokładamy ich osobno.
    if (allowedByWeek <= 0) {
      const dwaTygSuma = s.prevCompletedWeekDrive + s.weekDrive;
      ostrzezenia.push(
        `Osiągnięto maksymalną jazdę tygodniową (${fmtHM(weeklyLimit)}) — silnik wstawił wymagany odpoczynek tygodniowy (${fmtHM(
          weeklyRest
        )}) przed dalszą jazdą.`
      );
      timeline.push({
        typ: "ODPOCZYNEK",
        relStartMin: s.t,
        czasTrwaniaMin: weeklyRest,
        pozostalaJazdaMin: s.pozostaleJazdy,
        opis: "Odpoczynek tygodniowy",
      });
      s.t += weeklyRest;
      s.prevCompletedWeekDrive = s.weekDrive;
      s.weekDrive = 0;
      s.todayDrive = 0;
      s.sinceBreak = 0;
      s.dayExtended = false;
      s.extUsed = 0;
      s.redUsed = 0;
      s.dzien++;

      if (dwaTygSuma > twoWeekLimit) {
        ostrzezenia.push(
          `Uwaga: suma jazdy w ostatnich dwóch tygodniach (${fmtHM(dwaTygSuma)}) przekroczyła limit ${fmtHM(
            twoWeekLimit
          )}. Zweryfikuj plan ręcznie przed wyjazdem.`
        );
      }
      continue;
    }

    if (allowedByDay <= 0) {
      let restLen = standardRest;
      let opisOdpoczynku = "Odpoczynek dobowy (standardowy)";
      const mozeSkrocony = rules.pozwolNaSkroconyOdpoczynek.enabled && s.redUsed < maxReducedRests;
      if ((opcje.trybOdpoczynku === "skrocony" || opcje.trybOdpoczynku === "auto") && mozeSkrocony) {
        restLen = reducedRest;
        opisOdpoczynku = "Odpoczynek dobowy (skrócony)";
        s.redUsed++;
      }

      timeline.push({
        typ: "ODPOCZYNEK",
        relStartMin: s.t,
        czasTrwaniaMin: restLen,
        pozostalaJazdaMin: s.pozostaleJazdy,
        opis: opisOdpoczynku,
      });
      s.t += restLen;
      s.todayDrive = 0;
      s.sinceBreak = 0;
      s.dayExtended = false;
      s.dzien++;
      continue;
    }

    if (allowedByBreak <= 0) {
      if (rules.dopuszczajPodzielonaPrzerwe.enabled) {
        timeline.push({
          typ: "PRZERWA",
          relStartMin: s.t,
          czasTrwaniaMin: 15,
          pozostalaJazdaMin: s.pozostaleJazdy,
          opis: "Pierwsza część przerwy (15 min)",
        });
        s.t += 15;
        timeline.push({
          typ: "PRZERWA",
          relStartMin: s.t,
          czasTrwaniaMin: 30,
          pozostalaJazdaMin: s.pozostaleJazdy,
          opis: "Druga część przerwy (30 min)",
        });
        s.t += 30;
      } else {
        const dlugosc = rules.standardowaPrzerwa.value;
        timeline.push({
          typ: "PRZERWA",
          relStartMin: s.t,
          czasTrwaniaMin: dlugosc,
          pozostalaJazdaMin: s.pozostaleJazdy,
        });
        s.t += dlugosc;
      }
      s.sinceBreak = 0;
      continue;
    }
  }

  timeline.push({
    typ: "PRZYJAZD",
    relStartMin: s.t,
    czasTrwaniaMin: 0,
    pozostalaJazdaMin: 0,
  });

  return {
    timeline,
    calkowityCzasMin: s.t,
    liczbaDni: s.dzien,
    ostrzezenia,
    wydluzoneDniPoTrasie: s.extUsed,
    skroconeOdpoczynkiPoTrasie: s.redUsed,
    zablokowany: false,
  };
}

/** Nakłada konkretną datę/godzinę wyjazdu na relatywną oś czasu. */
export function zakotwiczTimeline(timeline: ZdarzenieOsi[], wyjazd: Date): ZdarzenieOsi[] {
  return timeline.map((z) => ({
    ...z,
    kiedy: new Date(wyjazd.getTime() + z.relStartMin * 60000),
  }));
}

export interface WynikPlanowaniaWstecz extends WynikSymulacji {
  wyjazd: Date;
  przyjazd: Date;
  zapasMin: number;
  poziomZapasu: "zielony" | "zolty" | "czerwony";
}

/**
 * Planowanie WSTECZ: dla podanej wymaganej godziny przyjazdu oblicza,
 * o której trzeba wyjechać (uwzględniając zapas czasu z `opcje.zapasCzasuMin`).
 * Ponieważ struktura odcinków/przerw/odpoczynków zależy tylko od stanu
 * początkowego i całkowitego czasu jazdy (nie od zegara), wystarczy
 * zasymulować podróż "w przód" od t=0, odczytać jej całkowity czas trwania,
 * a następnie odjąć go (plus zapas) od wymaganej godziny przyjazdu.
 */
export function planTripBackward(
  calkowitaJazdaMin: number,
  wymaganyPrzyjazd: Date,
  stan: TachographState,
  opcje: OpcjePlanowania,
  rules: TachographRules
): WynikPlanowaniaWstecz {
  const sym = simulateForward(calkowitaJazdaMin, stan, opcje, rules);
  const zapas = Math.max(0, opcje.zapasCzasuMin);
  const wyjazdMs =
    wymaganyPrzyjazd.getTime() - sym.calkowityCzasMin * 60000 - zapas * 60000;
  const wyjazd = new Date(wyjazdMs);
  const timelineZakotwiczona = zakotwiczTimeline(sym.timeline, wyjazd);
  const przyjazd = new Date(wyjazd.getTime() + sym.calkowityCzasMin * 60000);

  return {
    ...sym,
    timeline: timelineZakotwiczona,
    wyjazd,
    przyjazd,
    zapasMin: zapas,
    poziomZapasu: sym.zablokowany ? "czerwony" : zapas >= 60 ? "zielony" : zapas > 0 ? "zolty" : "czerwony",
  };
}

export type StatusCzyZdaze = "TAK" | "TAK_MALO" | "NIE";

export interface WynikCzyZdaze {
  status: StatusCzyZdaze;
  najwczesniejszyPrzyjazd: Date;
  wymaganyPrzyjazd: Date;
  zapasMin: number; // dodatnia = ile zapasu, ujemna = ile spóźnienia
  ilePotrzebaWczesniejszegoWyjazduMin: number; // sensowne tylko dla NIE
  sym: WynikSymulacji;
}

const PROG_ZOLTY_MIN = 30; // poniżej tego zapasu -> żółty ("mały zapas")

/**
 * Funkcja "CZY ZDĄŻĘ?": symuluje podróż od podanej godziny `teraz`,
 * porównuje najwcześniejszy możliwy przyjazd z wymaganą godziną przyjazdu.
 */
export function czyZdaze(
  teraz: Date,
  wymaganyPrzyjazd: Date,
  calkowitaJazdaMin: number,
  stan: TachographState,
  opcje: OpcjePlanowania,
  rules: TachographRules
): WynikCzyZdaze {
  const sym = simulateForward(calkowitaJazdaMin, stan, opcje, rules);
  const najwczesniejszyPrzyjazd = sym.zablokowany
    ? wymaganyPrzyjazd
    : new Date(teraz.getTime() + sym.calkowityCzasMin * 60000);
  const zapasMin = sym.zablokowany
    ? -Infinity
    : Math.round((wymaganyPrzyjazd.getTime() - najwczesniejszyPrzyjazd.getTime()) / 60000);

  let status: StatusCzyZdaze;
  if (sym.zablokowany) status = "NIE";
  else if (zapasMin <= 0) status = "NIE";
  else if (zapasMin < PROG_ZOLTY_MIN) status = "TAK_MALO";
  else status = "TAK";

  return {
    status,
    najwczesniejszyPrzyjazd,
    wymaganyPrzyjazd,
    zapasMin,
    ilePotrzebaWczesniejszegoWyjazduMin: !sym.zablokowany && zapasMin < 0 ? -zapasMin : 0,
    sym,
  };
}

export interface SzybkaKalkulacja {
  jazdaMin: number;
  przerwyMin: number;
  odpoczynkiMin: number;
  calkowityCzasMin: number;
}

/** "Szybka kalkulacja" na ekranie głównym: sam czas jazdy -> minimalny czas podróży. */
export function szybkaKalkulacja(
  calkowitaJazdaMin: number,
  rules: TachographRules,
  opcje: OpcjePlanowania
): SzybkaKalkulacja {
  const sym = simulateForward(calkowitaJazdaMin, { ...zerowyStan() }, opcje, rules);
  let przerwyMin = 0;
  let odpoczynkiMin = 0;
  for (const z of sym.timeline) {
    if (z.typ === "PRZERWA") przerwyMin += z.czasTrwaniaMin;
    if (z.typ === "ODPOCZYNEK") odpoczynkiMin += z.czasTrwaniaMin;
  }
  return {
    jazdaMin: Math.round(calkowitaJazdaMin),
    przerwyMin,
    odpoczynkiMin,
    calkowityCzasMin: sym.calkowityCzasMin,
  };
}

function zerowyStan(): TachographState {
  return {
    jazdaOdOstatniejPrzerwyMin: 0,
    jazdaDzisiajMin: 0,
    jazdaWTymTygodniuMin: 0,
    jazdaWPoprzednimTygodniuMin: 0,
    wykorzystaneWydluzoneDni: 0,
    wykorzystaneSkroconeOdpoczynki: 0,
  };
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}
