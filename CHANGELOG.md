# Changelog

## 0.2.16 - 2026-03-23

### Documentation
- Expand `feishu-approval` skill coverage to include approval file upload for image and attachment controls.
- Add `skills/feishu-approval/references/file-upload.md` with upload flow, request fields, limits, response usage, and instance value examples.
- Update `skills/feishu-approval/SKILL.md` and `skills/feishu-approval/references/instance.md` so the skill routes file-upload questions correctly and explains how uploaded file `code` is used in approval instances.

## 0.2.15 - 2026-03-21

### Documentation
- Update `skills/feishu-bitable/SKILL.md` with two practical modeling guidelines for Feishu Bitable:
- use integer fields for quantity values to avoid unnecessary decimals
- prefer views to separate statuses while keeping the total number of views small and manageable

## 0.2.14 - 2026-03-20

### Changes
- Fix `feishu-user-auth` config path resolution so `storeDir` and `legacyStoreDir` support `~/...` home-directory paths.
- Remove the repo-specific `storeDir` override from `skills/feishu-user-auth/config.json` so distributed installs default to `~/.feishu-auth`.
- Bump `.claude-plugin/marketplace.json` metadata version to `0.2.14`.

### Documentation
- Update `skills/feishu-user-auth/SKILL.md` to describe user-home defaults instead of a repository-relative storage path.
- Update `README.md`, `README.zh.md`, `AGENTS.md`, and `skills/feishu-user-auth/SKILL.md` to document the actual installed bin paths (`.agents/skills/.../bin/feishu-auth.js`) for both project-local and global installs, plus an optional PATH symlink flow.

## 0.2.13 - 2026-03-20

### Features
- Add new documentation-first skill `feishu-approval` for Feishu native approval definitions, form controls, external options, approval instances, and troubleshooting.
- Register `./skills/feishu-approval` in the `feishu-tools` plugin group and bump marketplace metadata version to `0.2.13`.

### Documentation
- Update `README.md` and `README.zh.md` with install and usage guidance for `feishu-approval`.
- Update `AGENTS.md` to include the new skill paths and repository conventions.

## 0.2.12 - 2026-03-20

### Features
- Add new skill `feishu-bitable` for Feishu Bitable record CRUD, field management, views, permissions, formulas, and linked-table workflows.
- Add field reference guide under `skills/feishu-bitable/references/fields.md` for `type / ui_type / property` decisions.
- Register `./skills/feishu-bitable` in the `feishu-tools` plugin group and bump marketplace metadata version to `0.2.12`.

### Documentation
- Update `README.md` and `README.zh.md` with install and usage guidance for `feishu-bitable`.
- Update `AGENTS.md` to include the new skill paths and repository conventions.

## 0.2.11 - 2026-03-20

### Features
- Add new skill `feishu-user-auth` for Feishu user OAuth/device-flow authorization, token reuse, and scope top-up.
- Add runnable scripts under `skills/feishu-user-auth/scripts/` for `auth`, `system-token`, `show-token`, and `refresh-token`.
- Add `feishu-tools` plugin group in `.claude-plugin/marketplace.json` and register `./skills/feishu-user-auth`.

### Documentation
- Update `README.md` and `README.zh.md` with install/usage instructions for `feishu-user-auth`.
- Update `AGENTS.md` to include the new skill paths, commands, and release/security guidance.

## 0.2.9 - 2026-02-25

### Features
- Add new skill `sora-video` for generating videos using Sora via lnapi.com.
- Supports text-to-video and image-to-video generation.
- Supports polling for video completion and automatic download.

### Documentation
- Register `sora-video` in `.claude-plugin/marketplace.json` under new plugin `video-generation-skills`.

## 0.2.8 - 2026-02-23

### Changes
- Update default aspect ratios in `ecommerce-images`: main image defaults to `1:1`, detail images default to `3:4`.
- Allow explicit override through `ar`.
- Bump `.claude-plugin/marketplace.json` metadata version to `0.2.8`.

## 0.2.7 - 2026-02-23

### Changes
- Update `.gitignore` to ignore local `skills-lock.json` and avoid committing machine-specific lock data.
- Bump `.claude-plugin/marketplace.json` metadata version to `0.2.7`.

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
