import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

const DEFAULT_CONFIG_FILE = "config.json";

let runtimeConfig = null;

function resolvePath(baseDir, target, fallback) {
  if (!target) {
    return fallback;
  }

  if (target === "~") {
    return homedir();
  }

  if (target.startsWith("~/")) {
    return join(homedir(), target.slice(2));
  }

  if (isAbsolute(target)) {
    return target;
  }

  return join(baseDir, target);
}

function normalizeBrand(brand) {
  return brand === "lark" ? "lark" : "feishu";
}

function resolveConfiguredBrand(parsed) {
  if (typeof parsed.brand === "string" && parsed.brand.trim() !== "") {
    return normalizeBrand(parsed.brand.trim());
  }

  if (typeof parsed.is_lark === "boolean") {
    return parsed.is_lark ? "lark" : "feishu";
  }

  return "feishu";
}

function assertRequiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required field in skill config: ${field}`);
  }
  return value.trim();
}

export async function loadSkillConfig({ skillDir, configPath } = {}) {
  if (!skillDir) {
    throw new Error("skillDir is required to load skill config");
  }

  const resolvedConfigPath = configPath ?? join(skillDir, DEFAULT_CONFIG_FILE);
  const raw = await readFile(resolvedConfigPath, "utf8");
  const parsed = JSON.parse(raw);

  return {
    skillDir,
    configPath: resolvedConfigPath,
    appId: assertRequiredString(parsed.appId ?? parsed.app_id, "appId"),
    appSecret: assertRequiredString(parsed.appSecret ?? parsed.app_secret, "appSecret"),
    brand: resolveConfiguredBrand(parsed),
    storeDir: resolvePath(skillDir, parsed.storeDir, join(homedir(), ".feishu-auth")),
    legacyStoreDir: resolvePath(skillDir, parsed.legacyStoreDir, join(skillDir, "state")),
  };
}

export function installRuntimeConfig(config) {
  runtimeConfig = { ...config };
  return runtimeConfig;
}

export function getRuntimeConfig() {
  if (!runtimeConfig) {
    throw new Error("Runtime config not installed. Start via feishu-auth command or run-auth.js");
  }
  return runtimeConfig;
}

export function resetRuntimeConfig() {
  runtimeConfig = null;
}
