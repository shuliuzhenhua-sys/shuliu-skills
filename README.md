# shuliu-skills

English | [中文](./README.zh.md)

Local skills marketplace following the `jimliu/baoyu-skills` structure.

## Installation

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
```

Local development (current directory):

```bash
npx skills add ./ --skill banana-proxy
```

Or register as a plugin marketplace in Claude Code:

```bash
/plugin marketplace add .
```

## Update Marketplace

When local skills are updated:

1. Run `/plugin` in Claude Code
2. Go to **Marketplaces**
3. Select **shuliu-skills**
4. Choose **Update marketplace**

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
