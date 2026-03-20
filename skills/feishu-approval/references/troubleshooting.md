# 审批常见排障

本页用于解释审批定义、审批实例的高频报错和排查路径。

## 1. `approval code not found`

常见错误码：

- `1390002`

说明：

- 传入的 `approval_code` 找不到

排查：

1. 确认 code 是否来自创建定义响应或审批后台开发者模式 URL
2. 注意是否把 `approval_id` 当成了 `approval_code`
3. 确认是否在错误租户、错误应用下调用

## 2. `field validation failed`

常见错误码：

- `99992402`

说明：

- 请求进入了业务层，但缺字段或字段格式不对

排查：

1. 先看 `field_violations`
2. 如果是定义创建，优先检查：
   - `approval_name`
   - `viewers`
   - `form`
   - `node_list`
   - `i18n_resources`
3. 如果是实例创建，优先检查：
   - `approval_code`
   - `form`

## 3. `param is invalid`

常见错误码：

- `1390001`

说明：

- 参数存在格式或业务约束问题

高频原因：

- 控件字段结构不对
- 控件 `type` 和 `value` 不匹配
- `form_content` 或实例 `form` 压缩转义错误
- `node_list` 缺少 `START` / `END`
- 国际化 key 漏配

排查建议：

1. 先定位报错里提到的控件 ID
2. 再去审批定义的 `form` 或实例详情的 `form` 里搜该控件
3. 核对这个控件的定义和提交值是否匹配

## 4. `approval is not active`

常见错误码：

- `1390015`

说明：

- 审批定义已停用

排查：

1. 去审批后台看该审批定义状态
2. 确认是否传了旧 code

## 5. `unsupported approval for free process`

常见错误码：

- `1390013`

说明：

- 当前审批流程配置不支持这种调用方式

高频原因：

- 试图用 API 处理不支持的自由流程或不支持的结构

## 6. 定义与实例结构混淆

这是最常见的非官方错误。

表现：

- 用户把定义控件结构直接拿去创建实例
- 用户把实例值结构误以为就是定义 `form_content`

记忆方法：

- 定义：控件长什么样
- 实例：控件填了什么值

## 7. 外部选项显示为空

高频原因：

- `i18nResources` 没返回
- `options[*].value` 和 `i18nResources.texts` 对不上
- 数据源接口超时
- 返回结构不是飞书要求的 `data.result`

## 8. 文档里有、API 却建不出来

高频原因：

- 该控件只支持查看，不支持用定义 API 创建
- 该能力只能在审批后台配置

遇到这种情况，先回到控件支持范围检查，不要硬猜字段。
