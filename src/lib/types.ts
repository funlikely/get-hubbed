export type Viewer = {
  login: string;
  databaseId: number;
  name: string | null;
  email: string;
};

export type ContributionDay = {
  date: string;
  count: number;
};

export type ContributionCalendar = {
  totalContributions: number;
  days: ContributionDay[];
  weeks: ContributionDay[][];
};

export type Repo = {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  permissions: { push: boolean; admin: boolean };
  private: boolean;
};

export type RepoStatus =
  | { kind: "idle" }
  | { kind: "checking"; spec: string }
  | { kind: "ready"; repo: Repo }
  | { kind: "not-found"; spec: string }
  | { kind: "no-write"; repo: Repo }
  | { kind: "error"; message: string };

export type Plan = Record<string, number>;
