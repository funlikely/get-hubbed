import { useCallback, useEffect, useState } from "react";
import { getViewer } from "../lib/github";
import { storage } from "../lib/storage";
import type { Viewer } from "../lib/types";

type AuthState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "signing-in" }
  | { kind: "error"; message: string }
  | { kind: "signed-in"; token: string; viewer: Viewer };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ kind: "loading" });

  useEffect(() => {
    const token = storage.getToken();
    if (!token) {
      setState({ kind: "signed-out" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const viewer = await getViewer(token);
        if (!cancelled) setState({ kind: "signed-in", token, viewer });
      } catch (err: unknown) {
        if (cancelled) return;
        storage.clearToken();
        setState({ kind: "error", message: errMsg(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (token: string) => {
    setState({ kind: "signing-in" });
    try {
      const viewer = await getViewer(token);
      storage.setToken(token);
      setState({ kind: "signed-in", token, viewer });
    } catch (err: unknown) {
      setState({ kind: "error", message: errMsg(err) });
    }
  }, []);

  const signOut = useCallback(() => {
    storage.clearToken();
    setState({ kind: "signed-out" });
  }, []);

  return { state, signIn, signOut };
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
