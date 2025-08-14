import { useEffect } from "react";

type Handler = (e: KeyboardEvent) => void;

export function useHotkeys(handler: Handler) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handler(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler]);
}
