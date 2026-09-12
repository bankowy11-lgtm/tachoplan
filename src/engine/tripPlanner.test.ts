// Testy silnika planowania — pokrywają wymagany zestaw TEST A–H (§35
// specyfikacji TachoPlan 2.0). Uruchamiane przez `npm test` (vitest).

import { describe, expect, it } from "vitest";
import { defaultRules } from "../tachographRules";
import { planTripBackward, simulateForward } from "./tripPlanner";
import { domyslneOpcje, pelniWypoczetyStan } from "../types";
import type { TachographState } from "../types";
import { rankujParkingi, wybierzNajlepszyParking } from "../parking/ParkingRanker";
import type { ParkingCandidate } from "../parking/types";

const stanZerowy: TachographState = { ...pelniWypoczetyStan };
const opcje = { ...domyslneOpcje };

function liczEventy(timeline: { typ: string }[], typ: string): number {
  return timeline.filter((e) => e.typ === typ).length;
}

describe("TEST A — 4 h jazdy: brak wymaganej przerwy", () => {
  it("nie wstawia PRZERWA dla 4h jazdy (poniżej progu 4h30)", () => {
    const wynik = simulateForward(4 * 60, stanZerowy, opcje, defaultRules);
    expect(liczEventy(wynik.timeline, "PRZERWA")).toBe(0);
    expect(wynik.calkowityCzasMin).toBe(4 * 60);
    expect(wynik.zablokowany).toBe(false);
  });
});

describe("TEST B — 5 h jazdy: wymagana przerwa", () => {
  it("wstawia dokładnie jedną PRZERWA 45 min po przekroczeniu 4h30 jazdy", () => {
    const wynik = simulateForward(5 * 60, stanZerowy, opcje, defaultRules);
    expect(liczEventy(wynik.timeline, "PRZERWA")).toBe(1);
    // 5h jazdy + 45 min przerwy
    expect(wynik.calkowityCzasMin).toBe(5 * 60 + 45);
  });
});

describe("TEST C — 9 h jazdy: prawidłowe zakończenie dnia", () => {
  it("9h to standardowy dzienny limit — jedna przerwa w trakcie, bez odpoczynku dobowego, dzień się kończy", () => {
    const wynik = simulateForward(9 * 60, stanZerowy, opcje, defaultRules);
    expect(liczEventy(wynik.timeline, "ODPOCZYNEK")).toBe(0);
    expect(wynik.liczbaDni).toBe(1);
    expect(wynik.timeline.at(-1)?.typ).toBe("PRZYJAZD");
  });
});

describe("TEST D — 10 h jazdy: tylko jeśli dostępne przedłużenie", () => {
  it("z dostępnym wydłużeniem (auto, 0/2 wykorzystane) 10h jazdy odbywa się w jednym dniu", () => {
    const wynik = simulateForward(10 * 60, stanZerowy, opcje, defaultRules);
    expect(liczEventy(wynik.timeline, "ODPOCZYNEK")).toBe(0);
    expect(wynik.wydluzoneDniPoTrasie).toBe(1);
  });

  it("bez dostępnego wydłużenia (tryb standardowy) 10h jazdy wymaga odpoczynku dobowego i drugiego dnia", () => {
    const opcjeStd = { ...opcje, trybLimituDziennego: "standardowy" as const };
    const wynik = simulateForward(10 * 60, stanZerowy, opcjeStd, defaultRules);
    expect(liczEventy(wynik.timeline, "ODPOCZYNEK")).toBeGreaterThanOrEqual(1);
    expect(wynik.liczbaDni).toBeGreaterThanOrEqual(2);
  });

  it("gdy wykorzystano już maksymalną liczbę wydłużonych dni, silnik nie sięga po kolejne wydłużenie", () => {
    const stanBezWydluzen: TachographState = {
      ...stanZerowy,
      wykorzystaneWydluzoneDni: defaultRules.maksymalnaLiczbaWydluzonychDni.value,
    };
    const wynik = simulateForward(10 * 60, stanBezWydluzen, opcje, defaultRules);
    expect(wynik.wydluzoneDniPoTrasie).toBe(defaultRules.maksymalnaLiczbaWydluzonychDni.value);
    expect(liczEventy(wynik.timeline, "ODPOCZYNEK")).toBeGreaterThanOrEqual(1);
  });
});

describe("TEST E — powyżej limitu tygodniowego: ostrzeżenie", () => {
  it("gdy zaplanowana jazda przekracza tygodniowy limit, silnik ostrzega i wstawia odpoczynek tygodniowy", () => {
    const stanBliskoLimitu: TachographState = {
      ...stanZerowy,
      jazdaWTymTygodniuMin: defaultRules.maksymalnaJazdaTygodniowa.value - 60, // brakuje 1h do limitu
    };
    const wynik = simulateForward(20 * 60, stanBliskoLimitu, opcje, defaultRules);
    expect(wynik.ostrzezenia.some((o) => o.includes("tygodniow"))).toBe(true);
    expect(liczEventy(wynik.timeline, "ODPOCZYNEK")).toBeGreaterThanOrEqual(1);
    expect(wynik.zablokowany).toBe(false);
  });
});

describe("TEST F — przekroczenie 90h w dwóch tygodniach: blokada planu", () => {
  it("blokuje plan, gdy stan wejściowy już przekracza limit dwutygodniowy (90h)", () => {
    const stanPrzekroczony: TachographState = {
      ...stanZerowy,
      jazdaWTymTygodniuMin: 50 * 60,
      jazdaWPoprzednimTygodniuMin: 45 * 60, // suma 95h > 90h
    };
    const wynik = simulateForward(5 * 60, stanPrzekroczony, opcje, defaultRules);
    expect(wynik.zablokowany).toBe(true);
    expect(wynik.powodBlokady).toBeTruthy();
    expect(wynik.calkowityCzasMin).toBe(0);
  });

  it("nie blokuje planu, gdy suma dwutygodniowa jest w normie", () => {
    const stanOk: TachographState = {
      ...stanZerowy,
      jazdaWTymTygodniuMin: 30 * 60,
      jazdaWPoprzednimTygodniuMin: 30 * 60,
    };
    const wynik = simulateForward(5 * 60, stanOk, opcje, defaultRules);
    expect(wynik.zablokowany).toBe(false);
  });
});

describe("TEST G — planowanie wstecz: prawidłowa godzina wyjazdu", () => {
  it("dla znanego czasu jazdy i zapasu wyjazd = przyjazd - całkowity czas podróży - zapas", () => {
    const przyjazd = new Date("2026-09-14T09:00:00"); // poniedziałek
    const opcjeZZapasem = { ...opcje, zapasCzasuMin: 30 };
    const wynik = planTripBackward(4 * 60, przyjazd, stanZerowy, opcjeZZapasem, defaultRules);
    const oczekiwanyWyjazdMs = przyjazd.getTime() - wynik.calkowityCzasMin * 60000 - 30 * 60000;
    expect(wynik.wyjazd.getTime()).toBe(oczekiwanyWyjazdMs);
    expect(wynik.przyjazd.getTime()).toBe(wynik.wyjazd.getTime() + wynik.calkowityCzasMin * 60000);
    expect(wynik.zapasMin).toBe(30);
  });

  it("główny scenariusz specyfikacji (§41): Bielsko-Biała → Pomigliano d'Arco, przyjazd pon. 09:00", () => {
    // ~18h35 czasu jazdy (przykład z promptu), kierowca w pełni wypoczęty, zapas 30 min.
    const przyjazd = new Date("2026-09-14T09:00:00");
    const opcjeZZapasem = { ...opcje, zapasCzasuMin: 30 };
    const czasJazdyMin = 18 * 60 + 35;
    const wynik = planTripBackward(czasJazdyMin, przyjazd, stanZerowy, opcjeZZapasem, defaultRules);
    expect(wynik.zablokowany).toBe(false);
    expect(wynik.wyjazd.getTime()).toBeLessThan(przyjazd.getTime());
    expect(wynik.zapasMin).toBe(30);
    expect(wynik.timeline[0].typ).toBe("START");
    expect(wynik.timeline.at(-1)?.typ).toBe("PRZYJAZD");
  });
});

describe("TEST H — parking przed końcem czasu jazdy: wybór odpowiedniego parkingu", () => {
  const kandydaci: ParkingCandidate[] = [
    {
      id: "A",
      nazwa: "Parking A",
      typ: "MOP",
      odlegloscKm: 12,
      czasDojazduMin: 10,
      ocena: 4.5,
      wc: true,
      prysznic: false,
      gastronomia: true,
      monitoring: true,
      strzezony: false,
      stacjaPaliw: true,
      ladowarkaEV: false,
    },
    {
      id: "B",
      nazwa: "Parking B (za daleko)",
      typ: "ciezarowy",
      odlegloscKm: 60,
      czasDojazduMin: 40, // silnikowi zostało tylko 27 min jazdy — ten kandydat nie pasuje
      ocena: 5,
      wc: true,
      prysznic: true,
      gastronomia: true,
      monitoring: true,
      strzezony: true,
      stacjaPaliw: true,
      ladowarkaEV: true,
    },
    {
      id: "C",
      nazwa: "Parking C (skromny)",
      typ: "bus",
      odlegloscKm: 8,
      czasDojazduMin: 7,
      ocena: 3,
      wc: false,
      prysznic: false,
      gastronomia: false,
      monitoring: false,
      strzezony: false,
      stacjaPaliw: false,
      ladowarkaEV: false,
    },
  ];

  it("wybiera najlepszy parking, do którego dojazd nie przekracza pozostałego czasu jazdy (27 min)", () => {
    const wynik = wybierzNajlepszyParking(kandydaci, { pozostalyCzasJazdyMin: 27, cel: "pauza" });
    expect(wynik).not.toBeNull();
    expect(wynik?.parking.id).toBe("A"); // A pasuje i ma lepszą ocenę/udogodnienia niż C; B nie pasuje
  });

  it("odrzuca kandydatów, do których dojazd przekroczyłby dozwolony czas jazdy", () => {
    const ranking = rankujParkingi(kandydaci, { pozostalyCzasJazdyMin: 27, cel: "pauza" });
    expect(ranking.some((r) => r.parking.id === "B")).toBe(false);
  });

  it("zwraca null, gdy żaden kandydat nie pasuje do pozostałego czasu jazdy", () => {
    const wynik = wybierzNajlepszyParking(kandydaci, { pozostalyCzasJazdyMin: 2, cel: "pauza" });
    expect(wynik).toBeNull();
  });
});
