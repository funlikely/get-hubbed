import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import { RequestError } from "@octokit/request-error";
import type { ContributionCalendar, Plan, Repo, Viewer } from "./types";

export function makeOctokit(token: string) {
  return new Octokit({ auth: token });
}

export function makeGraphql(token: string) {
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

export async function getViewer(token: string): Promise<Viewer> {
  const gq = makeGraphql(token);
  const data = await gq<{
    viewer: { login: string; databaseId: number; name: string | null; email: string };
  }>(`query { viewer { login databaseId name email } }`);
  return data.viewer;
}

export async function getContributionCalendar(
  token: string,
  login: string,
  year: number,
): Promise<ContributionCalendar> {
  const gq = makeGraphql(token);
  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;
  const data = await gq<{
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
        };
      };
    };
  }>(
    `query ($login: String!, $from: DateTime!, $to: DateTime!) {
       user(login: $login) {
         contributionsCollection(from: $from, to: $to) {
           contributionCalendar {
             totalContributions
             weeks {
               contributionDays { date contributionCount }
             }
           }
         }
       }
     }`,
    { login, from, to },
  );
  const cal = data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.map((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
  );
  const days = weeks.flat();
  return { totalContributions: cal.totalContributions, weeks, days };
}

export async function listRepos(token: string): Promise<Repo[]> {
  const ok = makeOctokit(token);
  const all: Repo[] = [];
  for (let page = 1; page <= 5; page++) {
    const { data } = await ok.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: "updated",
      affiliation: "owner,collaborator,organization_member",
    });
    for (const r of data) {
      all.push({
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        defaultBranch: r.default_branch ?? "main",
        permissions: {
          push: !!r.permissions?.push,
          admin: !!r.permissions?.admin,
        },
        private: r.private,
      });
    }
    if (data.length < 100) break;
  }
  return all;
}

export async function fetchRepo(token: string, owner: string, name: string): Promise<Repo | null> {
  const ok = makeOctokit(token);
  try {
    const { data } = await ok.repos.get({ owner, repo: name });
    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      permissions: {
        push: !!data.permissions?.push,
        admin: !!data.permissions?.admin,
      },
      private: data.private,
    };
  } catch (err) {
    if (err instanceof RequestError && err.status === 404) return null;
    throw err;
  }
}

export type PushProgress = {
  totalCommits: number;
  done: number;
  currentDate?: string;
};

export type PushOptions = {
  token: string;
  repo: Repo;
  plan: Plan;
  authorName: string;
  authorEmail: string;
  message?: string;
  onProgress?: (p: PushProgress) => void;
};

export async function pushPlannedCommits(opts: PushOptions): Promise<{ newHead: string; commits: number }> {
  const { token, repo, plan, authorName, authorEmail, message = "🌱 backdated via get-hubbed" } = opts;
  const ok = makeOctokit(token);
  const branch = repo.defaultBranch;

  const entries = Object.entries(plan)
    .filter(([, c]) => c > 0)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const totalCommits = entries.reduce((s, e) => s + e.count, 0);
  if (totalCommits === 0) return { newHead: "", commits: 0 };

  // 1. Resolve current HEAD of the branch
  const refResp = await ok.git.getRef({ owner: repo.owner, repo: repo.name, ref: `heads/${branch}` });
  let lastSha = refResp.data.object.sha;

  // 2. Get the tree at HEAD - we reuse it so commits are empty (no file changes)
  const headCommit = await ok.git.getCommit({ owner: repo.owner, repo: repo.name, commit_sha: lastSha });
  const baseTree = headCommit.data.tree.sha;

  let done = 0;
  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) {
      const created = await ok.git.createCommit({
        owner: repo.owner,
        repo: repo.name,
        message,
        tree: baseTree,
        parents: [lastSha],
        author: {
          name: authorName,
          email: authorEmail,
          date: backdateIso(entry.date, i, entry.count),
        },
      });
      lastSha = created.data.sha;
      done++;
      opts.onProgress?.({ totalCommits, done, currentDate: entry.date });
    }
  }

  // 3. Move the branch ref to the new tip
  await ok.git.updateRef({
    owner: repo.owner,
    repo: repo.name,
    ref: `heads/${branch}`,
    sha: lastSha,
  });

  return { newHead: lastSha, commits: totalCommits };
}

// Spread commits across the day so they have distinct, ordered timestamps.
// Day-local 12:00 UTC is a sensible anchor that lands on the right calendar day
// in every common timezone.
function backdateIso(date: string, index: number, total: number): string {
  // date is YYYY-MM-DD
  const spreadSeconds = Math.min(60, Math.max(1, Math.floor(3600 / Math.max(1, total))));
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCSeconds(base.getUTCSeconds() + index * spreadSeconds);
  return base.toISOString();
}

export function defaultCommitEmail(viewer: Viewer): string {
  return `${viewer.databaseId}+${viewer.login}@users.noreply.github.com`;
}
