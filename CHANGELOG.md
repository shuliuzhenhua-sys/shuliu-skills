# Changelog

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
