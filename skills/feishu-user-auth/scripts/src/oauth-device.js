import { resolveOAuthEndpoints } from "./endpoints.js";
import { fetchWithRetry } from "./http.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestDeviceAuthorization(params) {
  const brand = params.brand ?? "feishu";
  const endpoints = resolveOAuthEndpoints(brand);

  let scope = params.scope ?? "";
  if (!scope.includes("offline_access")) {
    scope = scope ? `${scope} offline_access` : "offline_access";
  }

  const basicAuth = Buffer.from(`${params.appId}:${params.appSecret}`).toString("base64");
  const body = new URLSearchParams();
  body.set("client_id", params.appId);
  body.set("scope", scope);

  const resp = await fetchWithRetry(endpoints.deviceAuthorization, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  }, { context: "device authorization" });

  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`device authorization failed: HTTP ${resp.status} - ${text}`);
  }

  if (!resp.ok || data.error) {
    throw new Error(data.error_description ?? data.error ?? "device authorization failed");
  }

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    verificationUriComplete: data.verification_uri_complete ?? data.verification_uri,
    expiresIn: data.expires_in ?? 240,
    interval: data.interval ?? 5,
  };
}

export async function pollDeviceToken(params) {
  const brand = params.brand ?? "feishu";
  const endpoints = resolveOAuthEndpoints(brand);
  const deadline = Date.now() + params.expiresIn * 1000;
  let interval = params.interval;

  while (Date.now() < deadline) {
    await sleep(interval * 1000);

    const resp = await fetchWithRetry(endpoints.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: params.deviceCode,
        client_id: params.appId,
        client_secret: params.appSecret,
      }).toString(),
    }, { context: "poll device token" });

    const data = await resp.json();

    if (!data.error && data.access_token) {
      const now = Date.now();
      return {
        userOpenId: params.userOpenId ?? "unknown",
        appId: params.appId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? "",
        expiresAt: now + (data.expires_in ?? 7200) * 1000,
        refreshExpiresAt: now + (data.refresh_token_expires_in ?? 604800) * 1000,
        scope: data.scope ?? "",
        grantedAt: now,
      };
    }

    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      interval = Math.min(interval + 5, 60);
      continue;
    }
    if (data.error === "access_denied") {
      throw new Error("user denied authorization");
    }
    if (data.error === "expired_token" || data.error === "invalid_grant") {
      throw new Error("device code expired");
    }

    throw new Error(data.error_description ?? data.error ?? "token polling failed");
  }

  throw new Error("authorization timeout");
}

export async function refreshUserToken(params) {
  const brand = params.brand ?? "feishu";
  const endpoints = resolveOAuthEndpoints(brand);

  const resp = await fetchWithRetry(endpoints.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
      client_id: params.appId,
      client_secret: params.appSecret,
    }).toString(),
  }, { context: "refresh token" });

  const data = await resp.json();
  if (!resp.ok || data.error || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "refresh token failed");
  }

  const now = Date.now();
  return {
    userOpenId: params.userOpenId ?? "unknown",
    appId: params.appId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? params.refreshToken,
    expiresAt: now + (data.expires_in ?? 7200) * 1000,
    refreshExpiresAt: now + (data.refresh_token_expires_in ?? 604800) * 1000,
    scope: data.scope ?? params.scope ?? "",
    grantedAt: params.grantedAt ?? now,
  };
}

export async function fetchAuthorizedUserOpenId(params) {
  const brand = params.brand ?? "feishu";
  const { userInfo } = resolveOAuthEndpoints(brand);

  const resp = await fetchWithRetry(userInfo, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  }, { context: "fetch user open_id" });

  const data = await resp.json();
  if (!resp.ok || data.code !== 0) {
    return null;
  }

  return data.data?.open_id ?? null;
}
