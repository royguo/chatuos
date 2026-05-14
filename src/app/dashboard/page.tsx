import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getAppEnv, getPublicAppUrl, isAuthConfigured } from "@/lib/auth/env";
import { listUserApiKeys } from "@/lib/api-keys";
import { createDb } from "@/lib/db";
import { ensureUserWallet } from "@/lib/wallets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const env = await getAppEnv();

  if (!isAuthConfigured(env)) {
    redirect("/login");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const db = createDb(env.DB);
  const [apiKeys, wallet] = await Promise.all([
    listUserApiKeys(db, session.user.id),
    ensureUserWallet(db, session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex justify-end">
        <SignOutButton />
      </div>
      <DashboardTabs
        user={session.user}
        publicAppUrl={getPublicAppUrl(env)}
        credits={wallet.balanceCredits}
        apiKeys={apiKeys}
      />
    </div>
  );
}
