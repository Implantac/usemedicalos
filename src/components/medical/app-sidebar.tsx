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
  Radio,
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

type NavItem = { to: string; label: string; icon: typeof Inbox };

const OPERACAO: NavItem[] = [
  { to: "/", label: "Inbox", icon: Inbox },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/executivo", label: "Executivo", icon: Gauge },
  { to: "/sla-watchdog", label: "SLA Watchdog", icon: Radio },
];

const CATALOGO: NavItem[] = [
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/inteligencia", label: "Inteligência", icon: LineChart },
];

const INTEGRACAO: NavItem[] = [
  { to: "/integracoes", label: "Integrações", icon: Plug },
  { to: "/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/cloud-readiness", label: "Cloud", icon: Cloud },
];

const GOVERNANCA: NavItem[] = [
  { to: "/excecoes", label: "Exceções", icon: ShieldCheck },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/governanca", label: "Governança", icon: Shield },
  { to: "/auditoria", label: "Auditoria", icon: FileSearch },
  { to: "/quarentena", label: "Quarentena", icon: ShieldAlert },
];

function NavGroup({ label, items, currentPath }: { label: string; items: NavItem[]; currentPath: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((n) => {
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
        <NavGroup label="Operação" items={OPERACAO} currentPath={currentPath} />
        <NavGroup label="Catálogo" items={CATALOGO} currentPath={currentPath} />
        <NavGroup label="Integração" items={INTEGRACAO} currentPath={currentPath} />
        <NavGroup label="Governança" items={GOVERNANCA} currentPath={currentPath} />
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] text-sidebar-foreground/50">
            v1 · Commercial OS
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
