---
name: feishu-card
description: Use when 用户提到“飞书卡片”“交互卡片”“按钮消息”“interactive 消息”“卡片回调”“给某个 open_id 发卡片”这类场景，需要构建、发送或更新飞书 IM 交互卡片。
---

# Feishu Card

构建、发送和更新飞书交互卡片。

优先保持主技能简洁；只有当任务明确需要卡片样例时，再读取 `references/` 下的 JSON 模板。

**Base URL**: `https://open.feishu.cn/open-apis/im/v1`

## 何时使用

当用户有这些诉求时直接用：

- 给某个 `open_id`、`chat_id` 或用户发送交互卡片
- 构建带按钮、备注、分割线的飞书消息卡片
- 把 JSON 卡片作为 `interactive` 消息发出去
- 用户点击卡片按钮后，需要根据回调里的 `action.value` 做处理
- 已经发过卡片，现在要更新同一条消息而不是重发

## Token 获取

本 skill 默认复用 [`feishu-user-auth`](../feishu-user-auth/SKILL.md) 提供的系统 token 能力。

优先顺序如下：

1. 如果 PATH 里已经有 `feishu-auth`，直接执行：

```bash
feishu-auth system-token
```

2. 如果没有 PATH 命令，就执行安装目录里的 bin：

```bash
./.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
```

全局安装时：

```bash
~/.agents/skills/feishu-user-auth/bin/feishu-auth.js system-token
```

如果返回的是 JSON，取其中的 `accessToken` 作为 `Authorization: Bearer <token>`。

## 发送卡片

```
POST /open-apis/im/v1/messages?receive_id_type=open_id
POST /open-apis/im/v1/messages?receive_id_type=chat_id
```

请求体：

```json
{
  "receive_id": "ou_xxx",
  "msg_type": "interactive",
  "content": "{\"config\":{\"wide_screen_mode\":true},\"header\":{\"title\":{\"tag\":\"plain_text\",\"content\":\"标题\"}},\"elements\":[...]}"
}
```

关键点：

- `msg_type` 必须是 `interactive`
- `content` 必须是“字符串化后的 JSON”，不是对象
- `receive_id_type` 要和 `receive_id` 的类型一致

## 卡片结构

```json
{
  "config": { "wide_screen_mode": true },
  "header": {
    "title": { "tag": "plain_text", "content": "标题" },
    "template": "blue"
  },
  "elements": [
    {
      "tag": "div",
      "text": { "tag": "lark_md", "content": "**加粗内容**" }
    },
    {
      "tag": "action",
      "actions": [
        {
          "tag": "button",
          "text": { "tag": "plain_text", "content": "确认" },
          "type": "primary",
          "value": { "action": "confirm" }
        }
      ]
    }
  ]
}
```

常用元素：

- `div`: 文本块
- `hr`: 分割线
- `action`: 按钮区
- `note`: 备注区

## 回调与更新

用户点击按钮后，回调事件里通常关注：

```json
{
  "type": "card.action.trigger",
  "action": {
    "value": {
      "action": "confirm",
      "data": "extra_info"
    }
  }
}
```

处理完回调后，可更新原卡片消息：

```
PATCH /open-apis/im/v1/messages/{message_id}
```

## 参考模板

仅当任务需要现成模板时，再读取这些文件：

- `references/card-alert.json`
- `references/card-morning-briefing.json`
- `references/card-skill-test.json`

## 最佳实践

1. 按钮必须带 `value`，否则回调难以识别具体动作。
2. 需要改状态时优先更新原卡片，避免重复刷屏。
3. 危险操作按钮用 `danger` 类型。
4. 发卡片前先确认 `receive_id_type` 和 `receive_id` 是否匹配。
5. 如果 `feishu-auth system-token` 返回 JSON，不要把整个 JSON 原样塞进请求头，只取 `accessToken`。
