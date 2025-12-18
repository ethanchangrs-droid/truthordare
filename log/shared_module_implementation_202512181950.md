# 公共模块提取 - 实施方案

**日期**: 2025-12-18  
**状态**: ✅ 部分完成，等待继续

---

## 🎯 目标

提取 prompt 构建逻辑到公共模块 (`shared/`)，backend 和 EdgeOne Functions 都引用同一份代码，消除重复。

---

## ✅ 已完成步骤

### 1. 创建 shared/ 目录结构
```
shared/
├── prompt/
│   ├── dimensions.js        # ✅ 完成 - 风格维度定义
│   └── builder.js            # ✅ 完成 - Prompt 构建逻辑
└── package.json              # ✅ 完成 - ES Module 配置
```

### 2. backend/ 引用 shared/
- ✅ 修改 `backend/src/services/llmService.js`
- ✅ 引入 `import { buildPrompt } from '../../../shared/prompt/builder.js'`
- ✅ 删除本地 `buildPrompt()` 方法
- ✅ 测试通过 - API 调用成功

### 3. 安装打包工具
- ✅ 安装 esbuild: `npm install --save-dev esbuild`
- ✅ 创建打包脚本: `scripts/bundle-functions.js`

---

## 🚧 待完成步骤

### 4. 创建 functions/api/generate-source.js

需要将当前的 `functions/api/generate.js` 重构为引用 `shared/` 的版本。

**当前文件**: `functions/api/generate-backup.js` (已备份)

**需要创建**: `functions/api/generate-source.js`

**关键修改**:
```javascript
// 顶部添加
import { buildPrompt } from '../../shared/prompt/builder.js';

// 删除原有的 buildPrompt() 函数和 styleDimensions 定义

// callLLM 函数中使用
async function callLLM(env, { mode, style, locale, count, audienceAge, intensity, seed }) {
  const provider = env.LLM_PROVIDER || 'deepseek';
  const prompt = buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed }); // ← 使用 shared/
  
  // ... 其余代码保持不变
}
```

### 5. 配置打包命令

在根目录 `package.json` 添加:
```json
{
  "scripts": {
    "build:functions": "node scripts/bundle-functions.js"
  }
}
```

### 6. 执行打包测试
```bash
npm run build:functions
```

预期输出:
- `functions/api/generate.js` (打包后的单文件，包含 shared/ 代码)

### 7. 更新 .gitignore

忽略打包后的文件（仅提交源文件）:
```gitignore
# EdgeOne Functions 打包产物
functions/api/generate.js
```

### 8. 更新文档

**backend/README.md** 顶部添加:
```markdown
# ⚠️ 本地开发 & 调试专用

本目录仅用于**本地开发和调试**，生产环境使用 `functions/api/generate.js`（EdgeOne Functions）。

## 🔗 公共模块

prompt 构建逻辑位于 `shared/prompt/` 目录，backend 和 functions 共享同一份代码。

**修改 prompt 或风格维度时**：
1. 编辑 `shared/prompt/dimensions.js` 或 `shared/prompt/builder.js`
2. 重启 backend 服务（本地开发）
3. 运行 `npm run build:functions` 重新打包
4. 部署到 EdgeOne（生产环境）
```

**README.md** 更新项目结构:
```markdown
## 项目结构

```
TruthorDare/
├── shared/            # 🆕 公共模块（prompt 逻辑）
│   └── prompt/
│       ├── dimensions.js   # 风格维度定义
│       └── builder.js      # Prompt 构建逻辑
├── functions/         # EdgeOne 边缘函数
│   └── api/
│       ├── generate-source.js  # 🆕 源代码（引用 shared/）
│       └── generate.js         # 打包后的部署文件
├── backend/           # 本地开发 & 调试专用
├── web/               # Web 前端
└── miniprogram/       # 微信小程序
```
```

### 9. 部署流程文档

**DEPLOY_EDGEONE.md** 添加:
```markdown
## 📦 Functions 打包

EdgeOne Functions 使用打包后的代码（包含 shared/ 模块）。

**每次修改 prompt 逻辑后**：
```bash
# 1. 打包 Functions
npm run build:functions

# 2. 提交代码
git add functions/api/generate.js
git commit -m "chore: rebuild functions"
git push

# 3. EdgeOne 自动部署
```

**本地开发无需打包**：backend 直接引用 shared/
```

---

## 🎯 最终效果

### 代码复用
- ✅ prompt 逻辑只维护一份 (`shared/prompt/`)
- ✅ backend 直接 import (ES Module)
- ✅ functions 通过打包引入

### 开发流程

#### 本地开发（backend）
```bash
cd backend
npm run dev
# 修改 shared/ 后自动热重载
```

#### 生产部署（EdgeOne）
```bash
npm run build:functions  # 打包
git push                 # 部署
```

### 维护成本
- 🟢 **低** - 单一真实源
- 🟢 修改一处，两边生效
- 🟢 backend 和 functions 逻辑保持同步

---

## ⚠️ 注意事项

### 1. shared/ 依赖限制
- 只能使用纯 JavaScript
- 不能依赖 Node.js 特有 API（因为要打包到 EdgeOne）
- 不能依赖外部 npm 包（除非也打包）

### 2. 打包后文件管理
- `functions/api/generate.js` 是打包产物，**不要手动编辑**
- 修改请编辑 `generate-source.js` 或 `shared/`
- `.gitignore` 是否忽略打包产物？
  - **方案 A**: 忽略，每次部署前打包（CI/CD 友好）
  - **方案 B**: 提交，便于手动部署（当前推荐）

### 3. 同步机制
- 修改 `shared/` 后：
  - Backend: 自动生效（nodemon 热重载）
  - Functions: 需要运行 `npm run build:functions`

---

## 🚀 下一步行动

**立即执行**：
1. [ ] 创建 `functions/api/generate-source.js`（引用 shared/）
2. [ ] 测试打包: `npm run build:functions`
3. [ ] 测试打包后的 generate.js 逻辑
4. [ ] 更新所有相关文档

**要我继续执行吗？**

