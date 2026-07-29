import { Link, useRouterState } from "@tanstack/react-router";
import {
  Cloud,
  FileSearch,
  Gauge,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Package,
  Plug,
  Radar,
  Radio,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logoAsset from "@/assets/use-medical-logo.png.asset.json";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_LABEL, type Permission } from "@/lib/medical/governance";

type NavItem = { to: string; label: string; icon: typeof Inbox; perm?: Permission };

const OPERACAO: NavItem[] = [
  { to: "/command", label: "Command Center", icon: Radar, perm: "quotes.view" },
  { to: "/inbox", label: "Inbox Universal", icon: Inbox, perm: "quotes.view" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "quotes.view" },
  { to: "/executivo", label: "Executivo", icon: Gauge, perm: "quotes.view" },
  { to: "/sla-watchdog", label: "SLA Watchdog", icon: Radio, perm: "quotes.view" },
];

const CATALOGO: NavItem[] = [
  { to: "/produtos", label: "Produtos", icon: Package, perm: "pricing.governance" },
  { to: "/inteligencia", label: "Inteligência", icon: LineChart, perm: "quotes.view" },
];

const INTEGRACAO: NavItem[] = [
  { to: "/integracoes", label: "Integrações", icon: Plug, perm: "integrations.manage" },
  { to: "/api-keys", label: "API Keys", icon: KeyRound, perm: "api_keys.manage" },
  { to: "/cloud-readiness", label: "Cloud", icon: Cloud, perm: "tenant.configure" },
];

const GOVERNANCA: NavItem[] = [
  { to: "/excecoes", label: "Exceções", icon: ShieldCheck, perm: "compliance.override" },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck, perm: "compliance.override" },
  { to: "/governanca", label: "Governança", icon: Shield, perm: "governance.manage" },
  { to: "/auditoria", label: "Auditoria", icon: FileSearch, perm: "governance.manage" },
  { to: "/quarentena", label: "Quarentena", icon: ShieldAlert, perm: "integrations.manage" },
  { to: "/configuracoes", label: "Configurações", icon: Settings2, perm: "tenant.configure" },
];

function NavGroup({
  label,
  items,
  currentPath,
  can,
}: {
  label: string;
  items: NavItem[];
  currentPath: string;
  can: (p: Permission) => boolean;
}) {
  const visible = items.filter((n) => !n.perm || can(n.perm));
  if (visible.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((n) => {
            const Icon = n.icon;
            const active = currentPath === n.to;
            return (
              <SidebarMenuItem key={n.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={n.label}>
                  <Link to={n.to} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{n.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { can, role } = usePermissions();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex min-w-0 items-center gap-2 px-1 py-1">
          <img
            src={logoAsset.url}
            alt="USE Medical"
            className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(230,120,40,0.35)]"
          />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">USE Medical</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Commercial OS</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Operação" items={OPERACAO} currentPath={currentPath} can={can} />
        <NavGroup label="Catálogo" items={CATALOGO} currentPath={currentPath} can={can} />
        <NavGroup label="Integração" items={INTEGRACAO} currentPath={currentPath} can={can} />
        <NavGroup label="Governança" items={GOVERNANCA} currentPath={currentPath} can={can} />
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pb-1 text-[10px] text-sidebar-foreground/50">
            <span>v1 · Commercial OS</span>
            <span className="rounded bg-sidebar-accent/40 px-1.5 py-0.5 font-medium text-sidebar-foreground/70">
              {ROLE_LABEL[role]}
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
