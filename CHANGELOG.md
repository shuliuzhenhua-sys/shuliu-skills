# Changelog

## 0.2.6 - 2026-02-23

### Changes
- Refactor `ecommerce-images` into a no-code workflow skill (remove `skills/ecommerce-images/scripts/main.ts`).
- Set provider strategy for `ecommerce-images` to use `banana-proxy` by default and fallback to `baoyu-image-gen` on failure.
- Keep `main` / `detail` / `both` generation modes and style ID extension slots in workflow docs.
- Update detail-image behavior to set generation: ask users for required detail image count before running in `detail`/`both` modes.
- Switch style interaction to human-readable style names only.

### Documentation
- Update `AGENTS.md` to align with no-script `ecommerce-images` structure.
- Update `README.md` and `README.zh.md` to include `ecommerce-images` installation and usage guidance.

## 0.2.5 - 2026-02-23

### Features
- Add new skill `ecommerce-images` for generating ecommerce product main and detail images using prompt templates and `banana-proxy`.

## 0.2.4 - 2026-02-23

### Changes
- Remove GeekAI fallback provider from `banana-proxy`; use only lnapi.com (LNAPI_KEY) as primary provider.
- Delete `skills/banana-proxy/scripts/providers/geekai.ts`.
- Simplify `generateWithRetry` to retry primary provider only (no fallback).

## 0.2.3 - 2026-02-23

### Changes
- Change local env directory for `banana-proxy` from `.baoyu-skills/.env` to `.shuliu-skills/.env` (both project and home paths).
- Update CLI help text to reflect the new env file load order.

## 0.2.2 - 2026-02-23

### Changes
- Change default GeekAI fallback model from `bananan-2` to `nano-banana-2` for `banana-proxy`.
- Keep actual output format from provider response (no forced PNG), and save with matched extension.

## 0.2.1 - 2026-02-23

### Features
- Add GeekAI image fallback provider to `banana-proxy`.
- Keep Banana Gemini as primary provider and automatically fallback to GeekAI model `bananan-2` when primary generation fails after retry.
- Add new provider implementation: `skills/banana-proxy/scripts/providers/geekai.ts`.

### Documentation
- Update `skills/banana-proxy/SKILL.md` to describe primary/fallback behavior and new env vars.
- Update `README.md` and `README.zh.md` with `GEEKAI_API_KEY` / `GEEKAI_IMAGE_MODEL` usage.

## 0.2.0 - 2026-02-17

### Features
- Add new skill `douyin-share-info` for fetching Douyin basic video info by share URL via TikHub Douyin Web API.
- Add CLI script `skills/douyin-share-info/scripts/main.ts` with normalized JSON output fields.
- Implement fixed extraction rules:
  - cover: `data.aweme_detail.video.origin_cover.url_list[0]`
  - audio: `data.aweme_detail.music.play_url.url_list[0]`
  - video: `data.aweme_detail.video.bit_rate[i].play_addr.url_list[0]` (pick first available by array order)

### Documentation
- Register `douyin-share-info` in `.claude-plugin/marketplace.json` under plugin `douyin-tools`.
- Update `README.md` and `README.zh.md` with install and usage instructions for `douyin-share-info`.
- Update `AGENTS.md` to reflect multi-skill repository structure and `douyin-share-info` conventions.

## 0.1.1 - 2026-02-17

### Documentation
- Add `AGENTS.md` contributor guide.
- Define mandatory release rules: tag every commit, update both changelogs for every change, and sync `AGENTS.md` when skills or skill structure changes.

## 0.1.0 - 2026-02-17

### Features
- Initialize local `shuliu-skills` marketplace repository structure.
- Add `banana-proxy` skill with scripts and documentation.
- Add `.claude-plugin/marketplace.json` with `image-generation-skills` plugin category.
- Add README and README.zh with install, update marketplace directory, and skill index.
