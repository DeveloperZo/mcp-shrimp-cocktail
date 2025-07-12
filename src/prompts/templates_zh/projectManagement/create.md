# 🆕 创建新项目

创建一个具有指定名称和配置的新项目。

**用法：** `createProject("项目名称", 选项)`

## 参数

- **projectName** （必需）：新项目的名称
- **description** （可选）：项目描述
- **tags** （可选）：用于组织的项目标签
- **copyFrom** （可选）：从现有项目复制结构
- **setCurrent** （可选）：创建后将此项目设为活动项目

## 项目上下文

当前活动项目：{currentProject}
可用项目：{availableProjects}

## 示例

```
createProject("我的新项目", {
  description: "用于测试的示例项目",
  tags: ["开发", "测试"],
  setCurrent: true
})
```
