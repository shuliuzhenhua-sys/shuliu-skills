# shuliu-skills

[English](./README.md) | 中文

参考 `jimliu/baoyu-skills` 形式构建的本地技能市场。

## 安装

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
```

## 更新技能

当仓库中的技能更新后，重新执行安装命令即可拉取最新版本：

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill ecommerce-images
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill douyin-share-info
```

## 可用插件

| 插件 | 说明 | 包含技能 |
|------|------|----------|
| **image-generation-skills** | 图片生成后端 | [banana-proxy](#banana-proxy)、[ecommerce-images](#ecommerce-images) |
| **douyin-tools** | 抖音分享链接解析工具 | [douyin-share-info](#douyin-share-info) |

## 可用技能

### banana-proxy

通过 Banana 代理端点调用 Gemini 生图。

```bash
npx -y bun skills/banana-proxy/scripts/main.ts --prompt "一只猫" --image out.png
```

环境变量：

- `LNAPI_KEY`（必填）

### douyin-share-info

通过 TikHub Douyin Web API 根据抖音分享链接获取作品基础信息，并提取封面/音频/视频的首个可用地址。

```bash
npx -y bun skills/douyin-share-info/scripts/main.ts --share-url "https://v.douyin.com/xxxx/" --json
```

环境变量：

- `TIKHUB_API_KEY`（必填）

### ecommerce-images

用于电商商品主图与详情图生成的工作流技能，输入用户提供的商品原图。

- 支持模式：`main` / `detail` / `both`
- 详情图为整套图，执行前会先询问用户需要几张
- 默认调用 `banana-proxy`，失败自动回退 `baoyu-image-gen`
- 支持中文风格名（如“白底极简主图”“参数规格详情图”）

以自然语言触发即可，例如：
- “基于 `/path/product.png` 生成主图和详情图”
- “生成详情图，做 5 张，参数规格风格”
