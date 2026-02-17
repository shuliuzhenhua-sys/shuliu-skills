# shuliu-skills

[English](./README.md) | 中文

参考 `jimliu/baoyu-skills` 形式构建的本地技能市场。

## 安装

```bash
npx skills add ./
```

或者在 Claude Code 中注册插件市场：

```bash
/plugin marketplace add .
```

## 更新目录

本地技能更新后，按以下步骤刷新市场目录：

1. 在 Claude Code 运行 `/plugin`
2. 切换到 **Marketplaces**
3. 选择 **shuliu-skills**
4. 点击 **Update marketplace**

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
