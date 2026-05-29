import { useCallback, useEffect, useState } from "react";
import { getContributionCalendar } from "../lib/github";
import type { ContributionCalendar } from "../lib/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: ContributionCalendar }
  | { kind: "error"; message: string };

export function useContributions(token: string, login: string, year: number) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!token || !login) return;
    let cancelled = false;
    setState({ kind: "loading" });
    getContributionCalendar(token, login, year)
      .then((data) => {
        if (!cancelled) setState({ kind: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: "error", message: err.message ?? "Failed to load" });
      });
    return () => {
      cancelled = true;
    };
  }, [token, login, year, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { state, refetch };
}
