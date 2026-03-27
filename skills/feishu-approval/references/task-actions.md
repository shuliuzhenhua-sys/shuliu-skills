# 审批任务动作速查

本页用于回答审批实例撤回、审批任务拒绝、退回、重新提交，以及“打回”到底该映射成哪个接口。

## 先做动作判断

用户说：

- “撤销审批”
- “打回”
- “驳回”
- “退回上一步”

不要直接给接口，先判断他要的是哪一种：

| 诉求 | 推荐接口 | 语义 |
| --- | --- | --- |
| 作废整单 | `cancel` | 撤回审批实例 |
| 驳回当前审批并结束或退回发起人 | `reject` | 拒绝审批任务 |
| 退回到上一步或指定已审批节点 | `specified_rollback` | 退回审批任务 |
| 发起人修改后再次提交 | `resubmit` | 重新提交审批任务 |

## 1. 撤回审批实例 `cancel`

适用场景：

- 用户自己想撤回
- 业务校验失败，想直接作废整单

最小请求体：

```json
{
  "approval_code": "APPROVAL_CODE",
  "instance_code": "INSTANCE_CODE",
  "user_id": "提交人ID"
}
```

关键点：

- 操作对象是实例，不是任务
- 需要提交人的 `user_id`
- 审批定义里要允许撤销审批中的申请，或允许撤销 x 天内通过的审批

## 2. 拒绝审批任务 `reject`

适用场景：

- 当前审批人要驳回
- 用户口头说“打回”，通常优先先确认是不是这个

最小请求体：

```json
{
  "approval_code": "APPROVAL_CODE",
  "instance_code": "INSTANCE_CODE",
  "user_id": "当前审批人ID",
  "task_id": "当前待处理任务ID",
  "comment": "资料不符合规则，请修改后重新提交"
}
```

关键点：

- 操作对象是任务，不是实例
- 需要当前审批人的 `user_id`
- 需要当前待处理的 `task_id`
- 如果审批定义里 `settings.reject_option = 1`，则会退回发起人，发起人可编辑后重新提交
- 如果 `reject_option = 0`，默认是拒绝后流程终止

## 3. 退回审批任务 `specified_rollback`

适用场景：

- 不是整单作废
- 也不是简单拒绝
- 而是要退回到上一步或指定已审批节点

最小请求体：

```json
{
  "user_id": "当前审批人ID",
  "task_id": "当前待处理任务ID",
  "reason": "申请事项填写不具体，请重新填写",
  "task_def_key_list": ["START"]
}
```

关键点：

- `task_def_key_list` 不是随便写
- 要从实例详情的 `timeline` 里找动态类型为 `PASS` 的节点 key
- 官方示例里可以退回到 `START`
- 官方概述表和详情页对 URL 路径写法有差异时，优先以详情页为准

## 4. 重新提交审批任务 `resubmit`

适用场景：

- 审批被退回到发起人
- 发起人改完表单后重新发起

最小请求体：

```json
{
  "approval_code": "APPROVAL_CODE",
  "instance_code": "INSTANCE_CODE",
  "user_id": "发起人ID",
  "task_id": "退回后的任务ID",
  "form": "[{\"id\":\"reason\",\"type\":\"input\",\"value\":\"已修改\"}]"
}
```

关键点：

- `form` 用法和创建审批实例时一致
- 传值时仍然是 JSON 数组转字符串
- 不是把旧实例自动恢复，还是要重新传控件值

## `task_id` 和回退节点怎么拿

只要涉及任务动作，都优先提醒：

1. 调用实例详情接口
2. 从 `task_list` 里找当前 `PENDING` 的任务，拿 `task_id`
3. 如果是 `specified_rollback`，再从 `timeline` 里找可回退节点的 `task_def_key`

## `reject_option` 怎么回答

如果用户问“驳回后能不能修改重提”，直接给这个结论：

- `settings.reject_option = 0`
  - 拒绝后流程终止
- `settings.reject_option = 1`
  - 退回至发起人，发起人可编辑流程后重新提交

## 高频坑

- 把“打回”误答成 `cancel`
- 只有 `instance_code`，没有 `task_id` 就开始拼 `reject`
- 拿提交人的 ID 去做 `reject`，而不是当前审批人的 ID
- `specified_rollback` 的 `task_def_key_list` 不是从 `timeline` 里拿的
- 以为 `reject` 后一定能重新提交，但实际上定义里没开 `reject_option = 1`
- 用 `user_access_token` 调任务动作接口，而不是 `tenant_access_token`
