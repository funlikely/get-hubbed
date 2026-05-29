import { useState } from "react";

type Props = {
  onSubmit: (token: string) => void;
  status: "idle" | "signing-in" | "error";
  errorMessage?: string;
};

export function AuthScreen({ onSubmit, status, errorMessage }: Props) {
  const [token, setToken] = useState("");
  const disabled = status === "signing-in" || !token.trim();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        className="w-full max-w-md rounded-xl bg-white p-6 shadow"
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) onSubmit(token.trim());
        }}
      >
        <h1 className="text-2xl font-bold mb-1">get-hubbed</h1>
        <p className="text-sm text-gray-600 mb-5">
          Paint your contribution graph. Paste a GitHub Personal Access Token to start.
        </p>
        <label className="block text-sm font-medium mb-1" htmlFor="pat">
          Personal Access Token
        </label>
        <input
          id="pat"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="github_pat_..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-gray-500 mt-2">
          Required scopes: <code>repo</code> (commits) and <code>read:user</code>. Token is stored only in this browser's localStorage.
        </p>
        {status === "error" && errorMessage && (
          <p className="text-sm text-red-600 mt-3">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="mt-5 w-full rounded-md bg-emerald-600 px-3 py-2 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "signing-in" ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Create a token at{" "}
          <a
            className="text-emerald-700 underline"
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noreferrer noopener"
          >
            github.com/settings/tokens
          </a>
          .
        </p>
      </form>
    </div>
  );
}
