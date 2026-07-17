import type { ReactNode } from "react";
import { FileSearch, Inbox, KeyRound, LayoutDashboard, LineChart, Package, Plug, Radio, RefreshCw, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SlaAlertBell } from "./sla-alert-bell";
import { TenantSwitcher } from "./tenant-switcher";
import { RoleSwitcher } from "./role-switcher";
import logoAsset from "@/assets/use-medical-logo.png.asset.json";


const NAV = [
  { to: "/", label: "Inbox", icon: Inbox },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sla-watchdog", label: "SLA Watchdog", icon: Radio },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/inteligencia", label: "Inteligência", icon: LineChart },
  { to: "/integracoes", label: "Integrações", icon: Plug },
  { to: "/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/excecoes", label: "Exceções", icon: ShieldCheck },
  { to: "/governanca", label: "Governança", icon: Shield },
  { to: "/auditoria", label: "Auditoria", icon: FileSearch },
  { to: "/quarentena", label: "Quarentena", icon: ShieldAlert },
] as const;



export function AppHeader({ onReset, children }: { onReset: () => void; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-primary-foreground/10 gradient-navy text-primary-foreground backdrop-blur supports-[backdrop-filter]:bg-primary/95">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5 press">
          <img
            src={logoAsset.url}
            alt="USE Medical"
            className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(230,120,40,0.35)] sm:h-9 sm:w-9"
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold tracking-tight">USE Medical</div>
            <div className="hidden text-[10px] uppercase tracking-wider text-brand/90 sm:block">Commercial OS</div>
          </div>
        </Link>


        <nav className="ml-1 flex min-w-0 items-center gap-0.5 sm:ml-4">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                aria-label={n.label}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary-foreground/75 transition-smooth hover:bg-primary-foreground/10 hover:text-primary-foreground sm:px-2.5 press",
                )}
                activeProps={{ className: "bg-brand/25 text-primary-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-brand)_45%,transparent)]" }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <TenantSwitcher />
          <RoleSwitcher />


          {children}
          <SlaAlertBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            aria-label="Reset demo"
            className="h-8 gap-1.5 px-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:px-3"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset demo</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
