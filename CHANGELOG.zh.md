# 更新日志

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
