export function resolveApiBase(brand = "feishu") {
  return brand === "lark"
    ? "https://open.larksuite.com/open-apis"
    : "https://open.feishu.cn/open-apis";
}

export function resolveOAuthEndpoints(brand = "feishu") {
  if (brand === "lark") {
    return {
      deviceAuthorization:
        "https://accounts.larksuite.com/oauth/v1/device_authorization",
      token: "https://open.larksuite.com/open-apis/authen/v2/oauth/token",
      userInfo: "https://open.larksuite.com/open-apis/authen/v1/user_info",
    };
  }

  return {
    deviceAuthorization:
      "https://accounts.feishu.cn/oauth/v1/device_authorization",
    token: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
    userInfo: "https://open.feishu.cn/open-apis/authen/v1/user_info",
  };
}
