"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Code2,
  FileJson,
  KeyRound,
  ServerCog,
  Settings,
  Terminal,
  User,
  WalletCards,
} from "lucide-react";
import type { ApiKeyListItem } from "@/lib/api-keys";
import type { WorkerProfileListItem } from "@/lib/worker-profiles";
import {
  buildConsumerConfig,
  buildWorkerConfig,
} from "@/lib/dashboard";
import { formatCredits, formatDateTime } from "@/lib/utils";
import { ApiKeyManager } from "./api-key-manager";
import { CopyButton } from "./copy-button";

type DashboardTabsProps = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  publicAppUrl: string;
  credits: number;
  apiKeys: ApiKeyListItem[];
  workerProfiles: WorkerProfileListItem[];
};

type TabId = "consumer" | "contributor" | "settings";

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "consumer", label: "Consumer", icon: User },
  { id: "contributor", label: "Contributor", icon: ServerCog },
  { id: "settings", label: "Settings", icon: Settings },
];

function ConfigBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase text-muted-light">{title}</p>
        <CopyButton value={value} />
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground">
        {value}
      </pre>
    </div>
  );
}

function WorkerStepBlock({
  step,
  icon: Icon,
  title,
  description,
  value,
  compact = false,
}: {
  step: string;
  icon: typeof User;
  title: string;
  description: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase text-muted-light">
          <Icon className="h-4 w-4 text-accent" />
          {step}
        </div>
        <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase text-muted-light">{title}</p>
          <CopyButton value={value} />
        </div>
        <pre
          className={`mt-3 whitespace-pre-wrap break-words font-mono leading-6 text-foreground ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {value}
        </pre>
      </div>
    </div>
  );
}

function ActiveProfiles({ profiles }: { profiles: WorkerProfileListItem[] }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Activity className="h-4 w-4 text-accent" />
          Active profiles
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Worker profiles appear here after a contributor worker polls the platform.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {profiles.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted">
            No worker profiles have checked in yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-background text-xs uppercase text-muted-light">
                <tr>
                  <th className="px-4 py-3 font-medium">Profile</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Max concurrency</th>
                  <th className="px-4 py-3 font-medium">Worker key</th>
                  <th className="px-4 py-3 font-medium">Last request</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {profile.name}
                    </td>
                    <td className="px-4 py-3 text-muted">{profile.status}</td>
                    <td className="px-4 py-3 text-muted">{profile.maxConcurrency}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {profile.workerKeyPrefix}...
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDateTime(profile.lastSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardTabs({
  user,
  publicAppUrl,
  credits,
  apiKeys,
  workerProfiles,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("consumer");
  const activeKey = apiKeys.find((key) => key.status === "active");
  const activeKeyValue = activeKey ? `${activeKey.keyPrefix}...` : null;

  const consumerConfig = useMemo(
    () => buildConsumerConfig({ publicAppUrl, apiKey: activeKeyValue }),
    [publicAppUrl, activeKeyValue],
  );
  const workerConfig = useMemo(
    () =>
      buildWorkerConfig({
        publicAppUrl,
        userId: user.id,
        apiKey: activeKeyValue,
      }),
    [publicAppUrl, user.id, activeKeyValue],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 border-b border-border pb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-light">
            Dashboard
          </p>
          <h1 className="mt-3 font-sans text-3xl font-bold">
            Welcome back{user.name ? `, ${user.name}` : ""}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Switch between consumer setup, contributor worker plans, and account settings.
          </p>
        </div>
        <div className="inline-flex self-start rounded-xl border border-border bg-card p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-text"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "consumer" ? (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Code2 className="h-4 w-4 text-accent" />
                Consumer configuration
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Use this configuration in OpenAI-compatible clients. Create an API key in
                Settings to replace the visible prefix placeholder with a full key.
              </p>
            </div>
            <CopyButton
              label="Copy all"
              value={[
                `Endpoint: ${consumerConfig.endpoint}`,
                `API key: ${consumerConfig.apiKey}`,
                `Model: ${consumerConfig.model}`,
                "",
                consumerConfig.env,
                "",
                consumerConfig.codexConfig,
              ].join("\n")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ConfigBlock title="Endpoint" value={consumerConfig.endpoint} />
            <ConfigBlock title="API key" value={consumerConfig.apiKey} />
            <ConfigBlock title="Model" value={consumerConfig.model} />
            <ConfigBlock title="Environment" value={consumerConfig.env} />
          </div>

          <ConfigBlock title="Codex config.toml" value={consumerConfig.codexConfig} />

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase text-muted-light">Responses cURL</p>
              <CopyButton value={consumerConfig.curl} />
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
              {consumerConfig.curl}
            </pre>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ConfigBlock title="Streaming cURL" value={consumerConfig.streamCurl} />
            <ConfigBlock title="Status cURL" value={consumerConfig.statusCurl} />
            <ConfigBlock title="Models cURL" value={consumerConfig.modelsCurl} />
          </div>
        </div>
      ) : null}

      {activeTab === "contributor" ? (
        <div className="space-y-5">
          <ActiveProfiles profiles={workerProfiles} />

          <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ServerCog className="h-4 w-4 text-accent" />
                Contributor worker
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Install the Python worker, configure one API key, then add one or
                more local Codex profiles with separate Codex homes.
              </p>
            </div>

            <div className="space-y-4">
              <WorkerStepBlock
                step="Step 1"
                icon={Terminal}
                title="Worker install"
                description="Run this once on the contributor machine. Replace paste-full-api-key with the full API key copied immediately after creation in Settings."
                value={workerConfig.installCommand}
              />
              <WorkerStepBlock
                step="Step 2"
                icon={FileJson}
                title="Worker config file"
                description="Default path: ~/.chatuos/settings.json. The installer writes this JSON there by default. Add or edit profiles here; each profile should point to its own codex_home."
                value={workerConfig.configJson}
                compact
              />
              <WorkerStepBlock
                step="Step 3"
                icon={Terminal}
                title="Worker command"
                description="Start the contributor worker with --configs pointing to the settings file from Step 2. The default is ~/.chatuos/settings.json, and you can change it to another config path."
                value={workerConfig.command}
              />
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-foreground">Codex profiles</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Each profile maps to one local Codex account by using a separate
                `codex_home`. All profiles share the same ChatUOS API key and user id.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-accent" />
                User ID
              </div>
              <p className="mt-3 break-all font-mono text-sm">{user.id}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <WalletCards className="h-4 w-4 text-accent" />
                Credits
              </div>
              <p className="mt-3 font-sans text-3xl font-bold">
                {formatCredits(credits)}
              </p>
              <p className="mt-2 text-xs text-muted">
                Earn by contributing GPT. Spend by consuming GPT. Manual recharge
                will be added in the billing phase.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4 text-accent" />
                Active keys
              </div>
              <p className="mt-3 font-sans text-3xl font-bold">
                {apiKeys.filter((key) => key.status === "active").length}
              </p>
              <p className="mt-2 text-xs text-muted">
                Keys can be used for consumer requests or contributor workers.
              </p>
            </div>
          </div>

          <ApiKeyManager initialKeys={apiKeys} />
        </div>
      ) : null}
    </section>
  );
}
