---
name: feishu-user-auth
description: 管理飞书用户授权与 token 复用。只要用户提到“飞书授权”“OAuth”“Device Flow”“open_id”“重复弹授权窗”“复用 token”“补授权 scope”“飞书 token 存哪儿了”这类场景，就应使用这个 skill。它会优先复用已有用户 token，只对缺失 scopes 补授权，并把 token 固定保存到 `~/.feishu-auth`，避免不同项目各自乱存。
---

# Feishu User Auth

这个 skill 只负责两件事：

1. 发起飞书用户授权
2. 尽可能复用已有 token，避免重复弹授权页

## 何时使用

当用户有这些诉求时直接用：

- 给飞书应用做用户授权
- 排查为什么总是反复弹授权窗
- 想知道本地是否已经授权过某个用户
- 想补一批新的 scopes，但不想把旧授权丢掉
- 想删除某个用户的本地 token 重新授权

## 存储位置

本 skill 会把 token 固定存到用户目录：

- `~/.feishu-auth/tokens/<appId>.json`

旧版如果还把 token 放在 skill 自己的目录下：

- `state/tokens/<appId>.json`

脚本会默认把这个旧目录当作迁移来源，在新目录为空时自动尝试迁移。

## 前置配置

先维护 skill 自己的配置文件：

- `skills/feishu-user-auth/config.json`

格式如下：

```json
{
  "appId": "cli_xxx",
  "appSecret": "xxx",
  "brand": "feishu",
  "storeDir": "../../../.feishu-auth",
  "legacyStoreDir": "state"
}
```

说明：

- `appId`、`appSecret` 必填
- `brand` 可选，默认 `feishu`
- `storeDir` 可选，默认指向 `~/.feishu-auth`
- `legacyStoreDir` 可选，默认指向 skill 自己的 `state/`

这套脚本不再依赖系统里的 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_BRAND`、`FEISHU_AUTH_*` 环境变量。

## 执行方式

统一通过脚本入口执行：

```bash
node skills/feishu-user-auth/scripts/run-auth.js auth
```

可用命令：

```bash
node skills/feishu-user-auth/scripts/run-auth.js auth [--batch-size 60] [--open-id ou_xxx]
node skills/feishu-user-auth/scripts/run-auth.js user-auth [--batch-size 60] [--open-id ou_xxx]
node skills/feishu-user-auth/scripts/run-auth.js auth --scope "scope1 scope2"
node skills/feishu-user-auth/scripts/run-auth.js refresh-token [--open-id ou_xxx]
node skills/feishu-user-auth/scripts/run-auth.js show-token
node skills/feishu-user-auth/scripts/run-auth.js show-token --open-id ou_xxx
node skills/feishu-user-auth/scripts/run-auth.js remove-token --open-id ou_xxx
node skills/feishu-user-auth/scripts/run-auth.js system-token
node skills/feishu-user-auth/scripts/run-auth.js system-auth
node skills/feishu-user-auth/scripts/run-auth.js --config /path/to/config.json auth
```

## 工作规则

按这个顺序做：

1. 优先复用已保存 token
2. 如果未指定 `--open-id`，自动挑选最适合复用的用户记录
3. 如果应用 scopes 比本地已授权 scopes 多，只补缺失部分
4. 分批授权后把 scopes 做并集保存，不要覆盖旧批次

## 排障重点

如果用户说“明明授权过还是弹窗”，先检查这几项：

1. 是否走了这个 skill 的脚本，而不是直接跑了别的脚本
2. `config.json` 里的 `appId` 是否和旧 token 对应的是同一个 app
3. `~/.feishu-auth/tokens/` 里是否确实有该 app 的记录
4. 本次要的 scopes 是否超出了历史已授权范围
5. token 是否已经 `expired`，或者只剩 `needs_refresh`

## 输出要求

告诉用户这些关键信息：

1. 复用了哪个 `open_id`
2. 本次是否真的需要重新授权
3. 如果需要，是因为缺哪些 scopes
4. token 存在 `~/.feishu-auth` 的哪个文件里
