import { useState } from "react";
import type { Plan, Repo, Viewer } from "../lib/types";
import { pushPlannedCommits, defaultCommitEmail } from "../lib/github";
import { storage } from "../lib/storage";

type Props = {
  token: string;
  viewer: Viewer;
  repo: Repo | null;
  plan: Plan;
  totalPlanned: number;
  onPushed: () => void;
};

type State =
  | { kind: "idle" }
  | { kind: "pushing"; done: number; total: number; currentDate?: string }
  | { kind: "done"; commits: number; head: string }
  | { kind: "error"; message: string };

export function PushBar({ token, viewer, repo, plan, totalPlanned, onPushed }: Props) {
  const [emailOverride, setEmailOverride] = useState<string>(() => storage.getEmail());
  const [state, setState] = useState<State>({ kind: "idle" });

  const email = emailOverride.trim() || defaultCommitEmail(viewer);
  const name = viewer.name ?? viewer.login;
  const canPush = repo !== null && totalPlanned > 0 && state.kind !== "pushing";

  const onClick = async () => {
    if (!repo) return;
    setState({ kind: "pushing", done: 0, total: totalPlanned });
    try {
      const result = await pushPlannedCommits({
        token,
        repo,
        plan,
        authorName: name,
        authorEmail: email,
        onProgress: (p) =>
          setState({ kind: "pushing", done: p.done, total: p.totalCommits, currentDate: p.currentDate }),
      });
      setState({ kind: "done", commits: result.commits, head: result.newHead });
      onPushed();
    } catch (err: unknown) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Push failed" });
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canPush}
          onClick={onClick}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {state.kind === "pushing"
            ? `Pushing ${state.done}/${state.total}…`
            : `Push ${totalPlanned} commit${totalPlanned === 1 ? "" : "s"}`}
        </button>
        {repo ? (
          <span className="text-sm text-gray-600">
            → {repo.fullName} (branch <code>{repo.defaultBranch}</code>)
          </span>
        ) : (
          <span className="text-sm text-gray-500">Select a repo above first.</span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Commit author name</label>
          <input
            type="text"
            value={name}
            readOnly
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm bg-gray-50 text-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Commit author email <span className="text-gray-400">(must be verified on your GitHub account)</span>
          </label>
          <input
            type="email"
            value={emailOverride}
            placeholder={defaultCommitEmail(viewer)}
            onChange={(e) => {
              setEmailOverride(e.target.value);
              storage.setEmail(e.target.value);
            }}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono"
          />
        </div>
      </div>

      {state.kind === "pushing" && (
        <div className="text-sm text-gray-700">
          Creating commits via the GitHub API…{" "}
          {state.currentDate && <span className="text-gray-500">on {state.currentDate}</span>}
        </div>
      )}
      {state.kind === "done" && (
        <div className="text-sm text-emerald-700">
          Pushed {state.commits} commit{state.commits === 1 ? "" : "s"}. New HEAD:{" "}
          <code>{state.head.slice(0, 7)}</code>
        </div>
      )}
      {state.kind === "error" && (
        <div className="text-sm text-red-700">Push failed: {state.message}</div>
      )}
    </div>
  );
}
