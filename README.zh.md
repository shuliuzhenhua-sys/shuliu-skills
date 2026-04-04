# shuliu-skills

[English](./README.md) | 中文

参考 `jimliu/baoyu-skills` 形式构建的本地技能市场。

## 安装

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill geek-image
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill sora-video
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-user-auth
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-bitable
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-approval
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-card
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill xhs-text2image
```

## 更新技能

当仓库中的技能更新后，重新执行安装命令即可拉取最新版本：

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill geek-image
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill sora-video
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-user-auth
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-bitable
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-approval
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill feishu-card
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill xhs-text2image
```

## 可用插件

| 插件 | 说明 | 包含技能 |
|------|------|----------|
| **image-generation-skills** | 图片生成后端 | [banana-proxy](#banana-proxy)、[geek-image](#geek-image)、[ecommerce-images](#ecommerce-images) |
| **video-generation-skills** | 视频生成后端 | [sora-video](#sora-video) |
| **douyin-tools** | 抖音分享链接解析工具 | [douyin-share-info](#douyin-share-info) |
| **feishu-tools** | 飞书授权、交互卡片、原生审批、token 复用与多维表格工具 | [feishu-user-auth](#feishu-user-auth)、[feishu-bitable](#feishu-bitable)、[feishu-approval](#feishu-approval)、[feishu-card](#feishu-card) |
| **xiaohongshu-tools** | 小红书创作工作流 | [xhs-text2image](#xhs-text2image) |

## 可用技能

### banana-proxy

通过 Banana 代理端点调用 Gemini 生图。

```bash
npx -y bun skills/banana-proxy/scripts/main.ts --prompt "一只猫" --image out.jpg
```

环境变量：

- `LNAPI_KEY`（必填）

### geek-image

通过 geekai.co 调用 GeekAI 图像接口生图。

```bash
npx -y bun skills/geek-image/scripts/main.ts --prompt "一只猫" --image out.png
```

环境变量：

- `GEEKAI_API_KEY`（必填）
- `GEEK_IMAGE_MODEL`（可选，默认 `nano-banana-2`）

### sora-video

通过 lnapi.com 调用 Sora 生成视频。

```bash
npx -y bun skills/sora-video/scripts/main.ts --prompt "一只奔跑的狗" --output video.mp4
```

环境变量：

- `LNAPI_KEY`（必填）

### douyin-share-info

通过 TikHub Douyin Web API 根据抖音分享链接获取作品基础信息，并提取封面/音频/视频的首个可用地址。

```bash
npx -y bun skills/douyin-share-info/scripts/main.ts --share-url "https://v.douyin.com/xxxx/" --json
```

环境变量：

- `TIKHUB_API_KEY`（必填）

### ecommerce-images

用于电商商品主图与详情图生成的工作流技能，输入用户提供的商品原图。

- 支持模式：`main` / `detail` / `both`
- 详情图为整套图，执行前会先询问用户需要几张
- 默认比例：主图 `1:1`，详情图 `3:4`
- 默认调用 `banana-proxy`，失败自动回退 `baoyu-image-gen`
- 支持中文风格名（如“白底极简主图”“参数规格详情图”）

以自然语言触发即可，例如：
- “基于 `/path/product.png` 生成主图和详情图”
- “生成详情图，做 5 张，参数规格风格”

### feishu-user-auth

用于飞书用户 OAuth/device-flow 授权、scope 补授权和本地 token 复用。

项目内安装后：

```bash
./.agents/skills/feishu-user-auth/bin/feishu-auth.js auth
./.agents/skills/feishu-user-auth/bin/feishu-auth.js show-token
./.agents/skills/feishu-user-auth/bin/feishu-auth.js refresh-token
./.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
```

全局安装（`npx skills add ... -g`）后：

```bash
~/.agents/skills/feishu-user-auth/bin/feishu-auth.js auth
```

配置方式：

- 修改安装后 skill 目录里的 `config.json`，其中 `appId` / `appSecret` 必填
  - 项目内安装：`./.agents/skills/feishu-user-auth/config.json`
  - 全局安装：`~/.agents/skills/feishu-user-auth/config.json`
- 或直接使用 `~/.agents/skills/feishu-user-auth/bin/feishu-auth.js --config /path/to/config.json auth`

如果你想直接敲 `feishu-auth`，可以手动链接到 PATH：

```bash
mkdir -p ~/.local/bin
ln -sf ~/.agents/skills/feishu-user-auth/bin/feishu-auth.js ~/.local/bin/feishu-auth
```

### feishu-bitable

用于飞书多维表格操作的工作流 skill，覆盖记录 CRUD、字段管理、视图、权限、公式和关联字段等场景。

- 以自然语言触发即可，例如：
  - “创建一个新的多维表格，并把我加成协作者”
  - “往这张表批量插入 20 条记录”
  - “新增一个货币字段和一个关联字段”
- 主说明保留在 `SKILL.md`；只有当任务涉及 `type / ui_type / property` 判断时，才进一步读取 `references/fields.md`。

### feishu-approval

用于飞书原生审批的文档型 skill，覆盖审批定义、表单控件、外部选项、审批实例和排障。

- 以自然语言触发即可，例如：
  - “飞书审批定义的 form_content 怎么写”
  - “帮我写一个 radioV2 外部选项控件”
  - “创建审批实例时 dateInterval 要怎么传”
  - “approval code not found 是什么问题”
- 这个 skill 不自带脚本，重点是把官方审批文档按定义、控件、实例、排障分层整理，方便直接回答和拼接 JSON。

### feishu-card

用于飞书交互卡片的文档型 skill，覆盖卡片 JSON 结构、`interactive` 消息发送、按钮回调，以及按 `message_id` 更新卡片。

- 以自然语言触发即可，例如：
  - “给这个 open_id 发一张飞书交互卡片”
  - “写一个带两个按钮和 note 区的飞书卡片”
  - “怎么根据 message_id 更新飞书卡片”
  - “为什么 `feishu-auth system-token` 不能整段直接塞到 Authorization”
- 这个 skill 复用 `feishu-user-auth` 提供的系统 token 能力。优先执行：

```bash
feishu-auth system-token
```

如果 `feishu-auth` 不在 PATH 里，就直接执行安装后的 bin：

```bash
./.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
~/.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
```

- `system-token` 返回的是 JSON，请只取其中的 `accessToken` 放进 `Authorization: Bearer <token>`。

### xhs-text2image

用于小红书创作平台“文字配图”的自动化 skill，适合接管已登录浏览器会话后直接生成配图。

- 支持输入文案生成图片、在预览页切主题、换配色、重新下载、查看主题列表
- 自带现成主题预览资产，位于 `skills/xhs-text2image/theme_catalog/`
- 提供 `catalog` 命令，可一次性刷新全部主题样例并重建总览图

示例命令：

```bash
python3 skills/xhs-text2image/scripts/xhs_text2image.py create --port 9444 --text "小红书主题测试" --theme 科技
python3 skills/xhs-text2image/scripts/xhs_text2image.py catalog --port 9444 --text "小红书主题测试"
```

依赖要求：

- Python 3
- `playwright` 与 `Pillow`
- 已登录小红书创作平台的 Chrome / Chromium，并通过 `9444` 之类的 CDP 端口开放调试
