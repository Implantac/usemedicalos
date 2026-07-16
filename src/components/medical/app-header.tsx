import { Activity, Building2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TENANT } from "@/lib/medical/mock-data";

export function AppHeader({ onReset }: { onReset: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary-foreground/10">
            <Activity className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">USE Medical</div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">Commercial OS</div>
          </div>
        </div>
        <div className="ml-4 hidden items-center gap-1.5 text-xs opacity-80 md:flex">
          <Building2 className="h-3.5 w-3.5" />
          <span className="font-medium">{TENANT.name}</span>
          <span className="opacity-60">· CNPJ {TENANT.cnpj}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset demo
          </Button>
        </div>
      </div>
    </header>
  );
}
