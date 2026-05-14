import Link from "next/link";
import { ArrowRight, GitBranch, Server, WalletCards } from "lucide-react";

const highlights = [
  {
    title: "Consumer API",
    description: "Copy your endpoint and API key configuration for OpenAI-compatible clients.",
    icon: Server,
  },
  {
    title: "Contributor Worker",
    description: "Download a personalized worker config and run one or more local Codex plans.",
    icon: GitBranch,
  },
  {
    title: "Credit Ledger",
    description: "Earn credits by contributing capacity and spend credits when consuming GPT.",
    icon: WalletCards,
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-light">
          Cloudflare MVP
        </p>
        <h1 className="mt-4 font-sans text-5xl font-bold leading-tight">
          Shared Codex capacity with local contributor workers.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
          Sign in with GitHub, copy your consumer configuration, or download a
          local Python worker to contribute Codex execution capacity from your
          own environment.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Open dashboard
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.title} className="card-anthropic">
            <item.icon className="h-5 w-5 text-accent" />
            <h2 className="mt-5 font-sans text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
