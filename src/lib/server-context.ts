import { auth } from "@/auth";
import { getAppEnv, isAuthConfigured } from "@/lib/auth/env";
import { createDb } from "@/lib/db";

export async function getAuthenticatedDb() {
  const env = await getAppEnv();

  if (!isAuthConfigured(env)) {
    return {
      error: Response.json(
        {
          error: "AUTH_NOT_CONFIGURED",
          message: "GitHub login is not configured.",
        },
        { status: 503 },
      ),
    } as const;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: Response.json(
        {
          error: "UNAUTHORIZED",
          message: "Sign in with GitHub first.",
        },
        { status: 401 },
      ),
    } as const;
  }

  return {
    env,
    db: createDb(env.DB),
    session,
    userId: session.user.id,
  } as const;
}

export async function getApiDb() {
  const env = await getAppEnv();
  return {
    env,
    db: createDb(env.DB),
  };
}
