"use client";

import { useMemo, useState } from "react";
import {
  Code2,
  Download,
  KeyRound,
  ServerCog,
  Settings,
  User,
  WalletCards,
} from "lucide-react";
import type { ApiKeyListItem } from "@/lib/api-keys";
import {
  buildConsumerConfig,
  buildWorkerConfig,
} from "@/lib/dashboard";
import { formatCredits } from "@/lib/utils";
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
      <code className="mt-3 block break-all font-mono text-sm leading-6 text-foreground">
        {value}
      </code>
    </div>
  );
}

export function DashboardTabs({
  user,
  publicAppUrl,
  credits,
  apiKeys,
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
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
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
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
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
              ].join("\n")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ConfigBlock title="Endpoint" value={consumerConfig.endpoint} />
            <ConfigBlock title="API key" value={consumerConfig.apiKey} />
            <ConfigBlock title="Model" value={consumerConfig.model} />
            <ConfigBlock title="Environment" value={consumerConfig.env} />
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase text-muted-light">cURL</p>
              <CopyButton value={consumerConfig.curl} />
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
              {consumerConfig.curl}
            </pre>
          </div>
        </div>
      ) : null}

      {activeTab === "contributor" ? (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ServerCog className="h-4 w-4 text-accent" />
                Contributor worker
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Download a personalized bootstrap script, then run the Python worker
                with one or more local Codex account plans.
              </p>
            </div>
            <a href="/api/worker/bootstrap" className="btn-primary text-sm">
              <Download className="h-4 w-4" />
              Download worker config
            </a>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ConfigBlock title="Platform endpoint" value={workerConfig.endpoint} />
            <ConfigBlock title="User ID" value={workerConfig.userId} />
            <ConfigBlock title="Worker key" value={workerConfig.apiKey} />
            <ConfigBlock title="Worker command" value={workerConfig.command} />
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">Account sharing plans</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              A single worker can load multiple local plans from `plans.json`, each with
              its own `CODEX_HOME`, model, workspace root, and concurrency cap.
            </p>
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
