import { useEffect, useState } from "react";
import { listRepos } from "../lib/github";
import type { Repo } from "../lib/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; repos: Repo[] }
  | { kind: "error"; message: string };

export function useRepos(token: string) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState({ kind: "loading" });
    listRepos(token)
      .then((repos) => {
        if (!cancelled) setState({ kind: "ready", repos });
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: "error", message: err.message ?? "Failed to load" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return state;
}
