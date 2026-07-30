import type { ReactNode } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SlaAlertBell } from "./sla-alert-bell";
import { NotificationCenter } from "./notification-center";
import { TenantSwitcher } from "./tenant-switcher";
import { RoleSwitcher } from "./role-switcher";
import { ChangelogButton } from "./changelog-button";

export function AppHeader({ onReset, children }: { onReset: () => void; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-primary-foreground/10 gradient-navy text-primary-foreground backdrop-blur supports-[backdrop-filter]:bg-primary/95">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }),
              );
            }}
            aria-label="Buscar (⌘K)"
            className="hidden h-8 items-center gap-2 rounded-md border border-primary-foreground/15 bg-primary-foreground/5 px-2.5 text-[11px] text-primary-foreground/70 transition-smooth hover:bg-primary-foreground/10 hover:text-primary-foreground md:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Buscar</span>
            <kbd className="rounded bg-primary-foreground/10 px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
          <TenantSwitcher />
          <RoleSwitcher />
          <ChangelogButton />

          {children}
          <NotificationCenter />
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

