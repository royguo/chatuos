"use client";

import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import type { ApiKeyListItem } from "@/lib/api-keys";
import { formatDateTime } from "@/lib/utils";
import { CopyButton } from "./copy-button";

type CreateKeyResponse = {
  key: string;
  item: ApiKeyListItem;
};

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyListItem[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("Default access key");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as CreateKeyResponse;
      setKeys((current) => [data.item, ...current]);
      setCreatedKey(data.key);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create key.");
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/api-keys/${encodeURIComponent(keyId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setKeys((current) =>
        current.map((item) =>
          item.id === keyId ? { ...item, status: "revoked" } : item,
        ),
      );
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke key.");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <KeyRound className="h-4 w-4 text-accent" />
            API keys
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Create one or more keys for consumer calls or contributor workers.
            Full keys are loaded for keys created after full-key storage was enabled.
          </p>
        </div>
      </div>

      <form onSubmit={createKey} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Key name"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-primary px-4 py-2 text-sm disabled:cursor-wait disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </form>

      {createdKey ? (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New key created</p>
              <code className="mt-2 block break-all font-mono text-xs leading-6 text-foreground">
                {createdKey}
              </code>
            </div>
            <CopyButton value={createdKey} label="Copy key" />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-border">
        {keys.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted">No API keys yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-card text-xs uppercase text-muted-light">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Prefix</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-4 py-3 text-foreground">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{key.keyPrefix}...</td>
                    <td className="px-4 py-3 text-muted">{key.status}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(key.createdAt)}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(key.lastUsedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CopyButton
                          value={key.keyValue ?? ""}
                          label={key.keyValue ? "Copy" : "Unavailable"}
                          disabled={!key.keyValue}
                        />
                        <button
                          type="button"
                          disabled={key.status !== "active"}
                          onClick={() => void revokeKey(key.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
