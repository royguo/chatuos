import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import {
  getAppEnv,
  getMissingAuthEnvKeys,
  isAuthConfigured,
} from "@/lib/auth/env";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const env = await getAppEnv();
  const authConfigured = isAuthConfigured(env);

  if (authConfigured) {
    const session = await auth();

    if (session?.user) {
      redirect("/dashboard");
    }
  }

  const missingKeys = getMissingAuthEnvKeys(env);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-light">
            GitHub login
          </p>
          <h1 className="mt-3 font-sans text-3xl font-bold">Sign in to ChatUOS</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Use your GitHub account to manage consumer keys, contributor workers,
            and credit balance.
          </p>
        </div>
        <GitHubSignInButton disabled={!authConfigured} />
        {!authConfigured ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-xs text-muted">
            <p className="font-medium text-foreground">GitHub login is not configured.</p>
            <p className="mt-2">
              Add these Cloudflare secrets first: {missingKeys.join(", ")}.
            </p>
          </div>
        ) : null}
        <Link href="/" className="block text-xs text-muted underline underline-offset-4">
          Back to home
        </Link>
      </div>
    </div>
  );
}
