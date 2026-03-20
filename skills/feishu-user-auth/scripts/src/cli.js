import {
  pickNextScopeBatch,
  subtractGrantedScopes,
} from "./auth-batches.js";
import { getAppGrantedScopes } from "./app-scopes.js";
import { DEFAULT_SCOPE_BATCH_SIZE } from "./default-scopes.js";
import {
  fetchAuthorizedUserOpenId,
  pollDeviceToken,
  refreshUserToken,
  requestDeviceAuthorization,
} from "./oauth-device.js";
import { getTenantAccessToken } from "./system-auth.js";
import {
  findBestStoredTokenForApp,
  getStoredToken,
  removeStoredToken,
  setStoredToken,
  tokenStatus,
} from "./token-store.js";
import { getRuntimeConfig } from "./config.js";

function getArg(argv, name) {
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

function hasArg(argv, name) {
  return argv.includes(name);
}

function uniq(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function resolveConfig() {
  const { appId, appSecret, brand, configPath, storeDir, legacyStoreDir } = getRuntimeConfig();
  return { appId, appSecret, brand, configPath, storeDir, legacyStoreDir };
}

async function refreshStoredToken(params) {
  const existingToken = params.userOpenId
    ? await getStoredToken(params.appId, params.userOpenId)
    : await findBestStoredTokenForApp(params.appId);

  if (!existingToken) {
    throw new Error("No stored token found for refresh");
  }

  const status = tokenStatus(existingToken);
  if (status === "expired") {
    throw new Error(`Refresh token already expired for ${existingToken.userOpenId}`);
  }

  if (status === "valid" && !params.force) {
    return existingToken;
  }

  const refreshed = await refreshUserToken({
    appId: params.appId,
    appSecret: params.appSecret,
    brand: params.brand,
    userOpenId: existingToken.userOpenId,
    refreshToken: existingToken.refreshToken,
    scope: existingToken.scope,
    grantedAt: existingToken.grantedAt,
  });

  await setStoredToken(refreshed);
  return refreshed;
}

async function authorizeOneBatch(params) {
  const scope = params.scopes.join(" ");
  console.log(`\n=== Auth batch ${params.batchIndex}/${params.batchCount} ===`);
  console.log(`scope count: ${params.scopes.length}`);
  console.log(scope);

  const auth = await requestDeviceAuthorization({
    appId: params.appId,
    appSecret: params.appSecret,
    brand: params.brand,
    scope,
  });

  console.log("\nOpen this URL in browser and approve:\n");
  console.log(auth.verificationUriComplete);
  console.log("");

  const token = await pollDeviceToken({
    appId: params.appId,
    appSecret: params.appSecret,
    brand: params.brand,
    deviceCode: auth.deviceCode,
    interval: auth.interval,
    expiresIn: auth.expiresIn,
    userOpenId: params.userOpenId,
  });

  const openId = await fetchAuthorizedUserOpenId({
    accessToken: token.accessToken,
    brand: params.brand,
  });

  token.userOpenId = openId ?? token.userOpenId ?? "unknown";
  await setStoredToken(token);
  console.log(`saved token for: ${token.userOpenId}`);
  return token;
}

async function resolveScopesForAuth(params) {
  const hasExistingToken = Object.prototype.hasOwnProperty.call(params, "existingToken");
  const existingToken = hasExistingToken
    ? params.existingToken
    : params.userOpenId
      ? await getStoredToken(params.appId, params.userOpenId)
      : await findBestStoredTokenForApp(params.appId);

  if (params.explicitScope) {
    return {
      scopes: uniq(params.explicitScope.split(/\s+/)),
      mode: "custom scopes",
      existingTokenOpenId: existingToken?.userOpenId ?? params.userOpenId,
    };
  }

  const systemToken = await getTenantAccessToken({
    appId: params.appId,
    appSecret: params.appSecret,
    brand: params.brand,
  });

  const appUserScopes = uniq(
    await getAppGrantedScopes({
      appId: params.appId,
      tenantAccessToken: systemToken.accessToken,
      brand: params.brand,
      tokenType: "user",
    }),
  );

  if (appUserScopes.length === 0) {
    throw new Error(
      "No user scopes found on app. Make sure your app has user-token scopes enabled and application:application:self_manage is granted.",
    );
  }

  const scopes = subtractGrantedScopes(appUserScopes, existingToken?.scope);

  return {
    scopes,
    mode: "app granted user scopes",
    existingTokenOpenId: existingToken?.userOpenId ?? params.userOpenId,
  };
}

async function cmdAuth(argv) {
  const { appId, appSecret, brand } = resolveConfig();
  const batchSize = Number(getArg(argv, "--batch-size") || DEFAULT_SCOPE_BATCH_SIZE);
  const explicitScope = getArg(argv, "--scope");
  const userOpenId = getArg(argv, "--open-id");
  const initialToken = userOpenId
    ? await getStoredToken(appId, userOpenId)
    : await findBestStoredTokenForApp(appId);

  let existingToken = initialToken;
  if (existingToken && tokenStatus(existingToken) === "needs_refresh") {
    try {
      existingToken = await refreshStoredToken({
        appId,
        appSecret,
        brand,
        userOpenId: existingToken.userOpenId,
      });
      console.log(`refreshed token for: ${existingToken.userOpenId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`refresh failed for ${existingToken.userOpenId}: ${message}`);
      console.log("falling back to full authorization flow");
      existingToken = null;
    }
  }

  const { scopes, mode, existingTokenOpenId } = await resolveScopesForAuth({
    appId,
    appSecret,
    brand,
    explicitScope,
    userOpenId,
    existingToken,
  });

  if (scopes.length === 0) {
    console.log("All app-granted user scopes are already authorized.");
    if (existingTokenOpenId) {
      const token = await getStoredToken(appId, existingTokenOpenId);
      if (token) {
        console.log(`open_id: ${token.userOpenId}`);
        console.log(`status: ${tokenStatus(token)}`);
      }
    }
    return;
  }

  console.log(`total scopes: ${scopes.length}`);
  console.log(`batch size: ${batchSize}`);
  console.log(`total batches: ${Math.ceil(scopes.length / batchSize)}`);
  console.log(`mode: ${mode}`);

  let latest = null;
  let remainingScopes = scopes.slice();
  let batchIndex = 1;

  while (remainingScopes.length > 0) {
    const currentBatch = pickNextScopeBatch(remainingScopes, batchSize);
    latest = await authorizeOneBatch({
      appId,
      appSecret,
      brand,
      scopes: currentBatch,
      batchIndex,
      batchCount: Math.ceil(remainingScopes.length / batchSize),
      userOpenId: latest?.userOpenId ?? userOpenId,
    });

    remainingScopes = subtractGrantedScopes(scopes, latest.scope);
    batchIndex += 1;
  }

  if (latest) {
    console.log("\nAll batches completed.");
    console.log(`final open_id: ${latest.userOpenId}`);
    console.log(`stored token status: ${tokenStatus(latest)}`);
  }
}

async function cmdSystemToken() {
  const { appId, appSecret, brand } = resolveConfig();
  const token = await getTenantAccessToken({ appId, appSecret, brand });
  console.log(JSON.stringify(token, null, 2));
}

async function cmdRefreshToken(argv) {
  const { appId, appSecret, brand } = resolveConfig();
  const userOpenId = getArg(argv, "--open-id");
  const token = await refreshStoredToken({
    appId,
    appSecret,
    brand,
    userOpenId,
    force: hasArg(argv, "--force"),
  });

  console.log(`open_id: ${token.userOpenId}`);
  console.log(`status: ${tokenStatus(token)}`);
  console.log(JSON.stringify(token, null, 2));
}

async function cmdShowToken(argv) {
  const { appId } = resolveConfig();
  const openId = getArg(argv, "--open-id");
  const token = openId
    ? await getStoredToken(appId, openId)
    : await findBestStoredTokenForApp(appId);
  if (!token) {
    console.log("token not found");
    return;
  }
  if (!openId) {
    console.log(`auto selected open_id: ${token.userOpenId}`);
  }
  console.log(JSON.stringify({ ...token, status: tokenStatus(token) }, null, 2));
}

async function cmdRemoveToken(argv) {
  const { appId } = resolveConfig();
  const openId = getArg(argv, "--open-id");
  if (!openId) {
    throw new Error("Please provide --open-id ou_xxx");
  }
  await removeStoredToken(appId, openId);
  console.log(`removed token for ${openId}`);
}

function printHelp() {
  console.log(`feishu-auth CLI

Usage:
  feishu-auth auth [--batch-size 60] [--open-id ou_xxx]
  feishu-auth auth --scope "scope1 scope2"
  feishu-auth user-auth [--batch-size 60] [--open-id ou_xxx]
  feishu-auth refresh-token [--open-id ou_xxx]
  feishu-auth refresh-token [--open-id ou_xxx] --force
  feishu-auth system-token
  feishu-auth system-auth
  feishu-auth show-token
  feishu-auth show-token --open-id ou_xxx
  feishu-auth remove-token --open-id ou_xxx
  feishu-auth --config /path/to/config.json auth

Defaults:
  auth 默认读取应用当前已开通的 user scopes，并按 60 个一批自动授权。

Config:
  默认读取 skill 目录里的 config.json
  必填字段: appId, appSecret
  可选字段: brand, storeDir, legacyStoreDir
`);
}

export async function main(argv = process.argv.slice(2)) {
  const filteredArgv = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--config") {
      index += 1;
      continue;
    }
    filteredArgv.push(argv[index]);
  }

  const cmd = filteredArgv[0];
  if (!cmd || hasArg(argv, "--help") || hasArg(argv, "-h")) {
    printHelp();
    return;
  }

  if (cmd === "auth" || cmd === "user-auth") return cmdAuth(filteredArgv);
  if (cmd === "refresh-token") return cmdRefreshToken(argv);
  if (cmd === "system-token" || cmd === "system-auth") return cmdSystemToken();
  if (cmd === "show-token") return cmdShowToken(filteredArgv);
  if (cmd === "remove-token") return cmdRemoveToken(filteredArgv);

  printHelp();
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
