# shuliu-skills

[English](./README.md) | 中文

参考 `jimliu/baoyu-skills` 形式构建的本地技能市场。

## 安装

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
```

## 更新技能

当仓库中的技能更新后，重新执行安装命令即可拉取最新版本：

```bash
npx skills add https://github.com/shuliuzhenhua-sys/shuliu-skills --skill banana-proxy
```

## 可用插件

| 插件 | 说明 | 包含技能 |
|------|------|----------|
| **image-generation-skills** | 图片生成后端 | [banana-proxy](#banana-proxy) |

## 可用技能

### banana-proxy

通过 Banana 代理端点调用 Gemini 生图，仅单一提供商。

```bash
npx -y bun skills/banana-proxy/scripts/main.ts --prompt "一只猫" --image out.png
```

环境变量：

- `BANANA_PROXY_API_KEY`（必填）
