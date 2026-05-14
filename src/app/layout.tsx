import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getAppEnv, isAuthConfigured } from "@/lib/auth/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatUOS",
  description: "A Codex and GPT capacity sharing dashboard.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const env = await getAppEnv();
  const session = isAuthConfigured(env) ? await auth() : null;

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-border bg-background/90">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-sans text-lg font-bold">
                ChatUOS
              </Link>
              <nav className="flex items-center gap-4 text-sm text-muted">
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
                {session?.user ? (
                  <SignOutButton />
                ) : (
                  <Link href="/login" className="hover:text-foreground">
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
