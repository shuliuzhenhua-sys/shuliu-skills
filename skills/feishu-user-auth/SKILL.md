---
name: feishu-user-auth
description: Use when 用户提到“飞书授权”“OAuth”“Device Flow”“open_id”“重复弹授权窗”“复用 token”“补授权 scope”“飞书 token 存哪儿了”这类场景，需要复用本地已有用户 token、只补缺失 scopes，或排查 token 的实际存储位置。
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

默认情况下，本 skill 会把 token 存到用户目录下：

- `~/.feishu-auth/tokens/<appId>.json`

如果你在 `config.json` 里显式配置了 `storeDir`，就会改为：

- `<storeDir>/tokens/<appId>.json`

`storeDir` 支持绝对路径，也支持写成 `~/.feishu-auth` 这种用户目录路径。

旧版如果还把 token 放在 legacy 目录下，脚本会从这两种位置尝试迁移：

- `<legacyStoreDir>/tokens/<appId>.json`
- `<legacyStoreDir>/<appId>__<openId>.json`

脚本会默认把这个旧目录当作迁移来源，在新目录为空时自动尝试迁移。

## 前置配置

先找到安装后的 skill 目录，再维护其中的 `config.json`。

常见安装位置：

- 项目内安装：`./.agents/skills/feishu-user-auth/config.json`
- 全局安装（`npx skills add ... -g`）：`~/.agents/skills/feishu-user-auth/config.json`

如果你不想改 skill 目录，也可以自己准备一个配置文件，后面通过 `--config` 传入。

格式如下：

```json
{
  "appId": "cli_xxx",
  "appSecret": "replace-with-app-secret",
  "brand": "feishu"
}
```

说明：

- `appId`、`appSecret` 必填
- `brand` 可选，默认 `feishu`
- `storeDir` 可选；如果不填，默认就是 `~/.feishu-auth`
- 如果显式填写 `storeDir`，可以写绝对路径，也可以写 `~/.feishu-auth`
- `legacyStoreDir` 可选，默认指向 skill 自己的 `state/`

这套脚本不再依赖系统里的 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_BRAND`、`FEISHU_AUTH_*` 环境变量。

## 执行方式

安装后，默认不会自动把 `feishu-auth` 加进 PATH。

最稳妥的调用方式是直接执行安装目录里的 bin：

```bash
./.agents/skills/feishu-user-auth/bin/feishu-auth.js auth
```

如果你是全局安装，可以从任意目录执行：

```bash
~/.agents/skills/feishu-user-auth/bin/feishu-auth.js auth
```

如果你想直接用 `feishu-auth` 命令名，可以自己加一个链接：

```bash
mkdir -p ~/.local/bin
ln -sf ~/.agents/skills/feishu-user-auth/bin/feishu-auth.js ~/.local/bin/feishu-auth
```

然后确保 `~/.local/bin` 在 PATH 中，就可以直接执行：

```bash
feishu-auth auth
```

可用命令：

```bash
<skill-dir>/bin/feishu-auth.js auth [--batch-size 60] [--open-id ou_xxx]
<skill-dir>/bin/feishu-auth.js user-auth [--batch-size 60] [--open-id ou_xxx]
<skill-dir>/bin/feishu-auth.js auth --scope "scope1 scope2"
<skill-dir>/bin/feishu-auth.js refresh-token [--open-id ou_xxx]
<skill-dir>/bin/feishu-auth.js refresh-token [--open-id ou_xxx] --force
<skill-dir>/bin/feishu-auth.js show-token
<skill-dir>/bin/feishu-auth.js show-token --open-id ou_xxx
<skill-dir>/bin/feishu-auth.js remove-token --open-id ou_xxx
<skill-dir>/bin/feishu-auth.js system-token
<skill-dir>/bin/feishu-auth.js system-auth
<skill-dir>/bin/feishu-auth.js --config /path/to/config.json auth
<skill-dir>/bin/feishu-auth.js --help
```

如果你是在仓库里本地开发，这时才适合在仓库根目录执行源码入口：

```bash
node skills/feishu-user-auth/scripts/run-auth.js auth
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
3. 当前 `storeDir/tokens/` 里是否确实有该 app 的记录
4. 本次要的 scopes 是否超出了历史已授权范围
5. token 是否已经 `expired`，或者只剩 `needs_refresh`

## 输出要求

告诉用户这些关键信息：

1. 复用了哪个 `open_id`
2. 本次是否真的需要重新授权
3. 如果需要，是因为缺哪些 scopes
4. token 最终落在哪个 `storeDir/tokens/<appId>.json` 文件里
