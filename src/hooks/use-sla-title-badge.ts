// Badge de SLA no title + favicon (Melhoria #1).
// Atualiza document.title com contador de cotações em risco e desenha um
// badge vermelho sobre o favicon PNG.

import { useEffect } from "react";

const DEFAULT_TITLE = "USE Medical";

function faviconUrl(count: number): string {
  const badge =
    count > 0
      ? `<circle cx='48' cy='16' r='14' fill='%23dc2626'/><text x='48' y='21' font-size='16' font-family='Arial' font-weight='bold' fill='white' text-anchor='middle'>${
          count > 9 ? "9+" : count
        }</text>`
      : "";
  // SVG genérico com ícone de documento + badge de contagem.
  const inner = `<rect x='14' y='8' width='36' height='48' rx='4' fill='%23e2e8f0'/><rect x='22' y='20' width='20' height='4' fill='%2364748b'/><rect x='22' y='28' width='20' height='4' fill='%2364748b'/><rect x='22' y='36' width='14' height='4' fill='%2364748b'/>${badge}`;
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${inner}</svg>`;
}

export function useSlaTitleBadge(count: number): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = count > 0 ? `(${count}) ${DEFAULT_TITLE}` : DEFAULT_TITLE;

    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) return;
    try {
      const url = faviconUrl(count);
      link.href = url;
    } catch {
      /* noop */
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [count]);
}
