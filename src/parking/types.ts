// Typy modułu parkingów. Wyszukiwanie żywych danych (Overpass API / OSM) jest
// zaplanowane na Etap 2 (patrz README → „Plan Etap 2”); poniższy `ParkingRanker`
// jest już prawdziwym, przetestowanym silnikiem wyboru — działa na jakiejkolwiek
// liście kandydatów zgodnej z `ParkingCandidate`, niezależnie od tego, skąd
// pochodzą (na razie: brak źródła danych → moduł UI pokazuje to jawnie,
// zamiast podawać fikcyjne parkingi — patrz §43 specyfikacji).

export type TypParkingu = "ciezarowy" | "bus" | "MOP" | "strzezony";

export interface ParkingCandidate {
  id: string;
  nazwa: string;
  typ: TypParkingu;
  /** Odległość od punktu, w którym kończy się dozwolony czas jazdy (km). */
  odlegloscKm: number;
  /** Ile minut jazdy trzeba jeszcze wykonać, aby dojechać do tego parkingu. */
  czasDojazduMin: number;
  ocena?: number; // 0..5
  wc: boolean;
  prysznic: boolean;
  gastronomia: boolean;
  monitoring: boolean;
  strzezony: boolean;
  stacjaPaliw: boolean;
  ladowarkaEV: boolean;
}

export interface WynikRankingu {
  parking: ParkingCandidate;
  /** Punktacja użyta do wyboru — wyższa = lepsza. */
  wynik: number;
  pasujeDoPlanu: boolean;
}
