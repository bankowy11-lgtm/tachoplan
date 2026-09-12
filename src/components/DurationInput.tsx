/** Pole wpisywania czasu trwania w formacie godziny + minuty (przechowywane jako minuty). */
export default function DurationInput({
  label,
  minutes,
  onChange,
  hint,
  maxHours = 99,
}: {
  label: string;
  minutes: number;
  onChange: (m: number) => void;
  hint?: string;
  maxHours?: number;
}) {
  const h = Math.floor(Math.max(0, minutes) / 60);
  const m = Math.max(0, minutes) % 60;

  return (
    <div className="field">
      <label>{label}</label>
      <div className="row-2">
        <div>
          <input
            type="number"
            min={0}
            max={maxHours}
            inputMode="numeric"
            value={h}
            onChange={(e) => {
              const nh = Math.max(0, Math.min(maxHours, Number(e.target.value) || 0));
              onChange(nh * 60 + m);
            }}
            placeholder="godz."
          />
        </div>
        <div>
          <input
            type="number"
            min={0}
            max={59}
            inputMode="numeric"
            value={m}
            onChange={(e) => {
              const nm = Math.max(0, Math.min(59, Number(e.target.value) || 0));
              onChange(h * 60 + nm);
            }}
            placeholder="min"
          />
        </div>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
