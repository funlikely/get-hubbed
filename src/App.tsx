import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useContributions } from "./hooks/useContributions";
import { useRepos } from "./hooks/useRepos";
import { useHoldDrag } from "./hooks/useHoldDrag";
import { AuthScreen } from "./components/AuthScreen";
import { YearNav } from "./components/YearNav";
import { Heatmap } from "./components/Heatmap";
import { RepoSelector } from "./components/RepoSelector";
import { PushBar } from "./components/PushBar";
import { storage } from "./lib/storage";
import { parseRepoSpec } from "./lib/parseRepo";
import { fetchRepo, getContributionCalendar } from "./lib/github";
import type { Plan, Repo, RepoStatus, Viewer } from "./lib/types";

export default function App() {
  const { state: auth, signIn, signOut } = useAuth();

  if (auth.kind === "loading") {
    return <FullScreenMessage>Loading…</FullScreenMessage>;
  }
  if (auth.kind === "signed-out" || auth.kind === "signing-in" || auth.kind === "error") {
    return (
      <AuthScreen
        onSubmit={signIn}
        status={auth.kind === "signing-in" ? "signing-in" : auth.kind === "error" ? "error" : "idle"}
        errorMessage={auth.kind === "error" ? auth.message : undefined}
      />
    );
  }
  return <Workspace token={auth.token} viewer={auth.viewer} onSignOut={signOut} />;
}

function Workspace({
  token,
  viewer,
  onSignOut,
}: {
  token: string;
  viewer: Viewer;
  onSignOut: () => void;
}) {
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [tickMs, setTickMs] = useState(() => storage.getTickMs());
  const { state: contribState, refetch: refetchContrib } = useContributions(token, viewer.login, year);
  const reposState = useRepos(token);
  const hold = useHoldDrag(tickMs);

  const [repoStatus, setRepoStatus] = useState<RepoStatus>({ kind: "idle" });
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const saved = storage.getRepo();
    if (saved) {
      void resolveRepo(saved);
    }

  }, []);

  async function resolveRepo(spec: string) {
    const parsed = parseRepoSpec(spec);
    if (!parsed) {
      setRepoStatus({ kind: "error", message: "Could not parse that as a repo. Use owner/repo or a GitHub URL." });
      setSelectedRepo(null);
      return;
    }
    setRepoStatus({ kind: "checking", spec: `${parsed.owner}/${parsed.name}` });
    try {
      const repo = await fetchRepo(token, parsed.owner, parsed.name);
      if (!repo) {
        setRepoStatus({ kind: "not-found", spec: `${parsed.owner}/${parsed.name}` });
        setSelectedRepo(null);
        return;
      }
      if (!repo.permissions.push) {
        setRepoStatus({ kind: "no-write", repo });
        setSelectedRepo(null);
        return;
      }
      storage.setRepo(repo.fullName);
      setRepoStatus({ kind: "ready", repo });
      setSelectedRepo(repo);
    } catch (err: unknown) {
      setRepoStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed to fetch repo" });
      setSelectedRepo(null);
    }
  }

  const dayCount = useMemo(() => Object.keys(hold.plan).length, [hold.plan]);

  async function waitForGraphUpdate(pushedPlan: Plan, initialTotal: number) {
    const yearPrefix = `${year}-`;
    const expectedDelta = Object.entries(pushedPlan)
      .filter(([d]) => d.startsWith(yearPrefix))
      .reduce((s, [, c]) => s + c, 0);

    if (expectedDelta === 0) {
      refetchContrib();
      return;
    }
    const target = initialTotal + expectedDelta;
    const start = Date.now();
    const maxMs = 30_000;
    while (Date.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const cal = await getContributionCalendar(token, viewer.login, year);
        if (cal.totalContributions >= target) break;
      } catch {
        // network blip — keep trying
      }
    }
    refetchContrib();
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold">get-hubbed</h1>
          <div className="flex-1" />
          <span className="text-sm text-gray-600">
            @{viewer.login}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <YearNav year={year} maxYear={currentYear} onChange={setYear} />
            <div className="text-sm text-gray-600 flex items-center gap-2">
              {contribState.kind === "ready" && (
                <>{contribState.data.totalContributions.toLocaleString()} contributions in {year}</>
              )}
              {contribState.kind === "loading" && <>Loading {year}…</>}
              {contribState.kind === "error" && (
                <span className="text-red-600">{contribState.message}</span>
              )}
              {refreshing && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  waiting for GitHub to ingest commits…
                </span>
              )}
            </div>
            <div className="flex-1" />
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Tick
              <input
                type="number"
                min={50}
                max={2000}
                step={25}
                value={tickMs}
                onChange={(e) => {
                  const n = Math.max(50, Math.min(2000, Number(e.target.value) || 250));
                  setTickMs(n);
                  storage.setTickMs(n);
                }}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
              ms / commit
            </label>
          </div>

          {contribState.kind === "ready" ? (
            <Heatmap
              calendar={contribState.data}
              plan={hold.plan}
              isHolding={hold.isHolding}
              onBeginHold={hold.beginHold}
              onEnterDay={hold.enterDay}
            />
          ) : (
            <div className="h-32 grid place-items-center text-sm text-gray-500">
              {contribState.kind === "loading" ? "Loading calendar…" : "—"}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-gray-700">
              Planned: <strong>{hold.totalPlanned}</strong> commit{hold.totalPlanned === 1 ? "" : "s"} across{" "}
              <strong>{dayCount}</strong> day{dayCount === 1 ? "" : "s"}
            </span>
            {hold.totalPlanned > 0 && (
              <button
                type="button"
                onClick={hold.clearPlan}
                className="text-gray-500 hover:text-red-700 underline"
              >
                Clear plan
              </button>
            )}
            <span className="text-xs text-gray-400 ml-2">
              Click and hold a day, drag across days to paint.
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold mb-3">Target repository</h2>
          <RepoSelector
            repos={reposState.kind === "ready" ? reposState.repos : []}
            reposLoading={reposState.kind === "loading"}
            status={repoStatus}
            initialSpec={storage.getRepo()}
            onPick={resolveRepo}
          />
          {reposState.kind === "error" && (
            <p className="text-xs text-red-600 mt-2">Repo list error: {reposState.message}</p>
          )}
        </section>

        <PushBar
          token={token}
          viewer={viewer}
          repo={selectedRepo}
          plan={hold.plan}
          totalPlanned={hold.totalPlanned}
          onPushed={async () => {
            const pushedPlan = { ...hold.plan };
            const initialTotal =
              contribState.kind === "ready" ? contribState.data.totalContributions : 0;
            hold.clearPlan();
            setRefreshing(true);
            try {
              await waitForGraphUpdate(pushedPlan, initialTotal);
            } finally {
              setRefreshing(false);
            }
          }}
        />
      </main>
    </div>
  );
}

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center text-gray-600">
      {children}
    </div>
  );
}
