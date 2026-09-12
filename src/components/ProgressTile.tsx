import { formatHM } from "../format";
import type { PoziomZapasu } from "../types";

function poziomDlaUdzialu(udzial: number): PoziomZapasu {
  if (udzial >= 1) return "czerwony";
  if (udzial >= 0.85) return "zolty";
  return "zielony";
}

/** Kafelek z paskiem postępu, np. "JAZDA DZISIAJ  06:35 / 09:00". */
export default function ProgressTile({
  icon,
  title,
  wartoscMin,
  maxMin,
  note,
}: {
  icon: string;
  title: string;
  wartoscMin: number;
  maxMin: number;
  note?: string;
}) {
  const udzial = maxMin > 0 ? wartoscMin / maxMin : 0;
  const poziom = poziomDlaUdzialu(udzial);
  const szerokosc = Math.min(100, Math.max(0, udzial * 100));

  return (
    <div className="tile">
      <div className="tile-top">
        <span className="tile-title">
          {icon} {title}
        </span>
        <span className="tile-values">
          {formatHM(wartoscMin)} / {formatHM(maxMin)}
        </span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${poziom}`} style={{ width: `${szerokosc}%` }} />
      </div>
      {note && <div className="tile-note">{note}</div>}
    </div>
  );
}
