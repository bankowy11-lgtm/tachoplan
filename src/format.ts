// Pomocnicze funkcje formatowania czasu i dat po polsku.

const DNI_TYGODNIA = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

const DNI_TYGODNIA_KROTKO = ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];

export function nazwaDnia(d: Date): string {
  return DNI_TYGODNIA[d.getDay()];
}

export function nazwaDniaKrotko(d: Date): string {
  return DNI_TYGODNIA_KROTKO[d.getDay()];
}

export function formatGodzina(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

/** "Poniedziałek 09:00" */
export function formatDzienGodzina(d: Date): string {
  return `${nazwaDnia(d)} ${formatGodzina(d)}`;
}

/** "12.09.2026" */
export function formatDataKrotka(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
}

/** Minuty -> "H:MM" (np. 18h30m -> "18:30"). */
export function formatHM(minuty: number): string {
  const ujemne = minuty < 0;
  const m = Math.round(Math.abs(minuty));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${ujemne ? "-" : ""}${h}:${mm.toString().padStart(2, "0")}`;
}

/** Minuty -> "18 godz. 30 min" (do tekstów opisowych). */
export function formatHMSlownie(minuty: number): string {
  const m = Math.round(Math.abs(minuty));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} godz.`);
  if (mm > 0 || h === 0) parts.push(`${mm} min`);
  return parts.join(" ");
}

/** Parsuje "HH:MM" lub "H:MM" na liczbę minut. Zwraca null, jeśli błędny format. */
export function parseHM(text: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

/** Buduje datę na podstawie dnia tygodnia (0=Nd..6=Sob) + godziny, biorąc najbliższe
 *  wystąpienie tego dnia od `bazowaData` (włącznie z dzisiaj). */
export function najblizszaDataDlaDnia(
  bazowaData: Date,
  dzienTygodnia: number,
  godzina: number,
  minuta: number
): Date {
  const wynik = new Date(bazowaData);
  wynik.setHours(godzina, minuta, 0, 0);
  let diff = (dzienTygodnia - wynik.getDay() + 7) % 7;
  if (diff === 0 && wynik.getTime() < bazowaData.getTime()) diff = 7;
  wynik.setDate(wynik.getDate() + diff);
  return wynik;
}
