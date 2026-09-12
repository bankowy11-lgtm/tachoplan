// Parkingi.tsx — moduł parkingów (§13–§15). Silnik wyboru parkingu
// (`src/parking/ParkingRanker.ts`) jest już zaimplementowany i przetestowany
// (TEST H) — to, czego jeszcze świadomie NIE ma w tej wersji, jest samo
// wyszukiwanie żywych kandydatów (Overpass API / OSM), zaplanowane na Etap 2.
// Zgodnie z §43 specyfikacji: żadnych fikcyjnych parkingów — tylko jasna
// informacja o statusie integracji.

export default function ParkingiScreen() {
  return (
    <div className="screen">
      <div className="section-title">🅿️ Parkingi</div>
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Moduł w przygotowaniu — Etap 2</div>
        <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
          Wyszukiwanie parkingów (MOP, dla ciężarowych, strzeżonych) w pobliżu trasy — przez Overpass API
          (OpenStreetMap) — zostanie podłączone w Etapie 2, razem z alarmami i powiadomieniami, zgodnie z
          zaproponowanym dwuetapowym planem budowy aplikacji.
        </p>
        <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
          Silnik wyboru najlepszego parkingu (ranking wg oceny, udogodnień i dopasowania do pozostałego czasu
          jazdy) jest już gotowy i przetestowany — patrz <code>src/parking/ParkingRanker.ts</code>. Gdy podłączymy
          żywe źródło danych, automatyczny dobór parkingu (§14, §15) zacznie działać bez zmian w tym silniku.
        </p>
      </div>
      <div className="warning-box">
        Nie pokazujemy tu żadnych przykładowych/fikcyjnych parkingów — wyłącznie prawdziwe dane, kiedy będą
        dostępne.
      </div>
    </div>
  );
}
