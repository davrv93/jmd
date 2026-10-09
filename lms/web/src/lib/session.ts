import { createContextId } from "@builder.io/qwik";
import type { Me } from "./api";

export interface Toast {
  id: number;
  kind: "ok" | "bad" | "info";
  text: string;
}

export interface Session {
  me: Me | null;
  loaded: boolean;
  help: string; // tema de ayuda de la página actual (ver lib/help.ts)
  helpOpen: boolean;
  toasts: Toast[];
}

export const SessionContext = createContextId<Session>("lms.session");

export function isStaff(me: Me | null): boolean {
  return !!me && (me.roles.includes("instructor") || me.roles.includes("admin"));
}

let n = 0;
/** Aviso breve abajo a la derecha; desaparece solo. */
export function toast(s: Session, text: string, kind: Toast["kind"] = "ok") {
  const id = ++n;
  s.toasts = [...s.toasts, { id, kind, text }];
  setTimeout(() => (s.toasts = s.toasts.filter((t) => t.id !== id)), kind === "bad" ? 6000 : 3200);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
