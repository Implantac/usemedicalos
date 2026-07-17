import {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { Loader2, ChevronDown, X, Check } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* i18n — dicionário simples plugável                                  */
/* ------------------------------------------------------------------ */

export type Locale = "pt-BR" | "en-US" | "es-ES";

type Dict = {
  loading: string;
  empty: string;
  error: string;
  success: string;
  unauthenticated: string;
  slowHint: string;
};

const dictionaries: Record<Locale, Dict> = {
  "pt-BR": {
    loading: "Carregando...",
    empty: "Nenhum resultado encontrado",
    error: "Ocorreu um erro inesperado",
    success: "Operação concluída com sucesso",
    unauthenticated: "Você precisa estar logado para concluir esta operação",
    slowHint: "Isso está levando mais tempo que o esperado...",
  },
  "en-US": {
    loading: "Loading...",
    empty: "No results found",
    error: "An unexpected error occurred",
    success: "Operation completed successfully",
    unauthenticated: "You must be signed in to complete this operation",
    slowHint: "This is taking longer than expected...",
  },
  "es-ES": {
    loading: "Cargando...",
    empty: "Sin resultados",
    error: "Ocurrió un error inesperado",
    success: "Operación completada con éxito",
    unauthenticated: "Debes iniciar sesión para completar esta operación",
    slowHint: "Está tardando más de lo esperado...",
  },
};

const LocaleCtx = createContext<Locale>("pt-BR");

export function StatePanelsProvider({
  locale = "pt-BR",
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}

function useDict() {
  const locale = useContext(LocaleCtx);
  return useMemo(() => dictionaries[locale] ?? dictionaries["pt-BR"], [locale]);
}

/* ------------------------------------------------------------------ */
/* Base                                                                */
/* ------------------------------------------------------------------ */

const baseFont = { fontFamily: '"Open Sans", Inter, sans-serif', fontSize: 16 };

type BaseProps = {
  message?: string;
  className?: string;
  /** Se true, move o foco do teclado para o painel ao montar. */
  autoFocus?: boolean;
};

/** Hook que envia foco para o container quando `enabled` é true.
 *  Só age uma vez por montagem — respeita navegação por teclado. */
function useManagedFocus<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    // Aguarda a transição de entrada para não roubar foco antes do paint.
    const id = requestAnimationFrame(() => el.focus({ preventScroll: false }));
    return () => cancelAnimationFrame(id);
  }, [enabled]);
  return ref;
}

/* Wrapper com fade-in suave (evita "congelamento" visual) */
function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out motion-reduce:transition-none",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading — com hint progressivo após 2s                              */
/* ------------------------------------------------------------------ */

export function LoadingState({
  message,
  className,
  slowThresholdMs = 2000,
  autoFocus = false,
}: BaseProps & { slowThresholdMs?: number }) {
  const dict = useDict();
  const [slow, setSlow] = useState(false);
  const ref = useManagedFocus<HTMLDivElement>(autoFocus);

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), slowThresholdMs);
    return () => window.clearTimeout(t);
  }, [slowThresholdMs]);

  const label = message ?? dict.loading;

  return (
    <FadeIn className={cn("mx-auto w-fit", className)}>
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
        tabIndex={-1}
        className="flex flex-col items-center justify-center gap-3 rounded-full aspect-square w-40 p-6 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
        style={{ ...baseFont, backgroundColor: "#333", color: "#666" }}
      >
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" style={{ color: "#666" }} />
        <span style={{ color: "#666" }}>{label}</span>
      </div>
      <div
        className={cn(
          "mt-2 text-center text-xs transition-opacity duration-300",
          slow ? "opacity-100" : "opacity-0",
        )}
        style={{ ...baseFont, fontSize: 12, color: "#666" }}
        aria-live="polite"
      >
        {slow ? dict.slowHint : "\u00A0"}
      </div>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/* Empty                                                               */
/* ------------------------------------------------------------------ */

export function EmptyState({
  message,
  className,
  action,
  autoFocus = false,
}: BaseProps & { action?: ReactNode }) {
  const dict = useDict();
  const ref = useManagedFocus<HTMLDivElement>(autoFocus);
  const label = message ?? dict.empty;
  return (
    <FadeIn>
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg p-8 w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
          className,
        )}
        style={{ ...baseFont, backgroundColor: "#f7f7f7", color: "#666" }}
      >
        <ChevronDown className="h-8 w-8" aria-hidden="true" style={{ color: "#666" }} />
        <span>{label}</span>
        {action}
      </div>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/* Error                                                               */
/* ------------------------------------------------------------------ */

export function ErrorState({
  message,
  className,
  onRetry,
  autoFocus = true,
}: BaseProps & { onRetry?: () => void }) {
  const dict = useDict();
  const ref = useManagedFocus<HTMLDivElement>(autoFocus);
  const label = message ?? dict.error;
  return (
    <FadeIn>
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "flex items-center gap-3 rounded-lg p-4 w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
          className,
        )}
        style={{ ...baseFont, backgroundColor: "#f44336", color: "#fff" }}
      >
        <X className="h-6 w-6 shrink-0" aria-hidden="true" />
        <span className="flex-1">{label}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded px-3 py-1 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "#fff" }}
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/* Success                                                             */
/* ------------------------------------------------------------------ */

export function SuccessState({
  message,
  className,
  autoFocus = false,
}: BaseProps) {
  const dict = useDict();
  const ref = useManagedFocus<HTMLDivElement>(autoFocus);
  const label = message ?? dict.success;
  return (
    <FadeIn>
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "flex items-center gap-3 rounded-lg p-4 w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
          className,
        )}
        style={{ ...baseFont, backgroundColor: "#4CAF50", color: "#fff" }}
      >
        <Check className="h-6 w-6 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/* Máquina de estado única — evita condicionais espalhadas             */
/* ------------------------------------------------------------------ */

export type ViewStatus = "loading" | "empty" | "error" | "success" | "idle";

export function StateView<T>({
  status,
  data,
  error,
  messages,
  onRetry,
  children,
  isEmpty = (d: T) => Array.isArray(d) && d.length === 0,
}: {
  status: ViewStatus;
  data?: T;
  error?: string;
  messages?: Partial<Dict>;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
}) {
  if (status === "loading") return <LoadingState message={messages?.loading} />;
  if (status === "error")
    return <ErrorState message={error ?? messages?.error} onRetry={onRetry} autoFocus />;
  if (status === "success" && messages?.success)
    return <SuccessState message={messages.success} />;
  if (data !== undefined && isEmpty(data))
    return <EmptyState message={messages?.empty} autoFocus />;
  if (data !== undefined) return <>{children(data)}</>;
  return null;
}

/* ------------------------------------------------------------------ */
/* Integração com TanStack Router — Loading global de navegação        */
/* ------------------------------------------------------------------ */

/**
 * Monte uma vez em __root.tsx para exibir feedback progressivo
 * automaticamente durante transições de rota que passam de 2s.
 */
export function RouteLoadingOverlay({ thresholdMs = 2000 }: { thresholdMs?: number }) {
  const isLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), thresholdMs);
    return () => window.clearTimeout(t);
  }, [isLoading, thresholdMs]);

  if (!visible) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex justify-center pt-4 pointer-events-none"
      aria-live="polite"
    >
      <LoadingState />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback contextual (regra: logado→sucesso; deslogado→erro)         */
/* ------------------------------------------------------------------ */

export function OperationFeedback({
  isLoggedIn,
  status,
  successMessage,
  errorMessage,
  unauthenticatedMessage,
}: {
  isLoggedIn: boolean;
  status: "success" | "error";
  successMessage?: string;
  errorMessage?: string;
  unauthenticatedMessage?: string;
}) {
  const dict = useDict();
  if (status === "error")
    return <ErrorState message={errorMessage ?? dict.error} autoFocus />;
  if (!isLoggedIn)
    return <ErrorState message={unauthenticatedMessage ?? dict.unauthenticated} autoFocus />;
  return <SuccessState message={successMessage ?? dict.success} />;
}
