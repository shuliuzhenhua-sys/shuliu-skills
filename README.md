# shuliu-skills

English | [中文](./README.zh.md)

Local skills marketplace following the `jimliu/baoyu-skills` structure.

## Installation

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
```

## Update Skill

When the skill is updated in this repository, reinstall the latest version:

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
```

## Available Plugins

| Plugin | Description | Skills |
|--------|-------------|--------|
| **image-generation-skills** | Image generation backends | [banana-proxy](#banana-proxy) |
| **douyin-tools** | Douyin share URL parsing | [douyin-share-info](#douyin-share-info) |

## Available Skills

### banana-proxy

Gemini image generation via Banana proxy endpoint, with GeekAI fallback when primary generation fails.

```bash
npx -y bun skills/banana-proxy/scripts/main.ts --prompt "A cat" --image out.png
```

Environment variable:

- `BANANA_PROXY_API_KEY` (required, primary provider)
- `GEEKAI_API_KEY` (optional but recommended, fallback provider)
- `GEEKAI_IMAGE_MODEL` (optional, default: `nano-banana-2`)

### douyin-share-info

Fetch Douyin basic info from share URL via TikHub Douyin Web API, and extract first cover/audio/video URL.

```bash
npx -y bun skills/douyin-share-info/scripts/main.ts --share-url "https://v.douyin.com/xxxx/" --json
```

Environment variable:

- `TIKHUB_API_KEY` (required)
