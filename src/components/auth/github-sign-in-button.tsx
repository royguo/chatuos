"use client";

import { signIn } from "next-auth/react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

type GitHubSignInButtonProps = {
  className?: string;
  redirectTo?: string;
  disabled?: boolean;
};

export function GitHubSignInButton({
  className,
  redirectTo = "/dashboard",
  disabled = false,
}: GitHubSignInButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => signIn("github", { redirectTo })}
      className={cn(
        "btn-primary w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <GitBranch className="h-5 w-5" />
      Continue with GitHub
    </button>
  );
}
