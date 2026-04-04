---
name: xhs-text2image
description: 小红书创作平台“文字配图”自动化技能。用户只要提到小红书创作平台、文字配图、科技主题、换配色、9444 端口、CDP、自动生成图片、自动下载图片、基于已有预览图换主题/换颜色，或者想先看看各个主题长什么样子，都应该使用这个技能。它会连接已登录的浏览器会话，生成图片，默认下载当前图片，支持继续切主题或换配色，也支持直接给出已经整理好的主题预览总览图和单张样例。
---

# 小红书文字配图自动化

## Script Directory

**Important**: All scripts and bundled preview assets are located inside this skill directory.

**Agent Execution Instructions**:
1. Determine this `SKILL.md` file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/xhs_text2image.py`
3. Preview catalog path = `${SKILL_DIR}/theme_catalog/`
4. Replace all `${SKILL_DIR}` placeholders in this document with the actual installed path

用本机浏览器里已经登录的小红书创作平台会话，自动完成：

- 进入“文字配图”
- 输入文案
- 生成图片
- 默认下载当前图片
- 在预览页切主题
- 在预览页换配色
- 查看当前状态和可用主题
- 直接给客户发送现成的主题预览总览图和单张样例

## 触发场景

遇到这些需求时直接使用本技能：

- “帮我在小红书创作平台生成一张文字配图”
- “用 9444 端口接管我当前浏览器”
- “把主题换成科技 / 简约 / 手帐”
- “再换个配色”
- “把当前这张图下载下来”
- “看下当前可选主题”
- “先给客户看看这些主题长什么样子”
- “把全部主题样例都更新一遍”

## 前置条件

1. 你的 Chrome / Chromium 已经登录小红书创作平台。
2. 浏览器已经开启远程调试端口，或者你能提供：
   - `--port`
   - 或 `--cdp-url`
3. 如果端口不可用但想自动拉起浏览器，还要额外提供：
   - `--chrome-path`
   - `--profile-dir`

## 执行脚本

脚本路径：

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py
```

## 默认行为

- `create` 会在成功后默认下载当前预览图
- `update --theme ...` 会切主题并默认下载更新后的图
- `update --recolor` 会换配色并默认下载更新后的图
- `download` 会再次下载当前预览图
- 客户如果只是想预览主题长相，优先直接发送现成总览图，再按需补发单张样例

也就是说，只要走 `create` 或 `update`，就默认会返回本地下载路径，不需要用户再额外要求“顺便下载”

## 主题预览资产

这套 skill 内置固定样例，文案是 `小红书主题测试`：

- 总览拼版图：`${SKILL_DIR}/theme_catalog/overview.jpg`
- 清单文件：`${SKILL_DIR}/theme_catalog/manifest.json`
- 单张样例目录：`${SKILL_DIR}/theme_catalog/images/`

处理“客户想先看看主题长什么样子”这类请求时，按这个顺序：

1. 先直接发总览拼版图路径
2. 如果客户点名某个主题，再去 `images/` 里发对应单图
3. 如果担心样例过旧，再运行 `catalog` 重新刷新整套资产

## 常用命令

### 1. 创建新图

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  create \
  --port 9444 \
  --text "codex 牛逼" \
  --theme 科技
```

### 2. 仅生成，不指定主题

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  create \
  --port 9444 \
  --text "今天的灵感"
```

### 3. 基于已有结果切主题

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  update \
  --port 9444 \
  --job-id <job_id> \
  --theme 简约
```

### 4. 换配色

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  update \
  --port 9444 \
  --job-id <job_id> \
  --recolor
```

连续换两次配色：

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  update \
  --port 9444 \
  --job-id <job_id> \
  --recolor 2
```

### 5. 下载当前图

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  download \
  --port 9444 \
  --job-id <job_id>
```

### 6. 看当前状态

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  status \
  --port 9444
```

### 7. 列出当前可用主题

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  themes \
  --port 9444
```

### 8. 批量刷新全部主题样例

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  catalog \
  --port 9444 \
  --text "小红书主题测试"
```

## 参数说明

- `--port`: 远程调试端口，比如 `9444`
- `--cdp-url`: 完整 CDP 地址，比如 `http://127.0.0.1:9444`
- `--chrome-path`: Chrome 可执行文件路径
- `--profile-dir`: Chrome profile 目录
- `--base-dir`: 任务和图片输出根目录，默认是当前目录
- `--timeout`: 图片生成等待秒数
- `--catalog-dir`: `catalog` 子命令的样例输出目录，默认写入 skill 下的 `theme_catalog/`

## 输出

脚本返回 JSON，重点字段：

- `ok`
- `job_id`
- `theme`
- `image_url`
- `download_path`
- `page_url`
- `message`
- `overview_path`
- `manifest_path`

## 使用建议

- 用户如果只是说“生成一张图”，优先用 `create`
- 用户如果已经停在预览页并说“换成科技”“再换个颜色”，优先用 `update`
- 用户如果不确定当前是什么状态，先跑 `status`
- 用户如果不知道有哪些主题可选，先跑 `themes`
- 用户如果是要给客户看主题风格，优先直接发 `theme_catalog/overview.jpg`，不要先只回主题名列表
- 用户如果明确要求把主题样例更新成最新页面效果，跑 `catalog`

## 烟测

当前本机已验证这条命令可跑通：

```bash
python3 ${SKILL_DIR}/scripts/xhs_text2image.py \
  create \
  --port 9444 \
  --text "codex 牛逼" \
  --theme 科技
```
