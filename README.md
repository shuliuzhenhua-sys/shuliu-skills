# shuliu-skills

English | [中文](./README.zh.md)

Local skills marketplace following the `jimliu/baoyu-skills` structure.

## Installation

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
```

## Update Skill

When the skill is updated in this repository, reinstall the latest version:

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
```

## Available Plugins

| Plugin | Description | Skills |
|--------|-------------|--------|
| **image-generation-skills** | Image generation backends | [banana-proxy](#banana-proxy), [ecommerce-images](#ecommerce-images) |
| **douyin-tools** | Douyin share URL parsing | [douyin-share-info](#douyin-share-info) |

## Available Skills

### banana-proxy

Gemini image generation via Banana proxy endpoint.

```bash
npx -y bun skills/banana-proxy/scripts/main.ts --prompt "A cat" --image out.png
```

Environment variable:

- `LNAPI_KEY` (required)

### douyin-share-info

Fetch Douyin basic info from share URL via TikHub Douyin Web API, and extract first cover/audio/video URL.

```bash
npx -y bun skills/douyin-share-info/scripts/main.ts --share-url "https://v.douyin.com/xxxx/" --json
```

Environment variable:

- `TIKHUB_API_KEY` (required)

### ecommerce-images

Workflow skill for generating ecommerce product main images and detail images from a user-provided product image.

- Supports: `main` / `detail` / `both`
- Detail images are generated as a set, and the skill asks the user how many detail images are needed before execution
- Defaults to `banana-proxy`; falls back to `baoyu-image-gen` on failure
- Supports human-friendly style names

Use this skill by asking in natural language, for example:
- "Generate ecommerce main image and detail image from `/path/product.png`"
- "Generate 5 detail images in specification-focused style"
