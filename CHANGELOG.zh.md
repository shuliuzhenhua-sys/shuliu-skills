# 更新日志

## 0.2.7 - 2026-02-23

### 变更
- 更新 `.gitignore`，忽略本地生成的 `skills-lock.json`，避免提交包含本机路径的锁文件。
- 将 `.claude-plugin/marketplace.json` 版本号更新为 `0.2.7`。

## 0.2.6 - 2026-02-23

### 变更
- 将 `ecommerce-images` 重构为无脚本的工作流技能（删除 `skills/ecommerce-images/scripts/main.ts`）。
- 为 `ecommerce-images` 固定 provider 策略：默认 `banana-proxy`，失败自动回退 `baoyu-image-gen`。
- 保留 `main` / `detail` / `both` 生成模式与风格编号扩展位。
- 将详情图规则调整为“整套生成”，在 `mode=detail|both` 时先询问用户需要的详情图张数。
- 优化风格交互为“仅中文风格名”（如白底极简/参数规格）。

### 文档
- 更新 `AGENTS.md`，同步 `ecommerce-images` 无脚本结构说明。
- 更新 `README.md` 与 `README.zh.md`，补充 `ecommerce-images` 安装与使用说明。

## 0.2.5 - 2026-02-23

### 新功能
- 新增 `ecommerce-images` skill：基于固定提示词模板与 `banana-proxy` 生成电商商品主图与详情图。

## 0.2.4 - 2026-02-23

### 变更
- 移除 `banana-proxy` 的 GeekAI 兜底通道；仅使用 lnapi.com（LNAPI_KEY）作为主通道。
- 删除 `skills/banana-proxy/scripts/providers/geekai.ts`。
- 简化 `generateWithRetry`，仅对主通道重试（不再兜底）。

## 0.2.3 - 2026-02-23

### 变更
- 将 `banana-proxy` 本地环境变量目录从 `.baoyu-skills/.env` 调整为 `.shuliu-skills/.env`（项目目录与用户目录同时生效）。
- 更新 CLI 帮助文案中的 env 加载顺序说明。

## 0.2.2 - 2026-02-23

### 变更
- 将 `banana-proxy` 的 GeekAI 默认兜底模型从 `bananan-2` 调整为 `nano-banana-2`。
- 保持返回图片原始格式，不再强制 PNG，并按真实格式保存扩展名。

## 0.2.1 - 2026-02-23

### 新功能
- 为 `banana-proxy` 增加 GeekAI 图片生成兜底通道。
- 保持 Banana Gemini 为主通道；当主通道重试后仍失败时，自动回退到 GeekAI 模型 `bananan-2`。
- 新增 provider 实现文件：`skills/banana-proxy/scripts/providers/geekai.ts`。

### 文档
- 更新 `skills/banana-proxy/SKILL.md`，补充主/兜底通道行为与新增环境变量说明。
- 更新 `README.md` 与 `README.zh.md`，补充 `GEEKAI_API_KEY` / `GEEKAI_IMAGE_MODEL` 用法。

## 0.2.0 - 2026-02-17

### 新功能
- 新增 `douyin-share-info` skill：通过 TikHub Douyin Web API 按抖音分享链接获取作品基础信息。
- 新增 `skills/douyin-share-info/scripts/main.ts`，输出标准化 JSON 字段。
- 落地固定提取规则：
  - 封面：`data.aweme_detail.video.origin_cover.url_list[0]`
  - 音频：`data.aweme_detail.music.play_url.url_list[0]`
  - 视频：`data.aweme_detail.video.bit_rate[i].play_addr.url_list[0]`（按数组顺序取首个可用地址）

### 文档
- 在 `.claude-plugin/marketplace.json` 中注册 `douyin-share-info`（插件分组 `douyin-tools`）。
- 更新 `README.md` 与 `README.zh.md`，补充 `douyin-share-info` 的安装与使用说明。
- 更新 `AGENTS.md`，同步多 skill 仓库结构与 `douyin-share-info` 约定。

## 0.1.1 - 2026-02-17

### 文档
- 新增 `AGENTS.md` 贡献者指南。
- 补充强制发布规则：每次提交都要打 tag、每次变更都要同步更新中英文变更日志、当 skills 或其结构变化时必须同步更新 `AGENTS.md`。

## 0.1.0 - 2026-02-17

### 新功能
- 初始化本地 `shuliu-skills` 市场仓库结构。
- 新增 `banana-proxy` skill（含脚本与说明文档）。
- 新增 `.claude-plugin/marketplace.json`，包含 `image-generation-skills` 插件分类。
- 新增 README/README.zh，包含安装、更新目录与技能索引说明。
