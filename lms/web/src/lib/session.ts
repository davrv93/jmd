import { createContextId } from "@builder.io/qwik";
import type { Me } from "./api";

export interface Session {
  me: Me | null;
  loaded: boolean;
}

export const SessionContext = createContextId<Session>("lms.session");

export function isStaff(me: Me | null): boolean {
  return !!me && (me.roles.includes("instructor") || me.roles.includes("admin"));
}
