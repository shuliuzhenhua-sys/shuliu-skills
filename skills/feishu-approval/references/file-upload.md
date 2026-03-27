# 审批文件上传

本页用于回答审批图片、附件控件在创建审批实例前如何先上传文件并获取 `code`。

对应官方文档：

- 原生审批文件概述
- 上传文件

## 先记住这件事

当审批表单里有：

- `image`
- `attachmentV2`

开发者不能直接把本地文件路径、文件名或下载 URL 填进实例 `form`。

正确顺序是：

1. 先调用审批文件上传接口
2. 拿到返回的文件 `code`
3. 再在创建审批实例时，把这个 `code` 放进对应控件的 `value`

## 上传接口

- URL：`https://www.feishu.cn/approval/openapi/v2/file/upload`
- Method：`POST`
- `Content-Type`：`multipart/form-data`
- 鉴权：`Authorization: Bearer <tenant_access_token>`
- 权限：`approval:approval:readonly`

## 请求体字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 文件名，必须带扩展名 |
| `type` | string | 是 | 文件类型，只能是 `image` 或 `attachment` |
| `content` | file | 是 | 实际文件内容 |

## 使用限制

- 每次只能上传一个文件
- 图片最大 10 MB
- 附件最大 50 MB
- `type` 要和审批定义中的控件类型匹配

## curl 最小示例

```bash
curl -X POST 'https://www.feishu.cn/approval/openapi/v2/file/upload' \
  -H 'Authorization: Bearer <tenant_access_token>' \
  -F 'name=invoice.pdf' \
  -F 'type=attachment' \
  -F 'content=@/path/to/invoice.pdf'
```

## 响应重点

成功后重点看：

- `data.code`
- `data.url`

其中：

- `data.code` 才是创建审批实例时要传的值
- `data.url` 只是文件访问地址
- `data.url` 有效期 12 小时

## 实例里怎么传

### 图片控件

```json
{
  "id": "widget_image",
  "type": "image",
  "value": ["D93653C3-2609-4EE0-8041-61DC1D84F0B5"]
}
```

### 附件控件

```json
{
  "id": "widget_attachment",
  "type": "attachmentV2",
  "value": ["D93653C3-2609-4EE0-8041-61DC1D84F0B5"]
}
```

回答用户时，如果对方问的是“附件控件”，可以顺手提醒：

- 定义阶段控件类型通常是 `attachmentV2`
- 上传接口里的 `type` 传 `attachment`

这两个字段不一样，不要混用。

## 高频坑

- 直接把本地文件路径传进实例 `value`
- 直接把上传返回的 `url` 传进实例 `value`
- 一次请求上传多个文件
- `name` 没带扩展名
- 审批定义是图片控件，却按 `attachment` 上传
- 审批定义是附件控件，却按 `image` 上传
- 图片或附件超出大小限制
- 用错 token 类型，或者没有应用身份的 `tenant_access_token`
