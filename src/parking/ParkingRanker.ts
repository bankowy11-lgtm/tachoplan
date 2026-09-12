// ParkingRanker.ts
// ---------------------------------------------------------------------------
// Prawdziwy silnik wyboru najlepszego parkingu na pauzę/odpoczynek — patrz
// §14 i §15 specyfikacji ("NAJLEPSZY PARKING DO PAUZY"). Nie zależy od
// źródła danych: dostaje listę kandydatów (`ParkingCandidate`) i dozwolony
// pozostały czas jazdy, a zwraca ranking. Wyszukiwanie żywych kandydatów
// (Overpass API) jest w `services/parkingService.ts` (Etap 2) — ten moduł
// jest od tego całkowicie niezależny i w pełni przetestowany już teraz
// (patrz TEST H w `ParkingRanker.test.ts`).

import type { ParkingCandidate, WynikRankingu } from "./types";

export interface KryteriaWyboru {
  /** Ile minut jazdy pozostało do końca dozwolonego czasu jazdy — kandydat,
   *  do którego dojazd trwa dłużej, NIE pasuje do planu (kierowca by
   *  przekroczył limit, żeby do niego dojechać). */
  pozostalyCzasJazdyMin: number;
  /** Czy szukamy miejsca na krótką pauzę (45 min) czy na dłuższy odpoczynek —
   *  dla odpoczynku wymagamy większego zapasu bezpieczeństwa przed limitem. */
  cel: "pauza" | "odpoczynek";
}

const ZAPAS_BEZPIECZENSTWA_MIN: Record<KryteriaWyboru["cel"], number> = {
  pauza: 5, // nie podjeżdżamy "na styk" z limitem
  odpoczynek: 15,
};

/** Punktacja jednego kandydata — wyższa = lepszy wybór. */
function ocenKandydata(p: ParkingCandidate, kryteria: KryteriaWyboru): number {
  let wynik = 0;
  wynik += (p.ocena ?? 3) * 10;
  if (p.wc) wynik += 4;
  if (p.prysznic) wynik += kryteria.cel === "odpoczynek" ? 8 : 2;
  if (p.gastronomia) wynik += 5;
  if (p.monitoring) wynik += 6;
  if (p.strzezony) wynik += kryteria.cel === "odpoczynek" ? 10 : 3;
  if (p.stacjaPaliw) wynik += 2;
  if (p.ladowarkaEV) wynik += 1;
  // Bliżej punktu wyczerpania limitu jazdy = lepiej (nie każemy kierowcy
  // jechać dalej niż potrzeba), ale nie tak blisko, żeby zabrakło zapasu.
  wynik -= p.odlegloscKm * 0.15;
  return wynik;
}

/**
 * Zwraca pełny ranking kandydatów pasujących do planu (rosnąco po tym, jak
 * dobrze pasują — pierwszy = najlepszy), odfiltrowując te, do których dojazd
 * przekroczyłby dozwolony czas jazdy.
 */
export function rankujParkingi(
  kandydaci: ParkingCandidate[],
  kryteria: KryteriaWyboru
): WynikRankingu[] {
  const limit = kryteria.pozostalyCzasJazdyMin - ZAPAS_BEZPIECZENSTWA_MIN[kryteria.cel];

  return kandydaci
    .map((p) => ({
      parking: p,
      wynik: ocenKandydata(p, kryteria),
      pasujeDoPlanu: p.czasDojazduMin <= Math.max(0, limit),
    }))
    .filter((r) => r.pasujeDoPlanu)
    .sort((a, b) => b.wynik - a.wynik);
}

/** Wybiera JEDEN najlepszy parking (lub `null`, gdy żaden kandydat nie pasuje
 *  do pozostałego czasu jazdy — silnik nigdy nie zaproponuje postoju, do
 *  którego dojazd wymagałby przekroczenia limitu, §42). */
export function wybierzNajlepszyParking(
  kandydaci: ParkingCandidate[],
  kryteria: KryteriaWyboru
): WynikRankingu | null {
  const ranking = rankujParkingi(kandydaci, kryteria);
  return ranking[0] ?? null;
}
