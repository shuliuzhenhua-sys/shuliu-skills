---
name: feishu-approval
description: Use when用户在飞书原生审批里处理审批定义、审批实例、审批任务动作、审批表单控件、外部选项、审批图片或附件上传、approval_code、instance_code、task_id、创建或处理审批并排查参数与用户 ID 作用域问题。
---

# 飞书原生审批

这是一个纯文档 skill，不自带脚本。它的目标是帮助你基于飞书官方审批文档，稳定回答这几类问题：

- 如何创建或更新审批定义
- 审批定义里的 `form.form_content` 应该怎么写
- 单选、多选如何关联外部选项
- 图片或附件控件如何先上传文件、再在实例里传 `code`
- 如何基于 `approval_code` 创建审批实例
- 如何撤回审批实例、拒绝审批任务、退回审批任务、重新提交审批任务
- 如何根据 `approval_code`、`instance_code` 查询详情
- 审批接口报错后该怎么排查

## 使用边界

优先处理以下 8 类问题：

1. 审批定义概念、`approval_code` 获取方式、定义结构
2. 审批定义接口：`create` / `get`
3. 审批定义表单控件：`form_content`
4. 单选、多选外部选项：`externalData`
5. 审批文件上传：图片 / 附件控件对应的上传接口与 `code`
6. 审批实例接口：`create` / `get`
7. 审批任务动作：`cancel` / `reject` / `specified_rollback` / `resubmit`
8. 常见错误码和高频坑

如果用户问题超出上述范围，例如评论写入、批量查询、加签、转交等，本 skill 可以基于官方文档谨慎回答，但不要假装当前 reference 已经完整覆盖。

## 回答顺序

收到问题后，按下面顺序组织回答：

1. 先判断用户问的是：
   - 审批定义
   - 表单控件
   - 外部选项
   - 文件上传
   - 审批实例
   - 审批任务动作
   - 排障
2. 再只读取需要的参考文档，不要一次把所有 reference 都展开。
3. 输出时优先给：
   - 可直接使用的字段说明
   - 最小可用 JSON 片段
   - 必填项
   - 易错点
4. 如果用户是在“发实例”，先提醒：实例 `form` 的值结构和定义 `form_content` 不是同一种 JSON。
5. 如果用户说“打回”“撤销”“驳回”，必须先区分他要的是：
   - 作废整单：`cancel`
   - 驳回当前审批：`reject`
   - 退回到上一步或指定节点：`specified_rollback`

## 参考文档选择

- 问审批定义整体结构、`approval_code`、`viewers`、`node_list`：
  读 [`references/definition.md`](references/definition.md)
- 问 `form.form_content`、控件 `type`、控件字段怎么写：
  读 [`references/form-controls.md`](references/form-controls.md)
- 问单选/多选外部数据源、联动参数、返回格式、加密：
  读 [`references/external-options.md`](references/external-options.md)
- 问审批图片/附件上传、上传接口、`code` 怎么得到、实例里图片/附件控件怎么传：
  读 [`references/file-upload.md`](references/file-upload.md)
- 问审批实例创建、`instance_code`、实例 `form`、自选审批人：
  读 [`references/instance.md`](references/instance.md)
- 问撤回实例、拒绝审批任务、退回审批任务、重新提交、`task_id`、`reject_option`：
  读 [`references/task-actions.md`](references/task-actions.md)
- 问错误码、字段校验失败、定义与实例结构混淆：
  读 [`references/troubleshooting.md`](references/troubleshooting.md)

## 关键规则

### 1. 创建审批定义是全量覆盖

当用户使用 `approval/create` 且传入已有 `approval_code` 时，要明确提醒：

- 这是全量覆盖更新，不是 patch
- 原定义中的表单、节点、设置会按本次请求整体替换
- 官方文档明确写了：通过 API 创建的审批定义无法从审批后台或 API 停用、删除，应谨慎操作

### 2. 定义 form 和实例 form 不同

不要把这两个结构混在一起：

- 审批定义 `form.form_content`
  - 描述的是控件定义
  - 里面写的是控件元信息、控件配置
- 审批实例 `form`
  - 描述的是控件值
  - 里面写的是用户实际提交的数据

如果用户把定义控件 JSON 直接塞到实例里，或者反过来，必须明确指出不对，并给出正确结构。

如果实例里包含：

- `image`
- `attachmentV2`

还要额外提醒：

- 不能直接把本地文件路径、文件名或下载 URL 塞进实例 `value`
- 需要先调用审批文件上传接口
- 上传成功后拿到返回的文件 `code`
- 再把这个 `code` 放进实例表单对应控件的 `value` 里

### 3. 优先给最小可用示例

当用户问某个控件怎么写时，不要先长篇讲概念。优先给：

- `type`
- 必填字段
- `value` 结构
- 对应要补的 `@i18n@` key
- 可直接放进 `form_content` 的 JSON 片段

### 4. i18n 不能漏

只要是审批定义里的 `approval_name`、`description`、控件 `name`、说明 `text.value`、选项 `text` 等字段，需要国际化文案 key 时，就提醒用户：

- key 必须以 `@i18n@` 开头
- key 需要在 `i18n_resources.texts` 中补对应 value

### 5. API 不支持所有控件

如果用户要用审批定义 API 创建以下控件，直接提醒“不支持或不完整支持”，并说明需要转到审批后台处理：

- `formula`
- `mutableGroup`
- `serialNumber`
- `shiftGroupV2`
- `workGroup`（仅支持查看）
- `leaveGroup`（仅支持查看）
- `outGroup`（仅支持查看）
- `tripGroup`

### 6. “撤回”“打回”“退回”不是同一个动作

回答这类问题时必须先做映射：

- `cancel`
  - 语义：撤回审批实例，整单作废
  - 操作对象：实例
  - 关键 ID：`approval_code`、`instance_code`、提交人 `user_id`
- `reject`
  - 语义：当前审批人拒绝该审批任务
  - 操作对象：任务
  - 关键 ID：`approval_code`、`instance_code`、`task_id`、当前审批人 `user_id`
- `specified_rollback`
  - 语义：退回到已审批的一个或多个节点
  - 操作对象：任务
  - 关键 ID：`task_id`、当前审批人 `user_id`、`task_def_key_list`

如果用户说“用户提交后不符合规则，把审批打回去”，默认优先提示：

- 如果想让这条申请直接作废，用 `cancel`
- 如果想让发起人修改后再提，用 `reject`，并结合 `reject_option = 1`
- 如果想退回到上一步节点，用 `specified_rollback`

### 7. `reject_option = 1` 才是“打回发起人后可重提”的关键

审批定义里：

- `settings.reject_option = 0`
  - 默认，拒绝后流程终止
- `settings.reject_option = 1`
  - 退回至发起人，发起人可编辑后重新提交

所以只要用户问“驳回后还能不能改再提”，都要优先提醒看这个字段。

### 8. 创建审批实例、任务动作、文件上传优先用 tenant access token

实战结论：

- `approval/v4/instances` 创建实例时，`user access token` 可能直接报：
  - `99991668 user access token not support`
- 这类场景以及审批任务动作、审批文件上传，都优先用应用自己的 `tenant_access_token`
- 如果要以某个用户身份发起，通常是在请求体里补 `user_id` / `open_id`，不是换成 user token

### 9. `open_id` / `user_id` 是应用作用域的

实战结论：

- 同一个人，在不同飞书应用下拿到的 `open_id` / `user_id` 可能不同
- 用户提供的 ID 不一定能直接用于当前审批应用
- 如果创建实例时报：
  - `1390001 用户不存在请求的租户内`
  - `1390001 user id not found`

优先排查：

1. 当前 `app_id/app_secret` 是否和审批定义同一个应用
2. 当前 `open_id/user_id` 是否来自这个应用作用域
3. 不要跨应用复用用户 ID

### 10. 任务动作必须先拿对 `task_id`

只要用户要调用：

- `approve`
- `reject`
- `specified_rollback`
- `resubmit`

都要提醒：

- 先查实例详情
- 从 `task_list` 里取当前任务的 `task_id`
- `specified_rollback` 还要从 `timeline` 里找可回退节点的 `task_def_key`

如果用户只有 `instance_code`，没有 `task_id`，不能直接编造。

### 11. `contact` 控件实例值结构要同时带 `value` 和 `open_ids`

优先使用：

```json
{
  "id": "contact_user",
  "type": "contact",
  "value": ["5da97a23"],
  "open_ids": ["ou_xxx"]
}
```

实战结论：

- `value` 放当前审批应用下的 `user_id`
- `open_ids` 放同一应用作用域下的 `open_id`

### 12. `checkboxV2 + externalData` 创建实例时，`value` 传选项 ID，`option.text` 传 i18n key

成功写法优先用：

```json
{
  "id": "project_customer",
  "type": "checkboxV2",
  "value": ["recxxxx"],
  "option": [
    {
      "key": "recxxxx",
      "text": "@i18n@customers_recxxxx"
    }
  ]
}
```

实战结论：

- `value` 传外部选项接口返回的 `options[*].id`
- `option.key` 同样传这个 ID
- `option.text` 传外部选项接口返回的 i18n key
- 不要传中文显示文案

### 13. 实例详情回显成中文，不代表创建时该传中文

实战结论：

- 创建成功后，再查实例详情，飞书可能把外部多选控件的 `value` 回显成中文名称
- 但创建请求体里，仍然要按“选项 ID + i18n key”提交
- 不要根据回显结果反推创建请求体

### 14. 回答时优先给“动作判断”

如果用户的问题包含：

- “撤销审批”
- “打回”
- “驳回”
- “退回上一步”

优先按下面格式回答：

1. 先判断他要的是实例动作还是任务动作
2. 再给对应最小 JSON
3. 再列出前提条件，例如 `reject_option`、是否需要 `task_id`
4. 最后补高频坑

## 输出要求

默认用中文输出，并尽量采用下面的回答形式：

1. 先一句话判断当前问题属于哪一类
2. 给出可直接用的 JSON 片段
3. 列出 2 到 5 条关键说明
4. 最后补一段“高频坑提醒”

## 官方文档
https://open.feishu.cn/document/server-docs/approval-v4/approval-overview.md
https://open.feishu.cn/document/server-docs/approval-v4/file/overview
https://open.feishu.cn/document/server-docs/approval-v4/file/upload-files
https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/approval-v4/instance/cancel.md
https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/approval-v4/task/reject.md
https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/approval-v4/instance/specified_rollback.md
https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/approval-v4/task/resubmit.md
https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/approval-v4/approval/create.md
