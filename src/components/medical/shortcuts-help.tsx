import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

type Shortcut = { keys: string[]; label: string; group: string };

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], label: "Abrir busca global", group: "Navegação" },
  { keys: ["Ctrl", "K"], label: "Abrir busca global (Windows/Linux)", group: "Navegação" },
  { keys: ["?"], label: "Mostrar atalhos", group: "Navegação" },
  { keys: ["Esc"], label: "Fechar diálogos e drawers", group: "Navegação" },
  { keys: ["G", "I"], label: "Ir para Inbox", group: "Ir para" },
  { keys: ["G", "D"], label: "Ir para Dashboard", group: "Ir para" },
  { keys: ["G", "E"], label: "Ir para Executivo", group: "Ir para" },
  { keys: ["G", "A"], label: "Ir para Auditoria", group: "Ir para" },
];

const GO_MAP: Record<string, string> = {
  i: "/",
  d: "/dashboard",
  e: "/executivo",
  a: "/auditoria",
  c: "/compliance",
  g: "/governanca",
  p: "/produtos",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let awaitingGo = false;
    let goTimer: number | undefined;

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Sequência "g <letra>"
      if (awaitingGo) {
        const dest = GO_MAP[e.key.toLowerCase()];
        awaitingGo = false;
        window.clearTimeout(goTimer);
        if (dest) {
          e.preventDefault();
          window.location.assign(dest);
        }
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        awaitingGo = true;
        goTimer = window.setTimeout(() => {
          awaitingGo = false;
        }, 1200);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(goTimer);
    };
  }, []);

  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Navegue mais rápido pelo Commercial OS. Pressione <kbd className="rounded bg-muted px-1 text-xs">?</kbd> a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g}
              </div>
              <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-foreground">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
