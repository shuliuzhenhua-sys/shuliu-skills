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
```

## 可用插件

| 插件 | 说明 | 包含技能 |
|------|------|----------|
| **image-generation-skills** | 图片生成后端 | [banana-proxy](#banana-proxy)、[geek-image](#geek-image)、[ecommerce-images](#ecommerce-images) |
| **video-generation-skills** | 视频生成后端 | [sora-video](#sora-video) |
| **douyin-tools** | 抖音分享链接解析工具 | [douyin-share-info](#douyin-share-info) |
| **feishu-tools** | 飞书授权、token 复用与多维表格工具 | [feishu-user-auth](#feishu-user-auth)、[feishu-bitable](#feishu-bitable) |

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

```bash
node skills/feishu-user-auth/scripts/run-auth.js auth
node skills/feishu-user-auth/scripts/run-auth.js show-token
node skills/feishu-user-auth/scripts/run-auth.js refresh-token
node skills/feishu-user-auth/scripts/run-auth.js system-token
```

本地配置文件：

- `skills/feishu-user-auth/config.json`（`appId` / `appSecret` 必填）

### feishu-bitable

用于飞书多维表格操作的工作流 skill，覆盖记录 CRUD、字段管理、视图、权限、公式和关联字段等场景。

- 以自然语言触发即可，例如：
  - “创建一个新的多维表格，并把我加成协作者”
  - “往这张表批量插入 20 条记录”
  - “新增一个货币字段和一个关联字段”
- 主说明保留在 `SKILL.md`；只有当任务涉及 `type / ui_type / property` 判断时，才进一步读取 `references/fields.md`。
