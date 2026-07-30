import type { QuoteStatus } from "@/lib/medical/types";
import { STATUS_LABEL } from "@/lib/medical/types";

const COLORS: Record<QuoteStatus, string> = {
  pending_review: "oklch(0.72 0.18 55)", // brand/orange
  aguardando_precificacao: "oklch(0.75 0.14 75)", // warning
  em_negociacao: "oklch(0.32 0.08 255)", // primary
  enviado: "oklch(0.55 0.12 200)", // teal-ish
  ganho: "oklch(0.62 0.15 155)", // success
  perdido: "oklch(0.65 0.19 25)", // danger
};

export function StatusDonut({ data }: { data: { status: QuoteStatus; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const size = 140;
  const radius = 56;
  const stroke = 22;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Distribuição por status
      </h3>
      <div className="flex items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="oklch(0.93 0.005 240)" strokeWidth={stroke} />
          {total > 0 &&
            data.map((d) => {
              const frac = d.count / total;
              const dash = frac * circ;
              const el = (
                <circle
                  key={d.status}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={COLORS[d.status]}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-acc * circ}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              );
              acc += frac;
              return el;
            })}
          <text x={cx} y={cy - 2} textAnchor="middle" className="fill-foreground" fontSize={18} fontWeight={700}>
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
            cotações
          </text>
        </svg>
        <ul className="flex-1 space-y-1 text-xs">
          {data.map((d) => (
            <li key={d.status} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-sm" style={{ background: COLORS[d.status] }} />
                <span className="truncate text-muted-foreground">{STATUS_LABEL[d.status]}</span>
              </span>
              <span className="num font-semibold">{d.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
