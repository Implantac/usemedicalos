import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AppHeader } from "./app-header";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_LABEL, type Permission } from "@/lib/medical/governance";

interface Props {
  perm: Permission;
  title?: string;
  children: ReactNode;
}

/**
 * Bloqueia a rota quando o papel ativo não possui a permissão exigida.
 * Mantém a topbar (para trocar de papel/tenant) e mostra um card de acesso negado.
 */
export function PermissionGate({ perm, title, children }: Props) {
  const { can, role } = usePermissions();
  if (can(perm)) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => window.location.reload()} />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-lg border bg-card p-6 text-center card-shadow">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-base font-semibold text-foreground">
            {title ?? "Acesso restrito"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Seu papel atual (<strong>{ROLE_LABEL[role]}</strong>) não possui a
            permissão <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{perm}</code>{" "}
            neste tenant. Peça a um admin para ajustar sua governança.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/">Voltar à Inbox</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/governanca">Ver governança</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
