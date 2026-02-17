# Repository Guidelines

## Project Structure & Module Organization
This repository is a Claude Code skills marketplace currently focused on:
- `banana-proxy`: Gemini image generation via Banana proxy.
- `douyin-share-info`: Fetch Douyin basic info from share URLs via TikHub Web API.

- `.claude-plugin/marketplace.json`: marketplace metadata, plugin groups, and skill registration.
- `skills/banana-proxy/SKILL.md`: user-facing skill contract and usage docs.
- `skills/banana-proxy/scripts/main.ts`: CLI entrypoint for prompt parsing, env loading, single/batch generation.
- `skills/banana-proxy/scripts/providers/google.ts`: Banana proxy Gemini provider implementation.
- `skills/banana-proxy/scripts/types.ts`: shared TypeScript types.
- `skills/douyin-share-info/SKILL.md`: user-facing skill contract and extraction rules for Douyin share parsing.
- `skills/douyin-share-info/scripts/main.ts`: CLI entrypoint for TikHub API calls and normalized output.
- `README.md` / `README.zh.md`: install and update instructions.
- `CHANGELOG.md` / `CHANGELOG.zh.md`: release notes.

## Build, Test, and Development Commands
No build step is required; scripts run directly with Bun.

- Install skill from GitHub:
  - `npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy`
  - `npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info`
- Run local generation:
  - `npx -y bun skills/banana-proxy/scripts/main.ts --prompt "A cat" --image out.png`
- Run local Douyin share parsing:
  - `npx -y bun skills/douyin-share-info/scripts/main.ts --share-url "https://v.douyin.com/xxxx/" --json`
- Batch generation:
  - `npx -y bun skills/banana-proxy/scripts/main.ts --batch jobs.jsonl --concurrency 4`
- Validate tracked changes before commit:
  - `git status --short`

## Coding Style & Naming Conventions
- Language: TypeScript (ESM), Node built-ins, async/await.
- Indentation: 2 spaces; keep code and docs ASCII unless non-ASCII is required.
- Naming:
  - skill folder: kebab-case (e.g., `banana-proxy`)
  - script files: lowercase (`main.ts`, `types.ts`)
  - types/interfaces: PascalCase (`CliArgs`)
  - variables/functions: camelCase
- Keep CLI flags stable (`--prompt`, `--image`, `--batch`, `--concurrency`).
- For `douyin-share-info`, keep API extraction paths stable:
  - cover: `data.aweme_detail.video.origin_cover.url_list[0]`
  - audio: `data.aweme_detail.music.play_url.url_list[0]`
  - video: `data.aweme_detail.video.bit_rate[i].play_addr.url_list[0]`

## Testing Guidelines
There is no formal test suite yet. Validate behavior with smoke tests:

1. Run one single-image command and confirm output file creation.
2. Run one batch JSONL command and confirm mixed success/failure handling.
3. Verify required env var behavior (`BANANA_PROXY_API_KEY` missing should fail clearly).
4. Run one Douyin share-url command and confirm normalized JSON fields are present.
5. Verify required env var behavior (`TIKHUB_API_KEY` missing should fail clearly).

When adding tests later, place them under each skill path (for example `skills/banana-proxy/tests/` or `skills/douyin-share-info/tests/`) and name files `*.test.ts`.

## Commit & Pull Request Guidelines
- Use Conventional Commits as seen in history:
  - `feat(skills): ...`
  - `docs(readme): ...`
- Keep commits scoped and atomic (docs vs scripts vs marketplace config).
- **Tag on every commit**: each commit must create and push a Git tag (for example: `v0.1.3` or `release-2026-02-17-1`).
- **Changelog required**: every code change must update both `CHANGELOG.md` and `CHANGELOG.zh.md` with what changed in that update.
- **Sync AGENTS.md on skill changes**: if a new skill is added or skill structure/path changes, update `AGENTS.md` in the same change set.
- PRs should include:
  - purpose and summary of changes
  - affected files/paths
  - sample command output or screenshots when behavior changes
  - changelog update if user-facing behavior changes

### Release Checklist (Required)
1. Update code and docs.
2. Update `CHANGELOG.md` and `CHANGELOG.zh.md`.
3. If skills or skill structure changed, update `AGENTS.md`.
4. Commit with Conventional Commit message.
5. Create tag for that commit and push commit + tag.

## Security & Configuration Tips
- Never hardcode secrets; use `BANANA_PROXY_API_KEY`.
- Never hardcode secrets; use `BANANA_PROXY_API_KEY` and `TIKHUB_API_KEY`.
- Review `marketplace.json` version and skill paths before release.
- Keep provider base URL and API behavior changes documented in `SKILL.md` and changelogs.
