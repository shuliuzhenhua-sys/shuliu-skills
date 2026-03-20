import { resolveApiBase } from "./endpoints.js";
import { fetchWithRetry } from "./http.js";

export async function getAppGrantedScopes(params) {
  const brand = params.brand ?? "feishu";
  const url = `${resolveApiBase(brand)}/application/v6/applications/${params.appId}?lang=zh_cn`;
  const resp = await fetchWithRetry(
    url,
    {
      headers: {
        Authorization: `Bearer ${params.tenantAccessToken}`,
      },
    },
    { context: "load app scopes" },
  );

  const data = await resp.json();
  if (!resp.ok || data.code !== 0) {
    throw new Error(
      data?.msg ||
        `failed to fetch app scopes: HTTP ${resp.status}. ` +
          `Make sure app has application:application:self_manage`,
    );
  }

  const app = data?.data?.app ?? data?.app ?? data?.data;
  const rawScopes = app?.scopes ?? app?.online_version?.scopes ?? [];

  return rawScopes
    .filter((item) => typeof item?.scope === "string" && item.scope.length > 0)
    .filter((item) => {
      if (!params.tokenType) return true;
      if (!Array.isArray(item.token_types) || item.token_types.length === 0) return true;
      return item.token_types.includes(params.tokenType);
    })
    .map((item) => item.scope);
}
