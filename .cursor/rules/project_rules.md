# 项目开发规范

## 语言规则
- 全程使用中文进行开发交流和代码注释

## 项目结构
```
TruthorDare/
├── backend/           # 后端服务 (Node.js + Express)
├── web/               # Web前端 (React + Vite + TailwindCSS)
├── miniprogram/       # 微信小程序
├── docs/              # 文档 (PRD/SPEC/UI)
└── .trae/rules/       # 开发规范与配置
```

## 技术栈
- 后端: Node.js, Express
- Web前端: React, Vite, TailwindCSS
- 小程序: 微信原生小程序
- LLM服务: 通义千问 (优先), DeepSeek (备选)

## 开发流程
1. 需求分析: 参考 PRD 文档
2. 技术设计: 参考 SPEC 文档
3. UI 设计: 参考 UI 文档
4. 编码实现: 遵循代码规范
5. 测试验证: 单元测试 + 端到端测试
6. 代码提交: 遵循 Git 规范

## 代码规范

### 后端 (Node.js/Express)
- 使用 ES Modules (import/export)
- 控制器函数采用 async/await
- 错误处理使用 try/catch
- 环境变量通过 dotenv 管理
- API 响应格式遵循 SPEC 文档

### 前端 (React)
- 函数组件 + Hooks
- 组件文件名使用 PascalCase
- 样式使用 TailwindCSS 类名
- 状态管理优先使用 useState/useReducer

### 小程序 (微信原生)
- 遵循微信小程序开发规范
- 页面文件命名使用 kebab-case
- 组件间通信使用 properties/events

## 文档规范
- PRD: 产品需求文档，描述功能需求和用户场景
- SPEC: 技术设计文档，描述架构设计和技术实现
- UI: 用户界面设计文档，描述界面布局和交互设计

## Git 规范
- 分支命名: feature/*, bugfix/*, hotfix/*
- 提交信息: 遵循约定式提交 (<type>(<scope>): <subject>)
- 提交频率: 小步快跑，频繁提交

## 测试规范
- 单元测试: 关键函数和组件
- 集成测试: API 接口测试
- 端到端测试: 页面交互流程测试

## 部署规范
- 环境变量管理: 通过 .env 文件配置
- 密钥管理: 不提交到代码仓库
- 部署方式: Web 支持腾讯 EdgeOne 托管

## 安全规范
- 输入验证: 所有用户输入都需要验证
- 内容过滤: 生成内容需要经过安全过滤
- 速率限制: 实现 API 调用频率限制

## 性能规范
- 响应时间: 平均生成延迟 ≤ 3s
- 资源优化: 图片压缩, 代码分割
- 缓存策略: 合理使用 HTTP 缓存和内存缓存