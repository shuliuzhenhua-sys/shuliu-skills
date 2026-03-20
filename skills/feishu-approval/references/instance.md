# 审批实例速查

本页用于回答审批实例的 `create/get`，以及实例 `form` 该怎么传值。

## 基础概念

- 审批实例基于审批定义创建
- 创建实例前，必须先有 `approval_code`
- 实例创建成功后会返回 `instance_code`

## 创建审批实例最小骨架

```json
{
  "approval_code": "APPROVAL_CODE",
  "open_id": "ou_xxx",
  "form": "[{\"id\":\"reason\",\"type\":\"input\",\"value\":\"测试\"}]"
}
```

## 实例请求里的关键字段

### `approval_code`

- 必填
- 指向已有审批定义

### `user_id` / `open_id`

- 二选一
- 如果都传，`user_id` 优先

### `form`

- 必填
- 是 JSON 数组压缩转义后的字符串
- 数组内元素表示每个控件的“值”

### 自选审批人 / 抄送人

如果审批定义里的某个节点是发起人自选，则实例创建时需要补：

- `node_approver_user_id_list`
- `node_approver_open_id_list`
- `node_cc_user_id_list`
- `node_cc_open_id_list`

这些字段里的 `key` 可以是：

- `node_id`
- `custom_node_id`

## 常见控件值结构

### 单行文本 / 多行文本

```json
{
  "id": "reason",
  "type": "input",
  "value": "测试"
}
```

### 数字 / 金额

```json
{
  "id": "amount",
  "type": "number",
  "value": 1234.56
}
```

### 日期

```json
{
  "id": "apply_time",
  "type": "date",
  "value": "2019-10-01T08:12:01+08:00"
}
```

### 日期区间

```json
{
  "id": "period",
  "type": "dateInterval",
  "value": {
    "start": "2019-10-01T08:12:01+08:00",
    "end": "2019-10-02T08:12:01+08:00",
    "interval": 2.0
  }
}
```

### 联系人

```json
{
  "id": "contact_user",
  "type": "contact",
  "value": ["f8ca557e"],
  "open_ids": ["ou_12345"]
}
```

### 多选

```json
{
  "id": "tags",
  "type": "checkboxV2",
  "value": ["option_1"]
}
```

如果定义里配置的是外部选项，这里的 `value` 往往是选项 ID，不是显示文本。

### 明细 / 表格

```json
{
  "id": "detail_list",
  "type": "fieldList",
  "value": [
    [
      {
        "id": "detail_item_type",
        "type": "checkbox",
        "value": ["item_a"]
      }
    ]
  ]
}
```

## 查询审批实例

查询实例详情时重点看：

- `status`
- `form`
- `task_list`
- `comment_list`
- `timeline`
- `approval_code`
- `instance_code`

常见状态：

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELED`
- `DELETED`

## 高频坑

- 直接把定义阶段的控件配置塞到实例 `form` 里
- `form` 没转成字符串
- 日期控件把定义里的格式字符串和实例里的 RFC3339 时间混了
- 自选审批节点没补 `node_approver_*`
- 多选 / 外部选项提交的是文本而不是 ID
