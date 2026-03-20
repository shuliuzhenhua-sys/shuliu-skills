# 单选 / 多选外部选项

本页用于回答审批定义里的 `radioV2`、`checkboxV2` 如何关联外部系统数据。

## 适用场景

当企业已经在其他系统维护了候选数据，例如：

- 客户列表
- 项目列表
- 成本中心
- 供应商列表

可以让审批表单里的单选、多选控件通过外部接口动态取值，而不是在审批定义里手写固定选项。

## 定义阶段怎么写

在审批定义控件里配置 `externalData`：

```json
{
  "id": "customer",
  "name": "@i18n@customer",
  "type": "radioV2",
  "required": true,
  "value": [],
  "externalData": {
    "externalUrl": "https://example.com/approval/customer-options",
    "token": "token-value",
    "key": "encrypt-key",
    "linkageConfigs": [
      {
        "linkageWidgetID": "department_widget",
        "key": "department_code",
        "value": "example"
      }
    ],
    "externalDataLinkage": true
  }
}
```

## externalData 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `externalUrl` | 是 | 公网可访问接口地址 |
| `token` | 是 | 飞书审批传给数据源接口的校验 token |
| `key` | 否 | 用于加解密 |
| `linkageConfigs` | 否 | 联动参数配置 |

## 数据源接口要求

- 请求方式：`POST`
- `Content-Type: application/json`
- 公网可访问
- 超时：3 秒

## 飞书审批请求体

```json
{
  "user_id": "123",
  "employee_id": "abc",
  "token": "1e8e999f580e7a202dbe1e5103c5e4c58ecc757e",
  "linkage_params": {
    "key1": "value1",
    "key2": "value2"
  },
  "page_token": "xxxxx",
  "query": "北京",
  "locale": "zh_cn"
}
```

说明：

- `token`
  - 用于校验请求来源
- `user_id` / `employee_id`
  - 发起审批时会带发起人身份
- `linkage_params`
  - 联动字段值
- `page_token` / `query`
  - 只有启用了模糊、分页搜索的数据源才会出现

## 正常返回格式

```json
{
  "code": 0,
  "msg": "success!",
  "data": {
    "result": {
      "options": [
        {
          "id": "customer_1",
          "value": "@i18n@customer_1",
          "isDefault": true
        }
      ],
      "i18nResources": [
        {
          "locale": "zh_cn",
          "isDefault": true,
          "texts": {
            "@i18n@customer_1": "客户A"
          }
        }
      ],
      "hasMore": false
    }
  }
}
```

## 返回体重点

- `options[*].id`
  - 选项唯一 ID
- `options[*].value`
  - 国际化 key，不是最终显示文案
- `i18nResources`
  - 必须返回，哪怕只有一种语言
- `hasMore` / `nextPageToken`
  - 只对分页搜索场景有意义

## 加密说明

如果配置了 `key`：

- 飞书要求对 `result` 内容做加密后再 base64 返回
- 没配置 `key` 时可以直接明文返回

回答用户时不需要重写整套加密代码，除非用户明确要求某种语言实现。默认先讲协议要求和返回结构。

## 高频坑

- `externalUrl` 配了内网地址，审批中心访问不到
- 数据源接口超时超过 3 秒
- `i18nResources` 返回空，导致界面选项显示为空
- 联动参数 `linkageWidgetID` 写错，尤其在明细控件场景更容易错
- 定义时配的是外部选项，实例里提交的值通常对应的是选项 ID，不是选项文本
