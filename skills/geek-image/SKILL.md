---
name: geek-image
description: Generate images via geekai.co image endpoints. Use when the user wants text-to-image generation through GeekAI, needs to choose between nano-banana-2 and gemini-3-pro-image-preview, or wants batch image generation with aspect ratio and size control.
---

# Geek Image Generation

通过 GeekAI 图像接口生图，默认支持 `nano-banana-2` 和 `gemini-3-pro-image-preview`。

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/main.ts`
3. Replace all `${SKILL_DIR}` in this document with the actual path

## Usage

```bash
# 基础生图
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A cat" --image out.png

# 指定模型、比例与分辨率
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "portrait" --image out.png --model gemini-3-pro-image-preview --ar 3:4 --size 2K

# 批量并行生图（JSONL）
npx -y bun ${SKILL_DIR}/scripts/main.ts --batch jobs.jsonl --concurrency 4
```

## Options

- `--prompt <text>`, `-p`: 提示词
- `--promptfiles <files...>`: 从文件读取提示词
- `--image <path>`: 输出路径（必填）
- `--batch <file>`: 批量任务文件（`.json` 数组或 `.jsonl` 每行一个 JSON）
- `--concurrency <n>`: 并行数（仅 `--batch` 模式生效，默认 `4`）
- `--model <id>`, `-m`: 模型（默认 `nano-banana-2`，常用：`nano-banana-2`、`gemini-3-pro-image-preview`）
- `--ar <ratio>`: 比例，如 `1:1`、`3:4`、`16:9`
- `--size 1K|2K|4K`: 生成尺寸等级（默认 `2K`）
- `--json`: JSON 输出

## Batch 文件格式

JSONL 每行示例：

```json
{"prompt":"A cat in watercolor style","image":"out/cat.png","ar":"1:1"}
{"prompt":"A cyberpunk city at night","image":"out/city.png","model":"gemini-3-pro-image-preview","size":"4K"}
```

字段说明：
- `prompt` 或 `promptFile`（二选一）
- `image`（必填）
- 可选：`model`、`ar`、`size`

## Fixed Config

- Base URL: `https://geekai.co/api/v1`
- Primary API Key: `GEEKAI_API_KEY`（必填）
