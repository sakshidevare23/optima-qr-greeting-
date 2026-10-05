import { createContext, useContext, useState, type ReactNode } from "react";
import type { GreetingData } from "@/data/fields";
import type { Format } from "@/lib/render";

export interface Draft {
  data: GreetingData;
  template?: string;
  format: Format;
  messageEdited?: boolean;
  fontFamily?: string;
}

interface Store {
  /** Sender details live only in the current browser session and are never persisted. */
  sender: GreetingData;
  setSender: (d: GreetingData) => void;
  drafts: Record<string, Draft>;
  setDraft: (occasionId: string, d: Draft) => void;
  result: { occasionId: string; dataUrl: string; format: Format } | null;
  setResult: (r: Store["result"]) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sender, setSender] = useState<GreetingData>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [result, setResult] = useState<Store["result"]>(null);

  return (
    <Ctx.Provider value={{
      sender,
      setSender,
      drafts,
      setDraft: (id, d) => setDrafts((p) => ({ ...p, [id]: d })),
      result,
      setResult,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("no store");
  return c;
}
