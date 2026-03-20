import { resolveApiBase } from "./endpoints.js";
import { fetchWithRetry } from "./http.js";

const tokenCache = new Map();

export function clearSystemTokenCache(key) {
  if (key) {
    tokenCache.delete(key);
    return;
  }
  tokenCache.clear();
}

export async function getTenantAccessToken(params) {
  const brand = params.brand ?? "feishu";
  const cacheKey = `${brand}:${params.appId}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached;
  }

  const url = `${resolveApiBase(brand)}/auth/v3/tenant_access_token/internal`;
  const resp = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: params.appId,
        app_secret: params.appSecret,
      }),
    },
    { context: "system token" },
  );

  const data = await resp.json();

  if (!resp.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new Error(data.msg || `tenant_access_token request failed: HTTP ${resp.status}`);
  }

  const token = {
    accessToken: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire ?? 7200) * 1000,
  };

  tokenCache.set(cacheKey, token);
  return token;
}
