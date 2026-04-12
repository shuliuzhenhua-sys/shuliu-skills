#!/usr/bin/env python3
import argparse
import hashlib
import html
import json
import os
import re
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path


UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

DEFAULT_OUTPUT_DIR = os.path.expanduser("~/wechat-mp-scraper-runs")

IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "bmp",
    "svg",
    "apng",
}

ANIMATION_PATTERNS = [
    "animate",
    "@keyframes",
    "animation",
    "animatetransform",
    "opacity",
    "transform",
    "background-image",
    "translate",
    "scale",
]

TEXT_BLOCK_TAGS = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"}


class WechatContentParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_content = False
        self.content_depth = 0
        self.text_stack = []
        self.blocks = []

    def _attrs_to_dict(self, attrs):
        return {key: value for key, value in attrs}

    def _handle_inline(self, tag, attrs):
        attrs_dict = self._attrs_to_dict(attrs)
        if tag == "br" and self.text_stack:
            self.text_stack[-1]["parts"].append("\n")
            return
        if tag == "img":
            raw_url = (
                attrs_dict.get("data-src")
                or attrs_dict.get("src")
                or attrs_dict.get("data-original")
            )
            url = normalize_url(raw_url or "")
            if is_candidate_resource_url(url):
                self.blocks.append(
                    {
                        "type": "image",
                        "url": url,
                        "alt": (attrs_dict.get("alt") or "").strip(),
                    }
                )

    def handle_starttag(self, tag, attrs):
        attrs_dict = self._attrs_to_dict(attrs)
        if not self.in_content and attrs_dict.get("id") == "js_content":
            self.in_content = True
            self.content_depth = 1
            return

        if not self.in_content:
            return

        self.content_depth += 1
        if tag in TEXT_BLOCK_TAGS:
            self.text_stack.append({"tag": tag, "parts": []})
        self._handle_inline(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        if not self.in_content:
            return
        self._handle_inline(tag, attrs)

    def handle_data(self, data):
        if self.in_content and self.text_stack:
            self.text_stack[-1]["parts"].append(data)

    def handle_endtag(self, tag):
        if not self.in_content:
            return

        if self.text_stack and self.text_stack[-1]["tag"] == tag:
            current = self.text_stack.pop()
            text = normalize_text("".join(current["parts"]))
            if text:
                self.blocks.append(
                    {
                        "type": "text",
                        "tag": current["tag"],
                        "text": text,
                    }
                )

        self.content_depth -= 1
        if self.content_depth <= 0:
            self.in_content = False
            self.content_depth = 0


def parse_args():
    parser = argparse.ArgumentParser(description="抓取并拆解微信公众号文章页")
    parser.add_argument("url", help="公众号文章链接，例如 https://mp.weixin.qq.com/s/...")
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        help=f"输出根目录，默认 {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--max-downloads",
        type=int,
        default=80,
        help="最多下载多少个素材文件，默认 80",
    )
    return parser.parse_args()


def validate_url(url: str):
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc != "mp.weixin.qq.com":
        raise ValueError("仅支持 mp.weixin.qq.com 域名")
    if not parsed.path.startswith("/s/") and parsed.path != "/s":
        raise ValueError("仅支持公众号文章页链接")


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="ignore")


def extract_first(patterns, text, flags=0, default=""):
    for pattern in patterns:
        match = re.search(pattern, text, flags)
        if match:
            return html.unescape(match.group(1)).strip()
    return default


def extract_title(html_text: str) -> str:
    return extract_first(
        [
            r'<meta\s+property="og:title"\s+content="([^"]+)"',
            r'<meta\s+property="twitter:title"\s+content="([^"]+)"',
            r'<span class="js_title_inner">(.+?)</span>',
            r"<title>(.+?)</title>",
        ],
        html_text,
        flags=re.IGNORECASE | re.DOTALL,
        default="untitled-wechat-article",
    )


def extract_author(html_text: str) -> str:
    return extract_first(
        [
            r'<a[^>]+id="js_name"[^>]*>(.+?)</a>',
            r'var nickname = htmlDecode\("(.+?)"\)',
            r'profile_nickname\s*=\s*"(.+?)"',
        ],
        html_text,
        flags=re.IGNORECASE | re.DOTALL,
        default="",
    )


def extract_publish_time(html_text: str) -> str:
    return extract_first(
        [
            r"var createTime = '([^']+)'",
            r'var createTime = "([^"]+)"',
            r'<em[^>]+id="publish_time"[^>]*>(.+?)</em>',
            r'publish_time">\s*(.+?)\s*</em>',
        ],
        html_text,
        flags=re.IGNORECASE | re.DOTALL,
        default="",
    )


def extract_digest(html_text: str) -> str:
    return extract_first(
        [
            r'<meta\s+name="description"\s+content="([^"]+)"',
            r'<meta\s+property="og:description"\s+content="([^"]+)"',
        ],
        html_text,
        flags=re.IGNORECASE | re.DOTALL,
        default="",
    )


def normalize_url(raw_url: str) -> str:
    normalized = html.unescape(raw_url).replace("&amp;", "&").strip()
    if normalized.startswith("//"):
        normalized = f"https:{normalized}"
    return normalized


def is_candidate_resource_url(url: str) -> bool:
    if not url:
        return False
    lowered = url.lower().strip()
    if lowered.startswith("http://") or lowered.startswith("https://"):
        return True
    return False


def normalize_text(value: str) -> str:
    value = html.unescape(value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r"\n\s*\n+", "\n", value)
    return value.strip()


def unique(seq):
    seen = set()
    result = []
    for item in seq:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def extract_image_urls(html_text: str):
    patterns = [
        r'data-src="([^"]+)"',
        r'src="(https://[^"]+)"',
        r"data-original=\"([^\"]+)\"",
    ]
    urls = []
    for pattern in patterns:
        urls.extend(re.findall(pattern, html_text, flags=re.IGNORECASE))
    urls = [normalize_url(url) for url in urls]
    urls = [url for url in urls if is_candidate_resource_url(url)]
    return unique(urls)


def extract_background_urls(html_text: str):
    patterns = [
        r"background-image:\s*url\((?:&quot;|\"|')?([^\"')]+)(?:&quot;|\"|')?\)",
        r"background:\s*url\((?:&quot;|\"|')?([^\"')]+)(?:&quot;|\"|')?\)",
    ]
    urls = []
    for pattern in patterns:
        urls.extend(re.findall(pattern, html_text, flags=re.IGNORECASE))
    urls = [normalize_url(url) for url in urls if "data:image/" not in url]
    urls = [url for url in urls if is_candidate_resource_url(url)]
    return unique(urls)


def extract_animation_snippets(html_text: str):
    snippets = []
    lowered = html_text.lower()
    for keyword in ANIMATION_PATTERNS:
        start = 0
        needle = keyword.lower()
        while True:
            idx = lowered.find(needle, start)
            if idx == -1:
                break
            left = max(0, idx - 240)
            right = min(len(html_text), idx + 560)
            snippet = html_text[left:right].strip()
            snippets.append({"keyword": keyword, "snippet": snippet})
            start = idx + len(needle)
    deduped = []
    seen = set()
    for item in snippets:
        key = (item["keyword"], item["snippet"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


def slugify(title: str, url: str) -> str:
    cleaned = re.sub(r"\s+", "-", title.strip().lower())
    cleaned = re.sub(r"[^a-z0-9\u4e00-\u9fff-]+", "-", cleaned)
    cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-")
    digest = hashlib.md5(url.encode("utf-8")).hexdigest()[:8]
    if not cleaned:
        cleaned = "wechat-article"
    return f"{cleaned[:48]}-{digest}"


def choose_extension(url: str, headers=None):
    parsed = urllib.parse.urlparse(url)
    path = parsed.path or ""
    ext = Path(path).suffix.lower().lstrip(".")
    if ext in IMAGE_EXTENSIONS:
        return ext
    if "wx_fmt=" in parsed.query:
        query = urllib.parse.parse_qs(parsed.query)
        value = query.get("wx_fmt", [""])[0].lower()
        if value in IMAGE_EXTENSIONS:
            return value
    content_type = ""
    if headers:
        content_type = headers.get("Content-Type", "")
    mapping = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    }
    for key, value in mapping.items():
        if key in content_type:
            return value
    return "bin"


def download_assets(urls, assets_dir: Path, max_downloads: int):
    downloaded = []
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for index, url in enumerate(urls[:max_downloads], start=1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA})
            with opener.open(request, timeout=30) as response:
                data = response.read()
                ext = choose_extension(url, response.headers)
            filename = f"{index:03d}.{ext}"
            target = assets_dir / filename
            target.write_bytes(data)
            downloaded.append(
                {
                    "index": index,
                    "url": url,
                    "file": str(target),
                    "size": len(data),
                }
            )
        except Exception as exc:
            downloaded.append(
                {
                    "index": index,
                    "url": url,
                    "error": str(exc),
                }
            )
    return downloaded


def write_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def extract_content_blocks(html_text: str):
    parser = WechatContentParser()
    parser.feed(html_text)
    return parser.blocks


def build_download_mapping(downloads):
    mapping = {}
    for item in downloads:
        if "file" in item:
            mapping[item["url"]] = item["file"]
    return mapping


def write_content_outputs(output_dir: Path, metadata: dict, blocks, download_mapping):
    serializable_blocks = []
    markdown_lines = [
        f"# {metadata['title']}",
        "",
    ]

    if metadata.get("author"):
        markdown_lines.append(f"- 作者：{metadata['author']}")
    if metadata.get("publish_time"):
        markdown_lines.append(f"- 发布时间：{metadata['publish_time']}")
    if metadata.get("digest"):
        markdown_lines.append(f"- 摘要：{metadata['digest']}")
    if len(markdown_lines) > 2:
        markdown_lines.append("")

    for block in blocks:
        if block["type"] == "text":
            serializable_blocks.append(block)
            tag = block["tag"]
            text = block["text"]
            if tag.startswith("h") and len(tag) == 2 and tag[1].isdigit():
                level = max(1, min(6, int(tag[1])))
                markdown_lines.append(f"{'#' * level} {text}")
            elif tag == "li":
                markdown_lines.append(f"- {text}")
            else:
                markdown_lines.append(text)
            markdown_lines.append("")
            continue

        local_file = download_mapping.get(block["url"], "")
        relative_file = ""
        if local_file:
            relative_file = os.path.relpath(local_file, output_dir)
        serializable_blocks.append(
            {
                **block,
                "local_file": local_file,
                "relative_file": relative_file,
            }
        )
        image_ref = relative_file or block["url"]
        alt = block.get("alt") or "image"
        markdown_lines.append(f"![{alt}]({image_ref})")
        markdown_lines.append("")

    content_json = {
        "title": metadata["title"],
        "author": metadata.get("author", ""),
        "publish_time": metadata.get("publish_time", ""),
        "digest": metadata.get("digest", ""),
        "blocks": serializable_blocks,
    }

    write_text(output_dir / "content.md", "\n".join(markdown_lines).strip() + "\n")
    write_text(output_dir / "content.json", json.dumps(content_json, ensure_ascii=False, indent=2))


def generate_report(output_dir: Path, data: dict):
    downloaded_ok = [item for item in data["downloads"] if "file" in item]
    examples = []
    for item in downloaded_ok[:5]:
        examples.append(f"- `{Path(item['file']).name}` <- {item['url']}")

    keywords = ", ".join(data["animation"]["keywords_found"]) or "无"
    report = f"""# 微信公众号抓取报告

## 基本信息

- 来源链接：{data["source_url"]}
- 抓取时间：{data["fetched_at"]}
- 标题：{data["title"]}
- 输出目录：`{output_dir}`

## 资源统计

- 正文图片 URL：{data["counts"]["images"]}
- 背景图 URL：{data["counts"]["background_images"]}
- 合并后候选资源：{data["counts"]["all_resources"]}
- 实际下载成功：{len(downloaded_ok)}
- 动画片段命中：{data["animation"]["snippet_count"]}

## 动画判断

- 命中关键词：{keywords}
- 判断依据：优先根据 `animate/@keyframes/opacity/transform/background-image` 等片段判断

## 关键文件

- 原始 HTML：`{output_dir / 'article.html'}`
- 正文 Markdown：`{output_dir / 'content.md'}`
- 正文 JSON：`{output_dir / 'content.json'}`
- 资源清单：`{output_dir / 'urls.json'}`
- 动画片段：`{output_dir / 'snippets' / 'animation-snippets.txt'}`
- 原始命中块：`{output_dir / 'snippets' / 'matched-blocks.html'}`

## 素材示例

{os.linesep.join(examples) if examples else '- 无下载成功素材'}

## 备注

- 第一版 skill 只支持公开可访问的公众号文章页。
- 如果用户要继续分析“这段动画怎么实现”，优先从 `snippets/` 和 `urls.json` 回答。
"""
    write_text(output_dir / "report.md", report)


def main():
    args = parse_args()
    validate_url(args.url)

    fetched_at = datetime.now(timezone(timedelta(hours=8))).isoformat()
    html_text = fetch_text(args.url)
    title = extract_title(html_text)
    author = extract_author(html_text)
    publish_time = extract_publish_time(html_text)
    digest = extract_digest(html_text)
    slug = slugify(title, args.url)

    output_dir = Path(args.output_dir).expanduser() / slug
    assets_dir = output_dir / "assets"
    snippets_dir = output_dir / "snippets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    snippets_dir.mkdir(parents=True, exist_ok=True)

    write_text(output_dir / "article.html", html_text)

    image_urls = extract_image_urls(html_text)
    background_urls = extract_background_urls(html_text)
    all_resource_urls = unique(image_urls + background_urls)
    animation_snippets = extract_animation_snippets(html_text)
    found_keywords = unique([item["keyword"] for item in animation_snippets])

    downloads = download_assets(all_resource_urls, assets_dir, args.max_downloads)
    download_mapping = build_download_mapping(downloads)
    content_blocks = extract_content_blocks(html_text)
    metadata = {
        "title": title,
        "author": author,
        "publish_time": publish_time,
        "digest": digest,
    }
    write_content_outputs(output_dir, metadata, content_blocks, download_mapping)

    snippet_text = []
    matched_html = []
    for index, item in enumerate(animation_snippets, start=1):
        block = textwrap.dedent(
            f"""\
            ===== snippet {index:03d} | keyword: {item['keyword']} =====
            {item['snippet']}
            """
        )
        snippet_text.append(block)
        matched_html.append(f"<!-- snippet {index:03d} | {item['keyword']} -->\n{item['snippet']}\n")

    write_text(snippets_dir / "animation-snippets.txt", "\n".join(snippet_text))
    write_text(snippets_dir / "matched-blocks.html", "\n".join(matched_html))

    result = {
        "source_url": args.url,
        "fetched_at": fetched_at,
        "title": title,
        "author": author,
        "publish_time": publish_time,
        "digest": digest,
        "output_dir": str(output_dir),
        "counts": {
            "images": len(image_urls),
            "background_images": len(background_urls),
            "all_resources": len(all_resource_urls),
            "content_blocks": len(content_blocks),
        },
        "resources": {
            "images": image_urls,
            "background_images": background_urls,
            "all": all_resource_urls,
        },
        "animation": {
            "keywords_found": found_keywords,
            "snippet_count": len(animation_snippets),
        },
        "downloads": downloads,
    }

    write_text(output_dir / "urls.json", json.dumps(result, ensure_ascii=False, indent=2))
    generate_report(output_dir, result)

    print(json.dumps({"status": "ok", "title": title, "output_dir": str(output_dir)}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as exc:
        print(json.dumps({"status": "error", "error": f"HTTP {exc.code}: {exc.reason}"}, ensure_ascii=False))
        sys.exit(1)
    except Exception as exc:
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
