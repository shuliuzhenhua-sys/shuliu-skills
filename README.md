# shuliu-skills

English | [中文](./README.zh.md)

Local skills marketplace following the `jimliu/baoyu-skills` structure.

## Installation

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
```

## Update Skill

When the skill is updated in this repository, reinstall the latest version:

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
```

## Available Plugins

| Plugin | Description | Skills |
|--------|-------------|--------|
| **image-generation-skills** | Image generation backends | [banana-proxy](#banana-proxy) |

## Available Skills

### banana-proxy

Gemini image generation via Banana proxy endpoint. Single provider only.

```bash
npx -y bun skills/banana-proxy/scripts/main.ts --prompt "A cat" --image out.png
```

Environment variable:

- `BANANA_PROXY_API_KEY` (required)
