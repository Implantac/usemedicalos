import { formatBRL } from "@/lib/medical/pricing";

interface Props {
  progress: number;
  goal: number;
  label?: string;
  size?: number;
}

export function DailyGoalRing({ progress, goal, label = "Meta diária", size = 96 }: Props) {
  const pct = Math.min(1, goal > 0 ? progress / goal : 0);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const color = pct >= 1 ? "var(--success)" : pct >= 0.5 ? "var(--brand)" : "var(--warning)";
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 card-shadow">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          stroke={color}
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="num text-lg font-bold text-foreground">{formatBRL(progress)}</div>
        <div className="text-[11px] text-muted-foreground">de {formatBRL(goal)} · {(pct * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
}
