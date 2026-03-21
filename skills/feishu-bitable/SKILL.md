---
name: feishu-bitable
description: 飞书多维表格操作。记录 CRUD、字段管理、视图、权限、公式、关联。
required_permissions:
  - bitable:app
  - bitable:app:readonly
---

# 飞书多维表格

通过 Bitable API 操作数据、字段、视图和权限。优先保持主技能简洁；只有在任务明确涉及字段类型、字段属性 `property`、字段新增/更新/删除时，再读取 [`references/fields.md`](references/fields.md)。

**Base URL**: `https://open.feishu.cn/open-apis/bitable/v1`

**关键参数**:
- `app_token`: 多维表格 URL 中 `/base/` 后的字符串
- `table_id`: 调用列表 API 获取

---

## 记录操作

| API | 端点 | 说明 |
|-----|------|------|
| 新增单条 | `POST /apps/{app_token}/tables/{table_id}/records` | - |
| 批量新增 | `POST .../records/batch_create` | 最多 500 条，支持 Upsert |
| 更新 | `PUT .../records/{record_id}` | - |
| 批量更新 | `POST .../records/batch_update` | 最多 500 条 |
| 批量删除 | `POST .../records/batch_delete` | 最多 500 条 |
| 查询 | `POST .../records/search` | 支持 filter/sort/分页 |

**请求示例**:
```json
{
  "fields": {
    "名称": "测试",
    "金额": 100,
    "进度": 0.75,
    "评分": 4,
    "日期": 1770508800000,
    "状态": "进行中",
    "标签": ["重要", "紧急"],
    "完成": true,
    "负责人": [{"id": "ou_xxx"}],
    "电话": "13800138000",
    "链接": {"text": "官网", "link": "https://example.com"}
  }
}
```

⚠️ 数值不要传字符串，日期必须是 13 位毫秒时间戳。

---

## 字段操作

当任务涉及下面任一场景时，再读取 [`references/fields.md`](references/fields.md)：
- 字段列表、字段新增、字段更新、字段删除
- 判断某个字段应该用什么 `type / ui_type`
- 判断某个字段的 `property` 结构怎么写
- 排查字段接口报错，例如 `FieldTypeValueNotMatch`、某类字段 `property` 错误

**高频提醒**：
- 字段定义是 `field` 对象，不等于记录写入时 `fields` 的值格式
- `Lookup(type=19)` 会出现在字段定义和字段列表里，但不支持走新增/更新字段接口
- `单选/多选` 更新是全量覆盖，不是增量 merge

---

## 数据表管理

| API | 端点 | 说明 |
|-----|------|------|
| 创建多维表格 | `POST /apps` | `{"name":"数据库名称"}` |
| 列出数据表 | `GET /apps/{app_token}/tables` | - |
| 新增数据表 | `POST /apps/{app_token}/tables` | `{"table":{"name":"表名"}}` |
| 批量新增表 | `POST .../tables/batch_create` | 最多 10 张表 |
| 删除数据表 | `DELETE .../tables/{table_id}` | - |
| 复制数据表 | `POST .../tables/{table_id}/copy` | - |

⚠️ **权限管理（重要）**：
- 通过 API 创建的表格默认只对机器人可见
- 创建后需添加用户为协作者：
```
POST /permissions/{app_token}/members
{
  "member_type": "user",
  "member_id": "ou_xxx",
  "perm": "full_access"
}
```
- 权限类型：`view` / `edit` / `full_access`

---

## 视图管理

| API | 端点 | 说明 |
|-----|------|------|
| 列出视图 | `GET .../tables/{table_id}/views` | - |
| 创建视图 | `POST .../tables/{table_id}/views` | `{"view_name":"新视图","view_type":"grid"}` |
| 删除视图 | `DELETE .../views/{view_id}` | - |

**视图类型**: `grid`(表格) / `kanban`(看板) / `gallery`(画册) / `gantt`(甘特图)

---

## 权限管理

| API | 端点 | 说明 |
|-----|------|------|
| 创建协作者 | `POST /apps/{app_token}/roles/{role_id}/members/batch_create` | - |
| 删除协作者 | `POST .../members/batch_delete` | - |
| 更新权限 | `PUT /apps/{app_token}/roles/{role_id}` | - |

**角色类型**: `owner` / `editor` / `reader`

---

## 最佳实践

1. **批量操作优先**（减少 API 调用）
2. **字段类型严格匹配**（避免写入失败）
3. **日期用毫秒时间戳**（Python: `int(datetime.timestamp() * 1000)`）
4. **关联字段实现关系型能力**
5. **金额默认两位小数**
6. **创建表格后立即添加用户为协作者**（避免不可见）
7. **单选字段自动创建选项**（直接写入选项文本即可）
8. **当涉及到编号时，尽量使用 `自动更新` 字段**
9. **多维表格创建在同一个 base 下面** (这样更方便管理)
10. **新创建的多维表格有个默认的字段 `多行文本` 或者 `文本`，需要在创建完成以后，用 put 接口根据业务需要对他进行修改**
11. **数量请使用 `整数类型`，不保留小数**
12. **推荐使用视图功能，将不同状态进行区分，视图不用太多，一般不超过 5 个**
---
