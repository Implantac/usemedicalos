import type { ReactNode } from "react";
import { Building2, Inbox, LayoutDashboard, Package, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TENANT } from "@/lib/medical/mock-data";
import { cn } from "@/lib/utils";
import { SlaAlertBell } from "./sla-alert-bell";
import logoAsset from "@/assets/use-medical-logo.png.asset.json";

const NAV = [
  { to: "/", label: "Inbox", icon: Inbox },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
] as const;

export function AppHeader({ onReset, children }: { onReset: () => void; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-primary-foreground/10 bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="USE Medical"
            className="h-9 w-9 object-contain drop-shadow-[0_2px_6px_rgba(230,120,40,0.35)]"
          />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">USE Medical</div>
            <div className="text-[10px] uppercase tracking-wider text-brand/90">Commercial OS</div>
          </div>
        </Link>


        <nav className="ml-4 flex items-center gap-0.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
                activeProps={{ className: "bg-brand/20 text-primary-foreground ring-1 ring-brand/40" }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-4 hidden items-center gap-1.5 text-xs opacity-80 lg:flex">
          <Building2 className="h-3.5 w-3.5" />
          <span className="font-medium">{TENANT.name}</span>
          <span className="opacity-60">· CNPJ {TENANT.cnpj}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {children}
          <SlaAlertBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset demo</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
