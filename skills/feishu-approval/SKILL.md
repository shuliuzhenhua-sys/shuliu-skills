---
name: feishu-approval
description: 飞书原生审批文档型技能。只要用户提到“飞书审批”“原生审批”“审批定义”“审批实例”“approval_code”“instance_code”“审批表单控件”“外部选项”“创建审批定义”“创建审批实例”“查询审批详情”这类场景，就应该使用这个 skill。它重点覆盖审批定义 create/get、表单控件 form_content、外部选项 externalData、审批实例 create/get，以及常见错误码排查。
---

# 飞书原生审批

这是一个纯文档 skill，不自带脚本。它的目标是帮助你基于飞书官方审批文档，稳定回答这几类问题：

- 如何创建或更新审批定义
- 审批定义里的 `form.form_content` 应该怎么写
- 单选、多选如何关联外部选项
- 如何基于 `approval_code` 创建审批实例
- 如何根据 `approval_code`、`instance_code` 查询详情
- 审批接口报错后该怎么排查

## 使用边界

优先处理以下 6 类问题：

1. 审批定义概念、`approval_code` 获取方式、定义结构
2. 审批定义接口：`create` / `get`
3. 审批定义表单控件：`form_content`
4. 单选、多选外部选项：`externalData`
5. 审批实例接口：`create` / `get`
6. 常见错误码和高频坑

如果用户问题超出上述范围，例如审批任务审批动作、评论写入、批量查询、撤回实例等，本 skill 只能先说明当前资料未覆盖，再基于已有上下文谨慎回答，不要假装文档里已经包含。

## 回答顺序

收到问题后，按下面顺序组织回答：

1. 先判断用户问的是：
   - 审批定义
   - 表单控件
   - 外部选项
   - 审批实例
   - 排障
2. 再只读取需要的参考文档，不要一次把所有 reference 都展开。
3. 输出时优先给：
   - 可直接使用的字段说明
   - 最小可用 JSON 片段
   - 必填项
   - 易错点
4. 如果用户是在“发实例”，先提醒：实例 `form` 的值结构和定义 `form_content` 不是同一种 JSON。

## 参考文档选择

- 问审批定义整体结构、`approval_code`、`viewers`、`node_list`：
  读 [`references/definition.md`](references/definition.md)
- 问 `form.form_content`、控件 `type`、控件字段怎么写：
  读 [`references/form-controls.md`](references/form-controls.md)
- 问单选/多选外部数据源、联动参数、返回格式、加密：
  读 [`references/external-options.md`](references/external-options.md)
- 问审批实例创建、`instance_code`、实例 `form`、自选审批人：
  读 [`references/instance.md`](references/instance.md)
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

## 输出要求

默认用中文输出，并尽量采用下面的回答形式：

1. 先一句话判断当前问题属于哪一类
2. 给出可直接用的 JSON 片段
3. 列出 2 到 5 条关键说明
4. 最后补一段“高频坑提醒”

## 官方文档
https://open.feishu.cn/document/server-docs/approval-v4/approval-overview.md