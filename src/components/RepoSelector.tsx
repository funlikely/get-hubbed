import { useState } from "react";
import type { Repo, RepoStatus } from "../lib/types";

type Props = {
  repos: Repo[];
  reposLoading: boolean;
  status: RepoStatus;
  initialSpec?: string;
  onPick: (spec: string) => void;
};

export function RepoSelector({ repos, reposLoading, status, initialSpec = "", onPick }: Props) {
  const [text, setText] = useState(initialSpec);
  const [selected, setSelected] = useState(initialSpec);

  const handleDropdownChange = (value: string) => {
    setSelected(value);
    setText(value);
    if (value) onPick(value);
  };

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Your repos</label>
          <select
            value={selected}
            disabled={reposLoading}
            onChange={(e) => handleDropdownChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white"
          >
            <option value="">
              {reposLoading ? "Loading…" : "— select a repo —"}
            </option>
            {repos.map((r) => (
              <option key={r.fullName} value={r.fullName}>
                {r.fullName}
                {r.private ? " (private)" : ""}
                {!r.permissions.push ? " — read-only" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Or paste a URL / owner/repo</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (text.trim()) onPick(text.trim());
                }
              }}
              placeholder="https://github.com/owner/repo"
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => text.trim() && onPick(text.trim())}
              className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm hover:bg-gray-900"
            >
              Use
            </button>
          </div>
        </div>
      </div>
      <StatusBar status={status} />
    </div>
  );
}

function StatusBar({ status }: { status: RepoStatus }) {
  const { color, text } = renderStatus(status);
  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm flex items-center gap-2 ${color}`}
      role="status"
      aria-live="polite"
    >
      <Dot status={status} />
      <span>{text}</span>
    </div>
  );
}

function Dot({ status }: { status: RepoStatus }) {
  let cls = "bg-gray-300";
  if (status.kind === "checking") cls = "bg-amber-400 animate-pulse";
  else if (status.kind === "ready") cls = "bg-emerald-500";
  else if (status.kind === "not-found" || status.kind === "no-write" || status.kind === "error") cls = "bg-red-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}

function renderStatus(status: RepoStatus): { color: string; text: string } {
  switch (status.kind) {
    case "idle":
      return { color: "border-gray-200 bg-gray-50 text-gray-600", text: "Pick a repo to target." };
    case "checking":
      return { color: "border-amber-200 bg-amber-50 text-amber-800", text: `Checking ${status.spec}…` };
    case "ready":
      return {
        color: "border-emerald-200 bg-emerald-50 text-emerald-800",
        text: `Ready: ${status.repo.fullName} (branch: ${status.repo.defaultBranch})${
          status.repo.private ? " — private" : ""
        }`,
      };
    case "not-found":
      return {
        color: "border-red-200 bg-red-50 text-red-800",
        text: `Repo not found: ${status.spec}. Check the spelling or token scopes.`,
      };
    case "no-write":
      return {
        color: "border-red-200 bg-red-50 text-red-800",
        text: `Found ${status.repo.fullName} but the token has no push access.`,
      };
    case "error":
      return { color: "border-red-200 bg-red-50 text-red-800", text: status.message };
  }
}
