export function parseRepoSpec(spec: string): { owner: string; name: string } | null {
  const s = spec.trim();
  if (!s) return null;

  // https://github.com/owner/repo(.git)(/...)
  const httpsMatch = s.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/i);
  if (httpsMatch) return { owner: httpsMatch[1], name: httpsMatch[2] };

  // git@github.com:owner/repo.git
  const sshMatch = s.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) return { owner: sshMatch[1], name: sshMatch[2] };

  // owner/repo shorthand
  const shortMatch = s.match(/^([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  if (shortMatch) return { owner: shortMatch[1], name: shortMatch[2] };

  return null;
}
