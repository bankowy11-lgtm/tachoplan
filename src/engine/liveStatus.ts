// liveStatus.ts — stan "na żywo" używany przez ekran Jazda (§21) i Tryb
// kierowcy (§22). Nie zgaduje niczego: przechodzi po realnej, zakotwiczonej
// osi czasu (`ZdarzenieOsi[]` z datami) obliczonej wcześniej przez silnik
// (`planTripBackward`) i liczy, ile czasu minęło względem `now`.
//
// Uproszczenie: licznik tygodniowy nie resetuje się przy odpoczynku
// tygodniowym w tym podglądzie "na żywo" (sam silnik planowania — patrz
// `tripPlanner.ts` — to robi poprawnie przy generowaniu planu; tu liczy się
// tylko orientacyjny podgląd bieżącej podróży).

import type { TachographRules } from "../tachographRules";
import type { TachographState, ZdarzenieOsi } from "../types";

export interface LiveStatus {
  /** Typ zdarzenia trwającego w chwili `now` (null, gdy podróż się nie zaczęła / już się zakończyła). */
  aktualneZdarzenie: ZdarzenieOsi | null;
  sinceBreakMin: number;
  todayDriveMin: number;
  weekDriveMin: number;
  doPauzyMin: number | null; // null, gdy kierowca nie jedzie właśnie teraz
  doLimituTygodniowegoMin: number;
  zakonczona: boolean;
  niezaczeta: boolean;
}

export function obliczStanNaZywo(
  timeline: ZdarzenieOsi[],
  stan: TachographState,
  rules: TachographRules,
  now: Date
): LiveStatus {
  let sinceBreak = stan.jazdaOdOstatniejPrzerwyMin;
  let todayDrive = stan.jazdaDzisiajMin;
  let weekDrive = stan.jazdaWTymTygodniuMin;
  let aktualne: ZdarzenieOsi | null = null;

  const zdarzenia = timeline.filter((z) => z.kiedy);
  if (zdarzenia.length === 0) {
    return {
      aktualneZdarzenie: null,
      sinceBreakMin: sinceBreak,
      todayDriveMin: todayDrive,
      weekDriveMin: weekDrive,
      doPauzyMin: null,
      doLimituTygodniowegoMin: rules.maksymalnaJazdaTygodniowa.value - weekDrive,
      zakonczona: false,
      niezaczeta: true,
    };
  }

  if (now.getTime() < zdarzenia[0].kiedy!.getTime()) {
    return {
      aktualneZdarzenie: null,
      sinceBreakMin: sinceBreak,
      todayDriveMin: todayDrive,
      weekDriveMin: weekDrive,
      doPauzyMin: null,
      doLimituTygodniowegoMin: rules.maksymalnaJazdaTygodniowa.value - weekDrive,
      zakonczona: false,
      niezaczeta: true,
    };
  }

  for (const z of zdarzenia) {
    const start = z.kiedy!.getTime();
    const end = start + z.czasTrwaniaMin * 60000;
    if (now.getTime() < start) break;

    const wTrakcie = now.getTime() < end;
    const trwanieDoTerazMin = wTrakcie ? (now.getTime() - start) / 60000 : z.czasTrwaniaMin;

    if (z.typ === "JAZDA") {
      sinceBreak += trwanieDoTerazMin;
      todayDrive += trwanieDoTerazMin;
      weekDrive += trwanieDoTerazMin;
    } else if (z.typ === "PRZERWA") {
      if (wTrakcie) sinceBreak = 0;
      else sinceBreak = 0;
    } else if (z.typ === "ODPOCZYNEK") {
      sinceBreak = 0;
      todayDrive = 0;
    }

    if (wTrakcie) {
      aktualne = z;
      break;
    }
  }

  const ostatnie = zdarzenia.at(-1)!;
  const zakonczona = ostatnie.typ === "PRZYJAZD" && now.getTime() >= ostatnie.kiedy!.getTime();

  return {
    aktualneZdarzenie: aktualne,
    sinceBreakMin: sinceBreak,
    todayDriveMin: todayDrive,
    weekDriveMin: weekDrive,
    doPauzyMin: aktualne?.typ === "JAZDA" ? Math.max(0, rules.maksymalnaJazdaBezPrzerwy.value - sinceBreak) : null,
    doLimituTygodniowegoMin: Math.max(0, rules.maksymalnaJazdaTygodniowa.value - weekDrive),
    zakonczona,
    niezaczeta: false,
  };
}
