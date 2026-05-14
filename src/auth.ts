import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GitHub from "next-auth/providers/github";
import NextAuth from "next-auth";
import { createDb } from "@/lib/db";
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { getAppEnv, requireAuthEnv } from "@/lib/auth/env";

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const env = await getAppEnv();
  const db = createDb(env.DB);

  return {
    trustHost: true,
    secret: requireAuthEnv(env, "AUTH_SECRET"),
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
      authenticatorsTable: authenticators,
    }),
    session: {
      strategy: "database",
    },
    pages: {
      signIn: "/login",
    },
    providers: [
      GitHub({
        clientId: requireAuthEnv(env, "AUTH_GITHUB_ID"),
        clientSecret: requireAuthEnv(env, "AUTH_GITHUB_SECRET"),
      }),
    ],
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }

        return session;
      },
    },
  };
});
