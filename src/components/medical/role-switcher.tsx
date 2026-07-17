import { ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserRole, type UserRole } from "@/hooks/use-user-role";

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: "vendedor", label: "Vendedor", hint: "acesso comercial" },
  { value: "gestor",   label: "Gestor",   hint: "edita compliance e CMED" },
  { value: "admin",    label: "Admin",    hint: "todos os poderes" },
];

export function RoleSwitcher() {
  const { role, setRole } = useUserRole();
  const current = ROLES.find((r) => r.value === role) ?? ROLES[0];
  const Icon = role === "vendedor" ? User : ShieldCheck;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:px-2.5"
          aria-label={`Papel atual: ${current.label}`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden text-xs font-semibold sm:inline">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
          Perfil (mock RBAC)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem key={r.value} onClick={() => setRole(r.value)} className="flex flex-col items-start gap-0">
            <span className="text-xs font-semibold">
              {r.label} {role === r.value && <span className="ml-1 text-[10px] text-primary">· ativo</span>}
            </span>
            <span className="text-[10px] text-muted-foreground">{r.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
