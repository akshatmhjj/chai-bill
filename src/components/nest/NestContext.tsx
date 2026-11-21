"use client";

import { createContext, useCallback, useContext } from "react";

const NestIdContext = createContext<string | null>(null);

/** Gives every component inside one nest its id, so links and actions stay in that nest. */
export function NestIdProvider({ nestId, children }: { nestId: string; children: React.ReactNode }) {
  return <NestIdContext.Provider value={nestId}>{children}</NestIdContext.Provider>;
}

export function useNestId(): string {
  const id = useContext(NestIdContext);
  if (!id) throw new Error("useNestId must be used inside a nest");
  return id;
}

/** Builds a path inside the current nest: nestPath("/expenses") gives "/n/<id>/expenses". */
export function useNestPath(): (path?: string) => string {
  const id = useNestId();
  return useCallback((path = "") => (path === "/" || path === "" ? `/n/${id}` : `/n/${id}${path}`), [id]);
}
