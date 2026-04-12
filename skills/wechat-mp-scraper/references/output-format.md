# 输出格式说明

## `urls.json`

核心字段：

- `source_url`
- `fetched_at`
- `title`
- `output_dir`
- `counts`
- `resources`
- `animation`

其中：

- `resources.images`：正文中的 `src`/`data-src` 图片
- `resources.background_images`：样式里的背景图
- `animation.keywords_found`：命中的动画关键词
- `animation.snippet_count`：命中的片段数量

## `report.md`

建议包含：

1. 抓取状态
2. 标题与来源
3. 资源统计
4. 动画判断
5. 关键本地文件路径
6. 关键素材 URL 示例

## `content.md`

面向人阅读的正文导出，至少包括：

- 标题
- 作者
- 发布时间
- 摘要
- 正文段落
- 图片引用

## `content.json`

面向程序处理的正文导出，核心字段：

- `title`
- `author`
- `publish_time`
- `digest`
- `blocks`

其中 `blocks` 按正文顺序排列，块类型至少包括：

- `text`
- `image`

## `snippets/animation-snippets.txt`

面向快速阅读，只放命中的动画相关上下文。

## `snippets/matched-blocks.html`

保留原始 HTML 片段，方便进一步人工检查。
