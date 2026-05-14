import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatUOS",
  description: "A Codex and GPT capacity sharing dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                <Link href="/login" className="hover:text-foreground">
                  Sign in
                </Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
