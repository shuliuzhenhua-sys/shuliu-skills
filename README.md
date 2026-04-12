# shuliu-skills

English | [中文](./README.zh.md)

Local skills marketplace following the `jimliu/baoyu-skills` structure.

## Installation

```bash
npx skills add https://github.com/twodogegg/shuliu-skills --skill banana-proxy
npx skills add https://github.com/twodogegg/shuliu-skills --skill geek-image
npx skills add https://github.com/twodogegg/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/twodogegg/shuliu-skills --skill sora-video
npx skills add https://github.com/twodogegg/shuliu-skills --skill douyin-share-info
npx skills add https://github.com/twodogegg/shuliu-skills --skill wechat-mp-scraper
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-user-auth
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-bitable
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-approval
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-card
npx skills add https://github.com/twodogegg/shuliu-skills --skill xhs-text2image
```

## Update Skill

When the skill is updated in this repository, reinstall the latest version:

```bash
npx skills add https://github.com/twodogegg/shuliu-skills --skill banana-proxy
npx skills add https://github.com/twodogegg/shuliu-skills --skill geek-image
npx skills add https://github.com/twodogegg/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/twodogegg/shuliu-skills --skill sora-video
npx skills add https://github.com/twodogegg/shuliu-skills --skill douyin-share-info
npx skills add https://github.com/twodogegg/shuliu-skills --skill wechat-mp-scraper
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-user-auth
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-bitable
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-approval
npx skills add https://github.com/twodogegg/shuliu-skills --skill feishu-card
npx skills add https://github.com/twodogegg/shuliu-skills --skill xhs-text2image
```

## Available Plugins

| Plugin | Description | Skills |
|--------|-------------|--------|
| **image-generation-skills** | Image generation backends | [banana-proxy](#banana-proxy), [geek-image](#geek-image), [ecommerce-images](#ecommerce-images) |
| **video-generation-skills** | Video generation backends | [sora-video](#sora-video) |
| **douyin-tools** | Douyin share URL parsing | [douyin-share-info](#douyin-share-info) |
| **wechat-tools** | WeChat public account article scraping | [wechat-mp-scraper](#wechat-mp-scraper) |
| **feishu-tools** | Feishu auth, interactive cards, native approval, token reuse, and Bitable operations | [feishu-user-auth](#feishu-user-auth), [feishu-bitable](#feishu-bitable), [feishu-approval](#feishu-approval), [feishu-card](#feishu-card) |
| **xiaohongshu-tools** | Xiaohongshu creator workflows | [xhs-text2image](#xhs-text2image) |

## Available Skills

### banana-proxy

Gemini image generation via Banana proxy endpoint.

```bash
npx -y bun skills/banana-proxy/scripts/main.ts --prompt "A cat" --image out.jpg
```

Environment variable:

- `LNAPI_KEY` (required)

### geek-image

GeekAI image generation via geekai.co.

```bash
npx -y bun skills/geek-image/scripts/main.ts --prompt "A cat" --image out.png
```

Environment variables:

- `GEEKAI_API_KEY` (required)
- `GEEK_IMAGE_MODEL` (optional, default `nano-banana-2`)

### sora-video

Sora video generation via lnapi.com.

```bash
npx -y bun skills/sora-video/scripts/main.ts --prompt "A video prompt" --output video.mp4
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

### wechat-mp-scraper

Scrape and analyze publicly accessible WeChat public-account article pages.

```bash
python3 skills/wechat-mp-scraper/scripts/scrape_wechat_mp.py \
  "https://mp.weixin.qq.com/s/xxxx" \
  --output-dir ~/wechat-mp-scraper-runs
```

Outputs include:

- `article.html`
- `content.md`
- `content.json`
- `report.md`
- `urls.json`
- downloaded assets and animation snippets

### ecommerce-images

Workflow skill for generating ecommerce product main images and detail images from a user-provided product image.

- Supports: `main` / `detail` / `both`
- Detail images are generated as a set, and the skill asks the user how many detail images are needed before execution
- Default aspect ratio: main image `1:1`, detail images `3:4`
- Defaults to `banana-proxy`; falls back to `baoyu-image-gen` on failure
- Supports human-friendly style names

Use this skill by asking in natural language, for example:
- "Generate ecommerce main image and detail image from `/path/product.png`"
- "Generate 5 detail images in specification-focused style"

### feishu-user-auth

Feishu user OAuth/device-flow authorization with local token reuse and scope top-up.

After a project-local install:

```bash
./.agents/skills/feishu-user-auth/bin/feishu-auth.js auth
./.agents/skills/feishu-user-auth/bin/feishu-auth.js show-token
./.agents/skills/feishu-user-auth/bin/feishu-auth.js refresh-token
./.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
```

After a global install (`npx skills add ... -g`):

```bash
~/.agents/skills/feishu-user-auth/bin/feishu-auth.js auth
```

Config options:

- Edit the installed skill's `config.json` (`appId` / `appSecret` required)
  - Project-local install: `./.agents/skills/feishu-user-auth/config.json`
  - Global install: `~/.agents/skills/feishu-user-auth/config.json`
- Or run `~/.agents/skills/feishu-user-auth/bin/feishu-auth.js --config /path/to/config.json auth`

If you want the short `feishu-auth` command, add your own PATH symlink:

```bash
mkdir -p ~/.local/bin
ln -sf ~/.agents/skills/feishu-user-auth/bin/feishu-auth.js ~/.local/bin/feishu-auth
```

### feishu-bitable

Feishu Bitable workflow skill for records CRUD, field management, views, permissions, formulas, and linked tables.

- Use in natural language, for example:
  - "Create a new Bitable base and add me as a collaborator"
  - "Insert 20 records into this table"
  - "Add a currency field and a linked-record field"
- The skill keeps core guidance in `SKILL.md` and only reads `references/fields.md` when the task needs `type / ui_type / property` decisions.

### feishu-approval

Documentation-first skill for Feishu native approvals, covering approval definitions, form controls, external options, approval instances, and troubleshooting.

- Trigger it with natural language, for example:
  - "How should form_content be written for a Feishu approval definition?"
  - "Help me write a radioV2 control backed by external options"
  - "How do I pass dateInterval when creating an approval instance?"
- "What does approval code not found mean?"
- This skill intentionally ships without scripts and focuses on turning official approval docs into precise field explanations and ready-to-use JSON fragments.

### feishu-card

Documentation-first skill for Feishu interactive cards, covering card JSON structure, `interactive` message sending, callback payloads, and message updates.

- Trigger it with natural language, for example:
  - "Send an interactive card to this open_id"
  - "Write a Feishu card with two buttons and a note section"
  - "How do I update an existing card by message_id?"
  - "Why does `feishu-auth system-token` fail when I paste it directly into Authorization?"
- This skill reuses `feishu-user-auth` for token retrieval. Prefer:

```bash
feishu-auth system-token
```

If `feishu-auth` is not in PATH, run the installed bin directly:

```bash
./.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
~/.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
```

- `system-token` returns JSON. Use only the `accessToken` field in `Authorization: Bearer <token>`.

### xhs-text2image

Xiaohongshu creator-platform text-to-image automation for logged-in browser sessions.

- Supports text prompt creation, preview-page theme switching, recolor, redownload, and theme listing
- Bundles a ready-to-send preview catalog under `skills/xhs-text2image/theme_catalog/`
- Includes a `catalog` command to refresh every theme sample and regenerate the overview image

Run examples:

```bash
python3 skills/xhs-text2image/scripts/xhs_text2image.py create --port 9444 --text "小红书主题测试" --theme 科技
python3 skills/xhs-text2image/scripts/xhs_text2image.py catalog --port 9444 --text "小红书主题测试"
```

Requirements:

- Python 3
- `playwright` and `Pillow`
- A Chrome / Chromium session already logged in to Xiaohongshu Creator and exposed through a CDP port such as `9444`
