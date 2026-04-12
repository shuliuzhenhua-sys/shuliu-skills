---
name: wechat-mp-scraper
description: "抓取和拆解微信公众号文章页。只要用户提到“微信公众号网页”“公众号文章”“mp.weixin.qq.com/s/”“抓 HTML”“导出素材”“分析公众号动画/实现方式/图片资源”这类场景，就应该使用这个 skill。它适用于公开可访问的公众号文章页，负责抓原始 HTML、提取资源、下载素材、整理动画线索，并生成结构化报告。"
---

# 微信公众号文章抓取技能

## Script Directory

**Important**: All scripts and references are located inside this skill directory.

**Agent Execution Instructions**:
1. Determine this `SKILL.md` file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/scrape_wechat_mp.py`
3. Reference path = `${SKILL_DIR}/references/output-format.md`
4. Replace all `${SKILL_DIR}` placeholders in this document with the actual installed path

这个 skill 用于处理 **公开可访问** 的微信公众号文章页，不支持登录态页面、受限内容或需要账号权限的场景。

它不只是做分析，也负责把正文内容完整抓下来。

## 何时使用

当用户要做下面任一事情时，直接使用本 skill：

- 抓取公众号文章 HTML
- 分析公众号文章里的图片、背景图、动画、实现方式
- 下载正文素材到本地
- 针对 `mp.weixin.qq.com/s/...` 链接生成报告

## 默认流程

1. 确认目标 URL 是公众号文章页。
2. 运行脚本抓取 HTML、抽取正文、提取资源、下载素材。
3. 阅读脚本输出的 `content.md`、`content.json`、`report.md`、`urls.json` 和 `snippets/`。
4. 如果用户关心“怎么实现的”，基于抓取结果补充解释，而不是重新手工抓一遍。

## 运行方式

优先直接调用脚本：

```bash
python3 ${SKILL_DIR}/scripts/scrape_wechat_mp.py "<文章链接>" --output-dir "<输出目录>"
```

如果用户没给输出目录，默认建议放到：

```bash
~/wechat-mp-scraper-runs
```

## 输出目录结构

脚本会生成如下内容：

```text
<output-dir>/<slug>/
├── article.html
├── content.md
├── content.json
├── report.md
├── urls.json
├── assets/
│   ├── 001.png
│   ├── 002.jpg
│   └── ...
└── snippets/
    ├── animation-snippets.txt
    └── matched-blocks.html
```

需要解释实现方式时，重点看：

- `content.md`
- `content.json`
- `urls.json`
- `snippets/animation-snippets.txt`
- `snippets/matched-blocks.html`

## 解释结果时的重点

如果用户问“这段动画怎么做的”，优先回答：

1. 是单图、双图叠层、逐帧图、GIF，还是 SVG/CSS 动画
2. 关键素材是哪几张图
3. 关键实现是 `opacity`、`transform`、`@keyframes`、`<animate>` 还是轮播切换
4. 能否用更轻的本地实现复刻

不要泛泛而谈“可能是 JS 动画”，要尽量引用抓到的具体片段和素材路径。

## 失败与边界

- 如果 URL 不是公众号文章页，明确说明并停止。
- 如果页面需要登录或返回风控页，明确说明“当前 skill 第一版不支持登录态/受限内容”。
- 如果只抓到 HTML 但没有素材，不要假装分析完成；要说明抓到了什么、缺了什么。

## 补充参考

如果需要了解输出字段，读取：

`${SKILL_DIR}/references/output-format.md`
