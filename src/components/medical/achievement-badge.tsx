import { Award, Clock, Droplets, Flame, Focus, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Achievement, AchievementId } from "@/lib/medical/achievements";
import { cn } from "@/lib/utils";

const ICONS: Record<AchievementId, LucideIcon> = {
  speed: Clock,
  precision: Droplets,
  consistency: Flame,
  rocket: Award,
  focus: Focus,
  resilience: ShieldCheck,
};

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const Icon = ICONS[achievement.id];
  const pct = Math.round(achievement.progress * 100);
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-smooth",
        achievement.unlocked
          ? "border-success/40 bg-gradient-to-br from-success/10 to-transparent"
          : "border-border bg-card opacity-70",
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full",
          achievement.unlocked ? "bg-success/20 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-xs font-bold text-foreground">{achievement.name}</div>
      <div className="min-h-[2.5rem] text-[10px] leading-snug text-muted-foreground">
        {achievement.description}
      </div>
      {achievement.unlocked ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
          <Award className="h-3 w-3" /> Desbloqueada
        </span>
      ) : (
        <div className="w-full">
          <div className="mb-0.5 flex justify-between text-[9px] text-muted-foreground">
            <span>Progresso</span>
            <span className="num">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary/60 transition-all"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
