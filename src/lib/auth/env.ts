import { getCloudflareContext } from "@opennextjs/cloudflare";

const REQUIRED_AUTH_KEYS = [
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
] as const;

export type AuthEnvKey = (typeof REQUIRED_AUTH_KEYS)[number];

function getProcessEnv() {
  const runtimeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return runtimeProcess?.env ?? {};
}

export async function getAppEnv() {
  const processEnv = getProcessEnv();

  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as CloudflareEnv;
  } catch (error) {
    if (processEnv.NODE_ENV === "production") {
      throw error;
    }

    return processEnv as unknown as CloudflareEnv;
  }
}

export function getMissingAuthEnvKeys(env: Partial<CloudflareEnv>): AuthEnvKey[] {
  return REQUIRED_AUTH_KEYS.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.length === 0;
  });
}

export function isAuthConfigured(env: Partial<CloudflareEnv>) {
  return getMissingAuthEnvKeys(env).length === 0;
}

export function requireAuthEnv(env: CloudflareEnv, key: AuthEnvKey) {
  const value = env[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required Cloudflare secret: ${key}`);
  }

  return value;
}

export function getPublicAppUrl(env: Partial<CloudflareEnv>) {
  return env.PUBLIC_APP_URL || env.AUTH_URL || "http://localhost:3000";
}
