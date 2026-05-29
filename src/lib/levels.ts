export function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

export const ORGANIC_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "var(--color-gh-empty)",
  1: "var(--color-gh-l1)",
  2: "var(--color-gh-l2)",
  3: "var(--color-gh-l3)",
  4: "var(--color-gh-l4)",
};

export const PLAN_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: "var(--color-plan-l1)",
  2: "var(--color-plan-l2)",
  3: "var(--color-plan-l3)",
  4: "var(--color-plan-l4)",
};
