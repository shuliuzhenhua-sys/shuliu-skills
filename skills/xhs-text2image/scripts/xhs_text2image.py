from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import Page, sync_playwright


TARGET_URL_PREFIX = "https://creator.xiaohongshu.com/"
HOME_URL = "https://creator.xiaohongshu.com/new/home"
PUBLISH_URL = "https://creator.xiaohongshu.com/publish/publish?from=homepage&target=image"
DEFAULT_JOB_DIRNAME = "xhs_jobs"
DEFAULT_OUTPUT_DIRNAME = "xhs_images"
DEFAULT_CATALOG_DIRNAME = "theme_catalog"
DEFAULT_CATALOG_IMAGES_DIRNAME = "images"
DEFAULT_CATALOG_MANIFEST = "manifest.json"
DEFAULT_CATALOG_OVERVIEW = "overview.jpg"
LOGIN_HINTS = ("登录", "扫码登录", "去登录", "手机号登录")
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent


class XhsAutomationError(RuntimeError):
    pass


@dataclass
class JobRecord:
    job_id: str
    text: str
    theme: str | None
    image_url: str | None
    download_path: str | None
    page_state: str
    page_url: str
    cdp_url: str
    created_at: float
    updated_at: float


@dataclass
class CatalogItem:
    theme: str
    image_path: str
    image_url: str


def norm(text: str | None) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def resolve_cdp_url(port: int | None, cdp_url: str | None) -> str:
    if cdp_url:
        return cdp_url
    if port is None:
        raise ValueError("必须传入 --port 或 --cdp-url")
    return f"http://127.0.0.1:{port}"


def detect_page_state(body_text: str) -> str:
    text = norm(body_text)
    if any(hint in text for hint in LOGIN_HINTS):
        return "login"
    if "图片生成中" in text or "加载中" in text:
        return "generating"
    if "预览图片" in text and "换配色" in text:
        return "preview"
    if "上传图片" in text and "文字配图" in text:
        return "publish"
    if "写文字" in text and "生成图片" in text and ("表情" in text or "再写一张" in text):
        return "editor"
    if "发布图文笔记" in text and "发布视频笔记" in text:
        return "home"
    if "下一步" in text and "发布" in text:
        return "next_step"
    return "unknown"


def json_print(data: dict[str, Any]) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def now_ts() -> float:
    return time.time()


class JobStore:
    def __init__(self, base_dir: Path):
        self.jobs_dir = base_dir / DEFAULT_JOB_DIRNAME
        self.jobs_dir.mkdir(parents=True, exist_ok=True)

    def job_path(self, job_id: str) -> Path:
        return self.jobs_dir / f"{job_id}.json"

    def save(self, record: JobRecord) -> Path:
        path = self.job_path(record.job_id)
        path.write_text(json.dumps(asdict(record), ensure_ascii=False, indent=2), encoding="utf-8")
        return path

    def load(self, job_id: str) -> JobRecord:
        path = self.job_path(job_id)
        if not path.exists():
            raise XhsAutomationError(f"找不到 job_id: {job_id}")
        return JobRecord(**json.loads(path.read_text(encoding="utf-8")))


def build_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--port", type=int, help="远程调试端口，例如 9444")
    common.add_argument("--cdp-url", help="完整 CDP 地址，例如 http://127.0.0.1:9444")
    common.add_argument("--chrome-path", help="Chrome 可执行文件路径，用于自动拉起浏览器")
    common.add_argument("--profile-dir", help="Chrome profile 目录，用于端口不可用时自动启动")
    common.add_argument("--base-dir", default=str(Path.cwd()), help="任务与图片输出根目录")
    common.add_argument("--timeout", type=int, default=180, help="图片生成等待秒数")

    parser = argparse.ArgumentParser(description="小红书文字配图自动化脚本", parents=[common])

    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="创建新的文字配图", parents=[common])
    create_parser.add_argument("--text", required=True, help="要生成的文字")
    create_parser.add_argument("--theme", help="可选主题，例如 科技")
    create_parser.add_argument("--recolor", nargs="?", const=1, type=int, default=0, help="生成后换配色次数")

    update_parser = subparsers.add_parser("update", help="基于 job_id 更新主题或配色", parents=[common])
    update_parser.add_argument("--job-id", required=True, help="create 返回的 job_id")
    update_parser.add_argument("--theme", help="更新主题")
    update_parser.add_argument("--recolor", nargs="?", const=1, type=int, default=0, help="换配色次数")

    download_parser = subparsers.add_parser("download", help="下载当前预览图", parents=[common])
    download_parser.add_argument("--job-id", required=True, help="create 返回的 job_id")

    status_parser = subparsers.add_parser("status", help="查看当前页面与任务状态", parents=[common])
    status_parser.add_argument("--job-id", help="可选，查看某个 job_id 的最近记录")

    themes_parser = subparsers.add_parser("themes", help="列出当前可选主题", parents=[common])
    themes_parser.add_argument("--job-id", help="可选，当前只用于保持接口一致")

    catalog_parser = subparsers.add_parser("catalog", help="批量生成所有主题样例与总览拼版", parents=[common])
    catalog_parser.add_argument("--text", default="小红书主题测试", help="主题样例统一文案")
    catalog_parser.add_argument(
        "--catalog-dir",
        default=str(SKILL_DIR / DEFAULT_CATALOG_DIRNAME),
        help="主题样例输出目录，默认写入 skill/theme_catalog",
    )

    return parser


class BrowserSession:
    def __init__(self, args: argparse.Namespace, output_dir: Path):
        self.args = args
        self.output_dir = output_dir
        self.cdp_url = resolve_cdp_url(args.port, args.cdp_url)
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.chrome_process: subprocess.Popen[str] | None = None

    def __enter__(self) -> "BrowserSession":
        self.playwright = sync_playwright().start()
        self.browser = self._connect_or_launch()
        self.context = self.browser.contexts[0] if self.browser.contexts else self.browser.new_context()
        self.page = self._get_or_open_target_page()
        self.page.bring_to_front()
        self.page.wait_for_load_state("domcontentloaded", timeout=15000)
        return self

    def __exit__(self, exc_type, exc, tb):
        if self.browser is not None:
            self.browser.close()
        if self.playwright is not None:
            self.playwright.stop()

    def _connect(self):
        return self.playwright.chromium.connect_over_cdp(self.cdp_url)

    def _connect_or_launch(self):
        try:
            return self._connect()
        except Exception:
            if not self.args.chrome_path or not self.args.profile_dir or not self.args.port:
                raise XhsAutomationError(
                    "CDP 连接失败。请确认传入可用的 --port / --cdp-url，或同时提供 --chrome-path 和 --profile-dir 以自动启动 Chrome。"
                )
            self._launch_chrome()
            return self._connect()

    def _launch_chrome(self) -> None:
        command = [
            self.args.chrome_path,
            f"--remote-debugging-port={self.args.port}",
            f"--user-data-dir={self.args.profile_dir}",
        ]
        self.chrome_process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, text=True)
        deadline = time.time() + 25
        last_error = None
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{self.args.port}/json/version", timeout=2):
                    return
            except Exception as exc:  # pragma: no cover
                last_error = exc
                time.sleep(1)
        raise XhsAutomationError(f"自动启动 Chrome 失败: {last_error}")

    def _get_or_open_target_page(self) -> Page:
        for candidate in self.context.pages:
            if candidate.url.startswith(TARGET_URL_PREFIX):
                return candidate
        page = self.context.new_page()
        page.goto(HOME_URL, wait_until="domcontentloaded")
        return page

    def body_text(self) -> str:
        return norm(self.page.locator("body").inner_text(timeout=10000))

    def page_state(self) -> str:
        return detect_page_state(self.body_text())

    def ensure_logged_in(self) -> None:
        state = self.page_state()
        if state == "login" or "login" in self.page.url:
            raise XhsAutomationError("当前浏览器未登录小红书创作平台，请先手动登录后重试。")

    def open_text2image_editor(self) -> None:
        self.page.once("filechooser", lambda chooser: chooser.set_files([]))
        self.page.goto(PUBLISH_URL, wait_until="domcontentloaded")
        self.page.wait_for_timeout(1200)
        self.ensure_logged_in()
        self.page.keyboard.press("Escape")
        self._maybe_close_popup()
        self.page.wait_for_timeout(1200)
        state = self.page_state()
        if state == "preview":
            self._return_from_preview()
            self.page.wait_for_timeout(1200)
        if self.page.locator("[contenteditable='true']").count() == 0:
            locator = self.page.get_by_text("文字配图", exact=True)
            if locator.count():
                locator.first.click(timeout=10000)
                self.page.wait_for_timeout(1500)
        try:
            self.page.wait_for_selector("[contenteditable='true']", timeout=15000)
        except PlaywrightError:
            raise XhsAutomationError(f"未能进入文字配图编辑页，当前状态: {self.page_state()}")

    def create_image(self, text: str, theme: str | None, recolor: int, timeout_seconds: int) -> dict[str, Any]:
        self.open_text2image_editor()
        self._fill_text_prompt(text)
        self._click_text("生成图片")
        self._wait_until_not_contains("图片生成中", timeout_seconds)
        self.page.wait_for_timeout(1500)
        if self.page_state() != "preview":
            raise XhsAutomationError(f"图片生成后未进入预览页，当前状态: {self.page_state()}")
        if theme:
            self.apply_theme(theme)
        if recolor:
            self.apply_recolor(recolor)
        return self.capture_current_preview()

    def ensure_preview(self) -> None:
        self.ensure_logged_in()
        state = self.page_state()
        if state == "preview":
            return
        self.page.goto(PUBLISH_URL, wait_until="domcontentloaded")
        self.page.wait_for_timeout(1500)
        self.ensure_logged_in()
        state = self.page_state()
        if state != "preview":
            raise XhsAutomationError(f"当前不在预览页，无法更新主题/配色。当前状态: {state}")

    def apply_theme(self, theme: str) -> None:
        self.ensure_preview()
        before = self.preview_src()
        if not self._find_theme(theme):
            available = self.list_themes()
            raise XhsAutomationError(f"当前页面没有主题: {theme}。可用主题: {available}")
        self.page.wait_for_timeout(1200)
        self._wait_preview_maybe_changed(before)
        selected = self.current_theme()
        if selected and selected != theme:
            raise XhsAutomationError(f"主题切换失败，预期 {theme}，实际 {selected}")

    def apply_recolor(self, count: int) -> None:
        self.ensure_preview()
        for _ in range(count):
            before = self.preview_src()
            self._click_text("换配色")
            self.page.wait_for_timeout(1200)
            self._wait_until_not_contains("加载中", 60)
            self._wait_preview_maybe_changed(before, tolerant=True)

    def preview_src(self) -> str:
        for selector in ("img.swiper-img", ".left-container img", "img"):
            locator = self.page.locator(selector)
            if locator.count():
                src = locator.first.get_attribute("src")
                if src and src.startswith("http"):
                    return src
        raise XhsAutomationError("未找到当前预览图地址")

    def current_theme(self) -> str | None:
        self.ensure_preview()
        theme = self.page.evaluate(
            """
            () => {
              for (const item of Array.from(document.querySelectorAll('.cover-item-container'))) {
                const text = (item.innerText || '').replace(/\\s+/g, ' ').trim();
                if (text.includes('换配色')) {
                  return text.replace('换配色', '').trim() || null;
                }
              }
              return null;
            }
            """
        )
        return theme

    def list_themes(self) -> list[str]:
        self.ensure_preview()
        unique = []
        for _ in range(8):
            names = self.page.evaluate(
                """
                () => Array.from(document.querySelectorAll('.cover-name'))
                  .map(el => (el.innerText || '').replace(/\\s+/g, ' ').trim())
                  .filter(Boolean)
                """
            )
            for name in names:
                if name not in unique:
                    unique.append(name)
            if "- 没有更多模板啦 -" in self.body_text():
                break
            self._scroll_theme_panel()
        return unique

    def capture_current_preview(self, download_path: Path | None = None) -> dict[str, Any]:
        self.ensure_preview()
        image_url = self.preview_src()
        theme = self.current_theme()
        path = self._download_image(image_url, theme or "default", download_path=download_path)
        return {
            "state": self.page_state(),
            "theme": theme,
            "image_url": image_url,
            "download_path": str(path),
            "page_url": self.page.url,
        }

    def _download_image(self, image_url: str, theme: str, download_path: Path | None = None) -> Path:
        if download_path is None:
            safe_theme = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff_-]+", "-", theme).strip("-") or "image"
            stamp = time.strftime("%Y%m%d-%H%M%S")
            path = self.output_dir / f"{stamp}-{safe_theme}.jpg"
        else:
            path = download_path
            path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(image_url, path)
        return path

    def _click_text(self, text: str) -> None:
        locator = self.page.get_by_text(text, exact=True)
        if locator.count() < 1:
            raise XhsAutomationError(f"未找到元素: {text}")
        locator.first.scroll_into_view_if_needed(timeout=10000)
        self._wait_loading_overlay_gone()
        try:
            locator.first.click(timeout=5000)
        except PlaywrightError:
            self._wait_loading_overlay_gone()
            locator = self.page.get_by_text(text, exact=True)
            locator.first.scroll_into_view_if_needed(timeout=10000)
            locator.first.click(timeout=10000)

    def _fill_text_prompt(self, text: str) -> None:
        self.page.wait_for_selector("[contenteditable='true']", timeout=15000)
        locator = self.page.locator("[contenteditable='true']").first
        locator.evaluate("(el) => el.focus()")
        self.page.keyboard.press("Meta+A")
        self.page.keyboard.insert_text(text)
        self.page.wait_for_timeout(500)

    def _maybe_close_popup(self) -> None:
        for label in ("关闭", "取消", "知道了", "我知道了"):
            locator = self.page.get_by_text(label, exact=True)
            if locator.count():
                try:
                    locator.first.click(timeout=2000)
                    return
                except PlaywrightError:
                    pass

    def _find_theme(self, theme: str) -> bool:
        for _ in range(8):
            locator = self.page.get_by_text(theme, exact=True)
            if locator.count():
                locator.first.scroll_into_view_if_needed(timeout=10000)
                locator.first.click(timeout=10000)
                return True
            self._scroll_theme_panel()
        return False

    def _return_from_preview(self) -> None:
        try:
            self.page.go_back(wait_until="domcontentloaded", timeout=10000)
        except PlaywrightError:
            pass

    def _wait_until_not_contains(self, text: str, timeout_seconds: int) -> None:
        try:
            self.page.wait_for_function(
                "(needle) => !document.body.innerText.includes(needle)",
                arg=text,
                timeout=timeout_seconds * 1000,
            )
        except PlaywrightError:
            raise XhsAutomationError(f"等待页面移除文本超时: {text}")

    def _wait_preview_maybe_changed(self, old_src: str, tolerant: bool = False) -> None:
        try:
            self.page.wait_for_function(
                """
                (oldSrc) => {
                  const img = document.querySelector('img.swiper-img') || document.querySelector('.left-container img') || document.querySelector('img');
                  return !!img && !!img.src && img.src !== oldSrc;
                }
                """,
                arg=old_src,
                timeout=30000,
            )
        except PlaywrightError:
            if not tolerant:
                self.page.wait_for_timeout(1500)

    def _wait_loading_overlay_gone(self) -> None:
        try:
            self.page.wait_for_selector(".d-v-loading", state="hidden", timeout=15000)
        except PlaywrightError:
            self.page.wait_for_timeout(1000)

    def _scroll_theme_panel(self) -> None:
        size = self.page.evaluate("() => ({width: window.innerWidth, height: window.innerHeight})")
        x = max(int(size["width"]) - 120, 0)
        y = max(int(size["height"] * 0.5), 0)
        self.page.mouse.move(x, y)
        self.page.mouse.wheel(0, 1000)
        self.page.wait_for_timeout(500)


def new_job_id() -> str:
    return time.strftime("xhs-%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]


def record_from_result(job_id: str, text: str, cdp_url: str, result: dict[str, Any]) -> JobRecord:
    timestamp = now_ts()
    return JobRecord(
        job_id=job_id,
        text=text,
        theme=result.get("theme"),
        image_url=result.get("image_url"),
        download_path=result.get("download_path"),
        page_state=result.get("state", "unknown"),
        page_url=result.get("page_url", ""),
        cdp_url=cdp_url,
        created_at=timestamp,
        updated_at=timestamp,
    )


def update_record(record: JobRecord, result: dict[str, Any]) -> JobRecord:
    record.theme = result.get("theme")
    record.image_url = result.get("image_url")
    record.download_path = result.get("download_path")
    record.page_state = result.get("state", record.page_state)
    record.page_url = result.get("page_url", record.page_url)
    record.updated_at = now_ts()
    return record


def safe_slug(text: str) -> str:
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff_-]+", "-", text).strip("-") or "image"


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def build_catalog_overview(catalog_dir: Path, items: list[CatalogItem], title: str) -> Path:
    if not items:
        raise XhsAutomationError("没有可用于拼版的主题图片")

    images = []
    for item in items:
        image = Image.open(item.image_path).convert("RGB")
        images.append((item, image))

    columns = 4
    card_width = 360
    image_height = 480
    label_height = 64
    padding = 24
    title_height = 90
    rows = math.ceil(len(images) / columns)
    canvas_width = columns * card_width + (columns + 1) * padding
    canvas_height = title_height + rows * (image_height + label_height) + (rows + 1) * padding

    canvas = Image.new("RGB", (canvas_width, canvas_height), color=(246, 244, 238))
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(36)
    label_font = load_font(24)
    draw.text((padding, 28), title, fill=(33, 33, 33), font=title_font)

    for index, (item, image) in enumerate(images):
        row = index // columns
        col = index % columns
        x = padding + col * (card_width + padding)
        y = title_height + padding + row * (image_height + label_height)
        thumb = image.copy()
        thumb.thumbnail((card_width, image_height), Image.Resampling.LANCZOS)
        image_x = x + (card_width - thumb.width) // 2
        image_y = y + (image_height - thumb.height) // 2
        draw.rounded_rectangle(
            [x, y, x + card_width, y + image_height + label_height - 8],
            radius=18,
            fill=(255, 255, 255),
            outline=(228, 224, 215),
            width=2,
        )
        canvas.paste(thumb, (image_x, image_y))
        text_y = y + image_height + 12
        draw.text((x + 16, text_y), item.theme, fill=(44, 44, 44), font=label_font)

    overview_path = catalog_dir / DEFAULT_CATALOG_OVERVIEW
    canvas.save(overview_path, quality=92)
    return overview_path


def generate_theme_catalog(session: BrowserSession, text: str, catalog_dir: Path, timeout_seconds: int) -> dict[str, Any]:
    images_dir = catalog_dir / DEFAULT_CATALOG_IMAGES_DIRNAME
    images_dir.mkdir(parents=True, exist_ok=True)

    session.ensure_logged_in()
    session.create_image(text, None, 0, timeout_seconds)
    themes = session.list_themes()
    items: list[CatalogItem] = []

    for theme in themes:
        session.apply_theme(theme)
        filename = f"{safe_slug(theme)}.jpg"
        target_path = images_dir / filename
        preview = session.capture_current_preview(download_path=target_path)
        items.append(
            CatalogItem(
                theme=theme,
                image_path=str(target_path),
                image_url=preview["image_url"],
            )
        )

    overview_path = build_catalog_overview(catalog_dir, items, f"小红书主题预览 · {text}")
    manifest = {
        "ok": True,
        "text": text,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "page_url": session.page.url,
        "overview_path": DEFAULT_CATALOG_OVERVIEW,
        "images_dir": DEFAULT_CATALOG_IMAGES_DIRNAME,
        "themes": [
            {
                "theme": item.theme,
                "image_path": f"{DEFAULT_CATALOG_IMAGES_DIRNAME}/{Path(item.image_path).name}",
                "image_url": item.image_url,
            }
            for item in items
        ],
    }
    manifest_path = catalog_dir / DEFAULT_CATALOG_MANIFEST
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "ok": True,
        "message": "主题样例生成成功",
        "text": text,
        "themes_count": len(items),
        "overview_path": str(overview_path),
        "manifest_path": str(manifest_path),
        "images_dir": str(images_dir),
        "themes": [item.theme for item in items],
    }


def handle_create(args: argparse.Namespace, store: JobStore, output_dir: Path) -> dict[str, Any]:
    with BrowserSession(args, output_dir) as session:
        session.ensure_logged_in()
        result = session.create_image(args.text, args.theme, args.recolor, args.timeout)
        job_id = new_job_id()
        record = record_from_result(job_id, args.text, session.cdp_url, result)
        store.save(record)
        return {"ok": True, "job_id": job_id, "message": "创建成功", **result}


def handle_update(args: argparse.Namespace, store: JobStore, output_dir: Path) -> dict[str, Any]:
    record = store.load(args.job_id)
    with BrowserSession(args, output_dir) as session:
        session.ensure_preview()
        if args.theme:
            session.apply_theme(args.theme)
        if args.recolor:
            session.apply_recolor(args.recolor)
        result = session.capture_current_preview()
        updated = update_record(record, result)
        store.save(updated)
        return {"ok": True, "job_id": record.job_id, "message": "更新成功", **result}


def handle_download(args: argparse.Namespace, store: JobStore, output_dir: Path) -> dict[str, Any]:
    record = store.load(args.job_id)
    with BrowserSession(args, output_dir) as session:
        result = session.capture_current_preview()
        updated = update_record(record, result)
        store.save(updated)
        return {"ok": True, "job_id": record.job_id, "message": "下载成功", **result}


def handle_status(args: argparse.Namespace, store: JobStore, output_dir: Path) -> dict[str, Any]:
    payload: dict[str, Any] = {"ok": True}
    if args.job_id:
        record = store.load(args.job_id)
        payload["job"] = asdict(record)
    with BrowserSession(args, output_dir) as session:
        session.ensure_logged_in()
        payload["current"] = {
            "state": session.page_state(),
            "page_url": session.page.url,
            "theme": session.current_theme() if session.page_state() == "preview" else None,
            "themes": session.list_themes() if session.page_state() == "preview" else [],
        }
    return payload


def handle_themes(args: argparse.Namespace, store: JobStore, output_dir: Path) -> dict[str, Any]:
    with BrowserSession(args, output_dir) as session:
        session.ensure_preview()
        return {
            "ok": True,
            "state": session.page_state(),
            "theme": session.current_theme(),
            "themes": session.list_themes(),
            "page_url": session.page.url,
        }


def handle_catalog(args: argparse.Namespace, store: JobStore, output_dir: Path) -> dict[str, Any]:
    catalog_dir = Path(args.catalog_dir).expanduser().resolve()
    with BrowserSession(args, output_dir) as session:
        return generate_theme_catalog(session, args.text, catalog_dir, args.timeout)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    base_dir = Path(args.base_dir).expanduser().resolve()
    output_dir = base_dir / DEFAULT_OUTPUT_DIRNAME
    output_dir.mkdir(parents=True, exist_ok=True)
    store = JobStore(base_dir)

    try:
        if args.command == "create":
            payload = handle_create(args, store, output_dir)
        elif args.command == "update":
            payload = handle_update(args, store, output_dir)
        elif args.command == "download":
            payload = handle_download(args, store, output_dir)
        elif args.command == "status":
            payload = handle_status(args, store, output_dir)
        elif args.command == "themes":
            payload = handle_themes(args, store, output_dir)
        elif args.command == "catalog":
            payload = handle_catalog(args, store, output_dir)
        else:  # pragma: no cover
            raise XhsAutomationError(f"未知命令: {args.command}")
        json_print(payload)
        return 0
    except (XhsAutomationError, ValueError, urllib.error.URLError) as exc:
        json_print({"ok": False, "message": str(exc)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
