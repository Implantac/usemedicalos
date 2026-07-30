import { useEffect, useState } from "react";

export type UserRole = "vendedor" | "gestor" | "admin";

const KEY = "use-medical:user-role";
const EVT = "use-medical:user-role-changed";

function read(): UserRole {
  if (typeof window === "undefined") return "vendedor";
  return (localStorage.getItem(KEY) as UserRole | null) ?? "vendedor";
}

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole>("vendedor");

  useEffect(() => {
    setRoleState(read());
    const handler = () => setRoleState(read());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setRole = (r: UserRole) => {
    localStorage.setItem(KEY, r);
    window.dispatchEvent(new CustomEvent(EVT));
  };

  return { role, setRole, isGestor: role === "gestor" || role === "admin" };
}
