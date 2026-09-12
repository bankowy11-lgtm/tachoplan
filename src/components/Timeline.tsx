import { formatDataKrotka, formatGodzina, formatHM, formatHMSlownie, nazwaDnia } from "../format";
import type { ZdarzenieOsi } from "../types";

const IKONY: Record<string, string> = {
  START: "🚦",
  JAZDA: "🚚",
  PRZERWA: "☕",
  ODPOCZYNEK: "💤",
  PRZYJAZD: "🏁",
};

const KLASY: Record<string, string> = {
  START: "start",
  JAZDA: "jazda",
  PRZERWA: "przerwa",
  ODPOCZYNEK: "odpoczynek",
  PRZYJAZD: "przyjazd",
};

function etykieta(z: ZdarzenieOsi): string {
  switch (z.typ) {
    case "START":
      return "Start podróży";
    case "JAZDA":
      return "Jazda" + (z.opis ? ` — ${z.opis}` : "");
    case "PRZERWA":
      return z.opis ?? "Przerwa";
    case "ODPOCZYNEK":
      return z.opis ?? "Odpoczynek dobowy";
    case "PRZYJAZD":
      return "Przyjazd na miejsce";
  }
}

export default function Timeline({ zdarzenia }: { zdarzenia: ZdarzenieOsi[] }) {
  let ostatniDzien: string | null = null;

  return (
    <div className="timeline">
      {zdarzenia.map((z, i) => {
        const dzienKlucz = z.kiedy ? z.kiedy.toDateString() : null;
        const nowyDzien = dzienKlucz !== null && dzienKlucz !== ostatniDzien;
        if (nowyDzien) ostatniDzien = dzienKlucz;

        return (
          <div key={i}>
            {nowyDzien && z.kiedy && (
              <div className="timeline-day">
                🚛 {nazwaDnia(z.kiedy).toUpperCase()}
                <span style={{ color: "var(--text-faint)", fontWeight: 600, fontSize: 12 }}>
                  {formatDataKrotka(z.kiedy)}
                </span>
              </div>
            )}
            <div className="timeline-item">
              <div className={`timeline-icon ${KLASY[z.typ]}`}>{IKONY[z.typ]}</div>
              <div className="timeline-body">
                <div className="timeline-time">{z.kiedy ? formatGodzina(z.kiedy) : "—"}</div>
                <div className="timeline-label">
                  {etykieta(z)}
                  {z.czasTrwaniaMin > 0 ? ` (${formatHMSlownie(z.czasTrwaniaMin)})` : ""}
                </div>
                {z.typ !== "PRZYJAZD" && (
                  <div className="timeline-meta">
                    Pozostało jazdy: {formatHM(z.pozostalaJazdaMin)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
