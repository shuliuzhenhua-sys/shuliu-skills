import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { getRuntimeConfig } from "./config.js";

const DEFAULT_STORE_DIR = join(homedir(), ".feishu-auth");
const DEFAULT_LEGACY_STORE_DIR = join(
  homedir(),
  ".openclaw",
  "workspace",
  "feishu-auth",
  "skill",
  "feishu-user-auth",
  "state",
);

function resolveStoreDir() {
  try {
    return getRuntimeConfig().storeDir;
  } catch {
    return DEFAULT_STORE_DIR;
  }
}

function resolveLegacyStoreDir() {
  try {
    return getRuntimeConfig().legacyStoreDir;
  } catch {
    return DEFAULT_LEGACY_STORE_DIR;
  }
}

function registryFilePath(appId) {
  const safeAppId = appId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(resolveStoreDir(), "tokens", `${safeAppId}.json`);
}

function uniqScope(scope = "") {
  return [...new Set(scope.split(/\s+/).map((item) => item.trim()).filter(Boolean))];
}

function mergeToken(oldToken, nextToken) {
  const mergedScope = [...new Set([...uniqScope(oldToken?.scope), ...uniqScope(nextToken.scope)])].join(" ");
  return {
    ...oldToken,
    ...nextToken,
    scope: mergedScope,
    grantedAt: nextToken.grantedAt ?? oldToken?.grantedAt ?? Date.now(),
  };
}

async function readRegistry(appId) {
  const path = registryFilePath(appId);
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    const tokens = Array.isArray(parsed.tokens) ? parsed.tokens : [];
    return { appId, tokens };
  } catch {
    return { appId, tokens: [] };
  }
}

async function writeRegistry(registry) {
  const path = registryFilePath(registry.appId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(registry, null, 2), "utf8");
}

async function loadLegacyTokens(appId) {
  const storeDir = resolveStoreDir();
  const legacyDir = resolveLegacyStoreDir();

  if (storeDir === legacyDir) {
    return [];
  }

  const safeAppId = appId.replace(/[^a-zA-Z0-9._-]/g, "_");

  try {
    const registryPath = join(legacyDir, "tokens", `${safeAppId}.json`);
    const registryRaw = await readFile(registryPath, "utf8");
    const registry = JSON.parse(registryRaw);
    if (Array.isArray(registry?.tokens)) {
      return registry.tokens.filter((token) => token?.appId === appId && token?.userOpenId);
    }
  } catch {
    // noop
  }

  try {
    const names = await readdir(legacyDir);
    const matched = names.filter(
      (name) => name.startsWith(`${safeAppId}__`) && name.endsWith(".json"),
    );

    const tokens = await Promise.all(
      matched.map(async (name) => {
        const raw = await readFile(join(legacyDir, name), "utf8");
        return JSON.parse(raw);
      }),
    );

    return tokens.filter((token) => token?.appId === appId && token?.userOpenId);
  } catch {
    return [];
  }
}

async function ensureRegistryHydrated(appId) {
  const registry = await readRegistry(appId);
  if (registry.tokens.length > 0) {
    return registry;
  }

  const legacyTokens = await loadLegacyTokens(appId);
  if (legacyTokens.length === 0) {
    return registry;
  }

  const hydrated = {
    appId,
    tokens: legacyTokens,
  };
  await writeRegistry(hydrated);
  return hydrated;
}

export async function listStoredTokens(appId) {
  const registry = await ensureRegistryHydrated(appId);
  return registry.tokens
    .slice()
    .sort((a, b) => (b.grantedAt ?? 0) - (a.grantedAt ?? 0));
}

export async function findBestStoredTokenForApp(appId) {
  const tokens = await listStoredTokens(appId);
  if (tokens.length === 0) return null;

  const statusRank = {
    valid: 3,
    needs_refresh: 2,
    expired: 1,
  };

  return (
    tokens
      .slice()
      .sort((a, b) => {
        const byStatus = statusRank[tokenStatus(b)] - statusRank[tokenStatus(a)];
        if (byStatus !== 0) return byStatus;
        return (b.grantedAt ?? 0) - (a.grantedAt ?? 0);
      })[0] ?? null
  );
}

export async function setStoredToken(token) {
  const registry = await ensureRegistryHydrated(token.appId);
  const current = registry.tokens.find((item) => item.userOpenId === token.userOpenId);
  const merged = mergeToken(current, token);

  registry.tokens = registry.tokens.filter((item) => item.userOpenId !== token.userOpenId);
  registry.tokens.push(merged);
  await writeRegistry(registry);
}

export async function getStoredToken(appId, userOpenId) {
  const registry = await ensureRegistryHydrated(appId);
  return registry.tokens.find((item) => item.userOpenId === userOpenId) ?? null;
}

export async function removeStoredToken(appId, userOpenId) {
  const registry = await ensureRegistryHydrated(appId);
  const nextTokens = registry.tokens.filter((item) => item.userOpenId !== userOpenId);

  if (nextTokens.length === registry.tokens.length) {
    return;
  }

  if (nextTokens.length === 0) {
    try {
      await rm(registryFilePath(appId));
    } catch {
      // noop
    }
    return;
  }

  registry.tokens = nextTokens;
  await writeRegistry(registry);
}

export function tokenStatus(token) {
  const now = Date.now();
  if (now < token.expiresAt - 5 * 60_000) return "valid";
  if (now < token.refreshExpiresAt) return "needs_refresh";
  return "expired";
}
