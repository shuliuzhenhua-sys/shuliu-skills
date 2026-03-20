# 审批定义速查

本页用于回答审批定义本身的结构问题，对应官方文档：

- 原生审批定义概述
- 创建审批定义
- 查看指定审批定义

## 基础概念

- `approval_code`
  - 审批定义唯一编码
  - 可用于查看定义、创建实例
  - 可在审批管理后台开发者模式页面的 URL 中获取
- `approval_name`
  - 审批名称，传国际化 key，必须以 `@i18n@` 开头
- `viewers`
  - 谁可以在审批前台发起该审批
- `form.form_content`
  - 表单控件定义，实际传值时需要压成 JSON 字符串
- `node_list`
  - 审批流程节点列表，第一个必须是 `START`，最后一个必须是 `END`

## 创建审批定义请求体骨架

```json
{
  "approval_name": "@i18n@approval_name",
  "viewers": [
    {
      "viewer_type": "TENANT"
    }
  ],
  "form": {
    "form_content": "[{\"id\":\"widget_1\",\"name\":\"@i18n@widget_name\",\"type\":\"input\",\"required\":true}]"
  },
  "node_list": [
    {
      "id": "START"
    },
    {
      "id": "manager_node",
      "name": "@i18n@manager_node_name",
      "node_type": "AND",
      "approver": [
        {
          "type": "Personal",
          "user_id": "ou_xxx"
        }
      ]
    },
    {
      "id": "END"
    }
  ],
  "i18n_resources": [
    {
      "locale": "zh-CN",
      "is_default": true,
      "texts": [
        {
          "key": "@i18n@approval_name",
          "value": "测试审批"
        },
        {
          "key": "@i18n@widget_name",
          "value": "申请事由"
        },
        {
          "key": "@i18n@manager_node_name",
          "value": "直属主管审批"
        }
      ]
    }
  ]
}
```

## 高频字段

### viewers

常见可见范围：

- `TENANT`：全租户可见
- `DEPARTMENT`：指定部门可见
- `USER`：指定用户可见
- `NONE`：任何人都不可见

如果是：

- `USER`
  - 需要补 `viewer_user_id`
- `DEPARTMENT`
  - 需要补 `viewer_department_id`

### node_list

固定要求：

- 第一个节点必须是 `START`
- 最后一个节点必须是 `END`

中间审批节点重点字段：

- `id`
- `name`
- `node_type`
  - `AND`
  - `OR`
  - `SEQUENTIAL`
- `approver`
- `ccer`
- `privilege_field`

### approver.type

常用审批人类型：

- `Personal`：指定成员
- `Supervisor`：逐级主管
- `SupervisorTopDown`
- `DepartmentManager`
- `DepartmentManagerTopDown`
- `Free`：发起人自选

注意：

- 当 `node_type=SEQUENTIAL` 时，审批人类型必须是 `Free`
- 传 `Personal` 时需要补 `user_id`
- 传主管或部门负责人类时需要补 `level`

### settings

常用设置：

- `revert_interval`
- `revert_option`
- `reject_option`
- `quick_approval_option`

### config

用于控制审批后台是否可修改：

- `can_update_viewer`
- `can_update_form`
- `can_update_process`
- `can_update_revert`
- `help_url`

## 查看审批定义返回体

重点看这几个字段：

- `approval_name`
- `status`
- `form`
  - 返回的是 JSON 字符串
- `node_list`
  - 包含 `node_id`、`custom_node_id`、`need_approver` 等
- `viewers`

这个接口常用来做两件事：

1. 看现有审批定义的控件和节点长什么样
2. 为创建审批实例准备 `approval_code`、节点 ID、控件 ID

## 风险提醒

- `approval/create` 在传已有 `approval_code` 时是全量覆盖更新
- API 不支持条件分支流程
- 官方文档明确提醒：通过 API 创建的审批定义无法从审批后台或 API 停用、删除
