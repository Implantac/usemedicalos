import { useEffect, useState } from "react";

/**
 * Returns `true` once the component has mounted on the client.
 * Use this to prevent hydration mismatches caused by server/client differences
 * such as `new Date()`, `Math.random()`, or browser-only APIs.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

