# 审批定义表单控件

本页专门回答审批定义里的 `form.form_content` 怎么写。

## 先记住这件事

审批定义里的表单是控件定义，不是用户填写值。

- 定义阶段写的是控件结构
- 实例阶段写的是控件值

## 通用字段

所有控件都先看这几个字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 控件 ID，同一审批定义内不可重复 |
| `name` | string | 是 | 国际化文案 key，必须以 `@i18n@` 开头 |
| `type` | string | 是 | 控件类型 |
| `required` | boolean | 是 | 是否必填 |
| `custom_id` | string | 否 | 自定义控件 ID |
| `printable` | boolean | 否 | 是否可打印 |

## API 不支持或不完整支持的控件

如果用户要用审批定义 API 新建下面这些控件，直接提醒不支持或不建议：

- `formula`
- `mutableGroup`
- `serialNumber`
- `shiftGroupV2`
- `workGroup`（仅支持查看）
- `leaveGroup`（仅支持查看）
- `outGroup`（仅支持查看）
- `tripGroup`

## 常用控件模板

### 单行文本 `input`

```json
{
  "id": "widget_input",
  "name": "@i18n@widget_input",
  "type": "input",
  "required": true
}
```

### 多行文本 `textarea`

```json
{
  "id": "widget_textarea",
  "name": "@i18n@widget_textarea",
  "type": "textarea",
  "required": true
}
```

### 数字 `number`

```json
{
  "id": "widget_number",
  "name": "@i18n@widget_number",
  "type": "number",
  "required": true
}
```

### 图片 `image`

```json
{
  "id": "widget_image",
  "name": "@i18n@widget_image",
  "type": "image",
  "required": false
}
```

### 附件 `attachmentV2`

```json
{
  "id": "widget_attachment",
  "name": "@i18n@widget_attachment",
  "type": "attachmentV2",
  "required": false
}
```

### 金额 `amount`

```json
{
  "id": "widget_amount",
  "name": "@i18n@widget_amount",
  "type": "amount",
  "required": true,
  "value": "CNY",
  "option": {
    "currencyRange": ["CNY", "USD"],
    "isCapital": true,
    "isThousandSeparator": true,
    "keepDecimalPlaces": 2
  }
}
```

注意点：

- `value` 是默认币种，不是金额值
- `option.currencyRange` 必填

### 说明 `text`

```json
{
  "id": "widget_text",
  "name": "@i18n@widget_text_name",
  "type": "text",
  "required": false,
  "value": "@i18n@widget_text_value"
}
```

注意点：

- `value` 也是 `@i18n@` key

### 单选 `radioV2`

```json
{
  "id": "widget_radio",
  "name": "@i18n@widget_radio",
  "type": "radioV2",
  "required": true,
  "value": [
    {
      "key": "option_1",
      "text": "@i18n@option_1"
    },
    {
      "key": "option_2",
      "text": "@i18n@option_2"
    }
  ]
}
```

### 多选 `checkboxV2`

```json
{
  "id": "widget_checkbox",
  "name": "@i18n@widget_checkbox",
  "type": "checkboxV2",
  "required": false,
  "value": [
    {
      "key": "option_1",
      "text": "@i18n@option_1"
    },
    {
      "key": "option_2",
      "text": "@i18n@option_2"
    }
  ]
}
```

### 日期 `date`

```json
{
  "id": "widget_date",
  "name": "@i18n@widget_date",
  "type": "date",
  "required": true,
  "value": "YYYY-MM-DD hh:mm"
}
```

可选格式：

- `YYYY-MM-DD`
- `YYYY-MM-DD a`
- `YYYY-MM-DD hh:mm`

### 日期区间 `dateInterval`

```json
{
  "id": "widget_date_interval",
  "name": "@i18n@widget_date_interval",
  "type": "dateInterval",
  "required": true,
  "value": {
    "format": "YYYY-MM-DD",
    "intervalAllowModify": false
  }
}
```

### 关联审批 `connect`

```json
{
  "id": "widget_connect",
  "name": "@i18n@widget_connect",
  "type": "connect",
  "required": false,
  "value": ["APPROVAL_CODE_A", "APPROVAL_CODE_B"]
}
```

### 联系人 `contact`

```json
{
  "id": "widget_contact",
  "name": "@i18n@widget_contact",
  "type": "contact",
  "required": true,
  "value": {
    "ignore": true,
    "multi": false
  }
}
```

### 地址 `address`

```json
{
  "id": "widget_address",
  "name": "@i18n@widget_address",
  "type": "address",
  "required": false,
  "value": {
    "enableDetailAddress": true,
    "requiredDetailAddress": false,
    "preLocating": false
  }
}
```

## 外部选项版单选 / 多选

单选、多选如果改为外部选项模式，固定选项 `value` 可以为空数组，然后补 `externalData`：

```json
{
  "id": "widget_external_radio",
  "name": "@i18n@widget_external_radio",
  "type": "radioV2",
  "required": true,
  "value": [],
  "externalData": {
    "externalUrl": "https://example.com/approval/options",
    "token": "token-value",
    "key": "encrypt-key",
    "linkageConfigs": [
      {
        "linkageWidgetID": "widget_department",
        "key": "department_code",
        "value": "example"
      }
    ],
    "externalDataLinkage": true
  }
}
```

更详细的外部选项请求和返回格式，转去看 `external-options.md`。

## 最小可用 form_content 示例

```json
[
  {
    "id": "reason",
    "name": "@i18n@reason",
    "type": "textarea",
    "required": true
  },
  {
    "id": "category",
    "name": "@i18n@category",
    "type": "radioV2",
    "required": true,
    "value": [
      {
        "key": "it",
        "text": "@i18n@category_it"
      },
      {
        "key": "hr",
        "text": "@i18n@category_hr"
      }
    ]
  },
  {
    "id": "period",
    "name": "@i18n@period",
    "type": "dateInterval",
    "required": true,
    "value": {
      "format": "YYYY-MM-DD hh:mm",
      "intervalAllowModify": false
    }
  }
]
```

## 高频坑

- `name` 忘了用 `@i18n@`
- `text` 控件的 `value` 忘了走国际化 key
- `amount.value` 错写成数字，实际上这里要传币种
- `date.value` 错写成实例里的 RFC3339 时间，定义阶段这里只传格式字符串
- `form_content` 最终请求时忘了转成 JSON 字符串
