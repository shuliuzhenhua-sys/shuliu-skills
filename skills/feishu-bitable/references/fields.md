# 多维表格字段参考

仅在涉及字段查询、字段创建、字段更新、字段删除、字段类型选择、`property` 结构判断时读取本文件。

## 字段定义速查

字段定义是 `field` 对象，不等于记录写入时 `fields` 里的值格式。根据飞书官方“字段编辑指南”，字段结构核心如下：

```json
{
  "field_id": "fldYWaldeW",
  "field_name": "文本",
  "type": 1,
  "description": "字段的描述",
  "is_primary": true,
  "property": null,
  "ui_type": "Text",
  "is_hidden": false
}
```

**索引字段限制**：
- `is_primary: true` 表示索引字段
- 索引字段不能删除、移动或隐藏
- 索引字段仅支持 `type` 为 `1 / 2 / 5 / 13 / 15 / 20 / 22`

**字段枚举（按官方文档修正）**：

| type | ui_type | 中文名 | property 概要 | 备注 |
|------|---------|--------|---------------|------|
| 1 | Text | 文本 | `null` | 默认文本字段 |
| 1 | Barcode | 条码 | `allowed_edit_modes.scan/manual` | 需显式声明 `ui_type` |
| 1 | Email | 邮箱 | `null` | 需显式声明 `ui_type` |
| 2 | Number | 数字 | `formatter` | 默认数字字段 |
| 2 | Progress | 进度 | `formatter`、`range_customize`、`min`、`max` | 需显式声明 `ui_type` |
| 2 | Currency | 货币 | `formatter`、`currency_code` | 需显式声明 `ui_type` |
| 2 | Rating | 评分 | `formatter="0"`、`rating.symbol`、`min`、`max` | 需显式声明 `ui_type` |
| 3 | SingleSelect | 单选 | `options[]` | 更新时按完整选项集覆盖 |
| 4 | MultiSelect | 多选 | `options[]` | 更新时按完整选项集覆盖 |
| 5 | DateTime | 日期 | `date_formatter`、`auto_fill` | `auto_fill` 可自动填创建时间 |
| 7 | Checkbox | 复选框 | `null` | - |
| 11 | User | 人员 | `multiple` | 是否允许多成员 |
| 13 | Phone | 电话号码 | `null` | 官方名称为“电话号码” |
| 15 | Url | 超链接 | `null` | - |
| 17 | Attachment | 附件 | `null` | - |
| 18 | SingleLink | 单向关联 | `multiple`、`table_id` | 关联目标表必填 |
| 19 | Lookup | 查找引用 | `null` | 会出现在字段定义/读取结果中，但 `create`/`update` 接口不支持新增或更新 |
| 20 | Formula | 公式 | `formatter`、`formula_expression` | 支持通过字段接口新增/更新 |
| 21 | DuplexLink | 双向关联 | `multiple`、`table_id`、`back_field_name` | 会在关联表创建反向字段 |
| 22 | Location | 地理位置 | `location.input_type` | `only_mobile` / `not_limit` |
| 23 | GroupChat | 群组 | `multiple` | 是否允许多个群组 |
| 24 | Stage | 流程 | - | 仅支持读接口，不支持写接口新增/编辑 |
| 1001 | CreatedTime | 创建时间 | `date_formatter` | 支持通过字段接口新增/更新 |
| 1002 | ModifiedTime | 最后更新时间 | `date_formatter` | 支持通过字段接口新增/更新 |
| 1003 | CreatedUser | 创建人 | `null` | - |
| 1004 | ModifiedUser | 修改人 | `null` | - |
| 1005 | AutoNumber | 自动编号 | `auto_serial.type`、`reformat_existing_records`、`options[]` | 支持自定义编号和自增编号 |
| 3001 | Button | 按钮 | - | 仅支持读接口，不支持写接口新增/编辑 |

## 字段的属性 `property`

`property` 是字段级配置，不同 `type / ui_type` 的结构不同。`guide.md` 主要描述字段模型本身；如果和 `create.md`、`update.md` 的可写约束有冲突，实际调用时以接口文档为准。

**`property` 为 `null` 的字段**：
- `1/Text`
- `1/Email`
- `7/Checkbox`
- `13/Phone`
- `15/Url`
- `17/Attachment`
- `19/Lookup`
- `1003/CreatedUser`
- `1004/ModifiedUser`

**`property` 结构速查**：

| 字段 | `property` 结构 | 关键约束 |
|------|------------------|----------|
| `1/Barcode` | `{"allowed_edit_modes":{"manual":true,"scan":true}}` | `manual`、`scan` 默认都可开 |
| `2/Number` | `{"formatter":"0.00"}` | `formatter` 可控制整数、小数、千分位、百分比、货币样式 |
| `2/Currency` | `{"formatter":"0.00","currency_code":"CNY"}` | `formatter`、`currency_code` 必填 |
| `2/Progress` | `{"formatter":"0.00%","range_customize":true,"min":0,"max":100}` | `range_customize=true` 时 `min/max` 必填 |
| `2/Rating` | `{"formatter":"0","min":0,"max":5,"rating":{"symbol":"star"}}` | `formatter` 固定为 `"0"`；`min/max` 必填 |
| `3/SingleSelect` | `{"options":[{"name":"A","color":0}]}` | 更新时按完整选项集覆盖；漏传即删除 |
| `4/MultiSelect` | `{"options":[{"name":"A","color":0}]}` | 更新时按完整选项集覆盖；漏传即删除 |
| `5/DateTime` | `{"date_formatter":"yyyy/MM/dd","auto_fill":false}` | `auto_fill` 仅日期字段有 |
| `11/User` | `{"multiple":true}` | 控制是否允许多成员 |
| `18/SingleLink` | `{"table_id":"tblXXX","multiple":true}` | `table_id` 必填 |
| `21/DuplexLink` | `{"table_id":"tblXXX","multiple":true,"back_field_name":"反向关联"}` | `table_id` 必填；可指定反向字段名 |
| `20/Formula` | `{"formatter":"0.00","formula_expression":"[营收]-[成本]"}` | 公式表达式和展示格式都在这里 |
| `22/Location` | `{"location":{"input_type":"not_limit"}}` | `input_type` 取 `only_mobile` 或 `not_limit` |
| `23/GroupChat` | `{"multiple":true}` | 控制是否允许多个群组 |
| `1001/CreatedTime` | `{"date_formatter":"yyyy/MM/dd"}` | 仅控制显示格式 |
| `1002/ModifiedTime` | `{"date_formatter":"yyyy/MM/dd"}` | 仅控制显示格式 |
| `1005/AutoNumber` | `{"auto_serial":{"type":"custom","reformat_existing_records":true,"options":[...]}}` | 支持 `custom` 和 `auto_increment_number` |

**自动编号 `auto_serial.options[]` 规则**：
- `{"type":"system_number","value":"3"}`: 自增数字位数，范围 `1-9`
- `{"type":"fixed_text","value":"PO"}`: 固定文本，最长 20 字符
- `{"type":"created_time","value":"yyyyMMdd"}`: 基于创建时间拼接日期片段

**日期/数字类字段最容易混淆的点**：
- `Number` 的 `formatter` 可以做普通数字格式化
- `Currency` 除了 `formatter` 还必须带 `currency_code`
- `Progress` 的 `formatter` 可以是数值或百分比格式
- `Rating` 的 `formatter` 固定为 `"0"`，图标走 `rating.symbol`
- `DateTime` 才有 `auto_fill`
- `CreatedTime` 和 `ModifiedTime` 只有 `date_formatter`

**几个容易记错的点**：
- “字段定义”看 `type / ui_type / property`，不是记录值的 JSON 结构
- `公式`、`创建时间`、`最后更新时间`、`自动编号` 都支持通过字段写接口新增或更新
- `查找引用(type=19)` 会出现在字段指南和字段列表里，但新增/更新字段接口都明确不支持
- 真正不能通过新增/更新字段接口直接维护的是 `查找引用(type=19)`、`流程(type=24)` 和 `按钮(type=3001)`
- `单选/多选` 的字段更新是全量语义，没带上的选项会被删除
- `查找引用(type=19)`、`创建人(type=1003)`、`修改人(type=1004)` 的 `property` 为 `null`

## 字段管理

| API | 端点 | 说明 |
|-----|------|------|
| 获取字段列表 | `GET .../fields` | 返回 `field_id`、`field_name`、`type`、`ui_type`、`property`、`is_primary`、`is_hidden`、`description` |
| 新增字段 | `POST .../fields` | 按官方 `type / ui_type / property` 结构创建 |
| 更新字段 | `PUT .../fields/{field_id}` | 更新单选/多选时需传完整 `property.options` |
| 删除字段 | `DELETE .../fields/{field_id}` | - |

**常用字段定义示例**：

条码字段：
```json
{
  "field_name": "条码",
  "type": 1,
  "ui_type": "Barcode",
  "property": {
    "allowed_edit_modes": {
      "scan": true,
      "manual": true
    }
  }
}
```

进度字段：
```json
{
  "field_name": "进度",
  "type": 2,
  "ui_type": "Progress",
  "property": {
    "formatter": "0.00%",
    "range_customize": true,
    "min": 0.1,
    "max": 100
  }
}
```

公式字段：
```json
{
  "type": 20,
  "field_name": "利润",
  "property": {
    "formatter": "0.00",
    "formula_expression": "[营收]-[成本]"
  }
}
```

自动编号字段：
```json
{
  "field_name": "自定义编号",
  "type": 1005,
  "property": {
    "auto_serial": {
      "type": "custom",
      "reformat_existing_records": true,
      "options": [
        {"type": "system_number", "value": "3"},
        {"type": "fixed_text", "value": "PO"},
        {"type": "created_time", "value": "yyyyMMdd"}
      ]
    }
  }
}
```

双向关联字段：
```json
{
  "field_name": "关联客户",
  "type": 21,
  "property": {
    "table_id": "tblXXX",
    "multiple": true,
    "back_field_name": "客户反向关联"
  }
}
```

**字段更新注意事项**：
- 不是所有 `type` 都能直接创建；具体仍以对应接口的可选值为准
- `type=19(Lookup)`、`type=24(Stage)` 与 `type=3001(Button)` 不要走新增/更新字段接口
- `单选/多选` 更新时是覆盖式，不是增量 merge
- 如果你的目标是“往记录里写值”，优先查 records 接口文档，不要把这里的 `property` 当作记录值格式
