export type Tab = "start" | "trasa" | "jazda" | "parkingi" | "historia" | "ustawienia";

const ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "start", icon: "🏠", label: "Start" },
  { id: "trasa", icon: "🗺️", label: "Trasa" },
  { id: "jazda", icon: "🚛", label: "Jazda" },
  { id: "parkingi", icon: "🅿️", label: "Parkingi" },
  { id: "historia", icon: "📂", label: "Historia" },
  { id: "ustawienia", icon: "⚙️", label: "Ustawienia" },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={active === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
        >
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
