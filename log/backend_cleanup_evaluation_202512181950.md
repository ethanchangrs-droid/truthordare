# Backend 清理影响评估报告

**评估时间**: 2025-12-18 19:50  
**目标**: 删除 `backend/` 目录的影响评估  
**原因**: prompt 逻辑重复在 `backend/` 和 `functions/` 两处，维护成本高

---

## 📋 执行摘要

### 结论
**建议：保留 backend/ 作为本地开发环境，但标注为"本地开发专用"**

### 理由
1. ✅ **开发体验友好** - 本地 Node.js 调试比 EdgeOne Functions 更方便
2. ✅ **小程序依赖** - 微信小程序本地开发需要后端服务（无法直接访问 EdgeOne）
3. ⚠️ **代码重复可控** - 虽有重复，但通过规范可管理
4. ⚠️ **清理成本高** - 涉及多处配置修改，测试工作量大

---

## 🔍 详细影响分析

### 1. 架构现状

#### 当前双架构
```
开发环境:
  web/miniprogram → backend (localhost:3002) → LLM API
  
生产环境:
  web/miniprogram → EdgeOne Functions → LLM API
```

#### backend/ 目录结构
```
backend/                          # 29MB
├── src/
│   ├── server.js                 # Express 服务器
│   ├── services/
│   │   ├── llmService.js         # ⚠️ 与 functions/api/generate.js 重复
│   │   └── cacheService.js       # node-cache 实现
│   ├── controllers/
│   │   └── generateController.js # 请求处理
│   ├── middleware/
│   │   └── rateLimiter.js        # express-rate-limit
│   ├── utils/
│   │   └── contentFilter.js      # 内容过滤
│   └── config/
│       └── sensitiveWords.js     # 敏感词库
├── package.json
├── .env.example
└── README.md
```

---

### 2. 代码重复情况

#### 重复的核心逻辑

| 功能模块 | backend/ | functions/ | 重复度 |
|---------|----------|------------|--------|
| **Prompt 构建** | `llmService.js` buildPrompt() | `generate.js` buildPrompt() | 🔴 100% |
| **LLM 调用** | `llmService.js` generate() | `generate.js` callLLM() | 🔴 95% |
| **内容过滤** | `contentFilter.js` | `generate.js` filterItems() | 🟡 80% |
| **缓存逻辑** | `cacheService.js` (node-cache) | `generate.js` (Map) | 🟢 50% |
| **限流** | `rateLimiter.js` (express-rate-limit) | `generate.js` (手动实现) | 🟢 40% |

**关键问题**：
- ❌ Prompt 维度定义需要同步修改两处（刚刚就这样做了）
- ❌ LLM 参数调整（temperature、penalty）需要同步
- ❌ 风格枚举、敏感词库需要保持一致

---

### 3. 依赖关系分析

#### 直接依赖 backend/ 的文件

**web 端（开发环境）**:
```javascript
// web/vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3002',  // ← 依赖 backend
  }
}
```

**miniprogram 端（开发环境）**:
```javascript
// miniprogram/config/index.js
const devConfig = {
  apiBaseUrl: 'http://localhost:3002',  // ← 依赖 backend
};
```

**文档引用**:
- `README.md` - 快速开始步骤
- `init.sh` - 初始化脚本
- `web/README.md` - 开发指南
- `miniprogram/README.md` - 配置说明
- `backend/README.md` - 后端文档

---

### 4. 删除 backend/ 的影响

#### ✅ 正面影响

1. **消除代码重复** - 单一真实源（functions/）
2. **简化项目结构** - 减少 29MB 代码
3. **降低维护成本** - 只需维护一套逻辑
4. **统一生产环境** - 本地和线上完全一致

#### ❌ 负面影响

1. **本地开发复杂化**
   - 无法使用 nodemon 热重载
   - 需要使用 Wrangler 或 miniflare 模拟边缘环境
   - 调试体验变差（无法直接在 VSCode 断点调试）

2. **小程序本地开发中断**
   - 微信开发者工具无法直接访问 EdgeOne Functions
   - 必须部署到 EdgeOne 才能测试
   - 或者需要搭建本地 EdgeOne Functions 模拟环境

3. **测试流程改变**
   - 当前：`npm run dev` 启动本地服务，立即测试
   - 删除后：需要部署或使用 Wrangler 模拟

4. **配置文件需要修改**
   - `web/vite.config.js` - 代理配置
   - `miniprogram/config/index.js` - API 地址
   - `README.md` - 文档更新
   - `init.sh` - 初始化脚本
   - 3 个 README 文件

5. **环境变量管理**
   - 当前：backend/.env 文件
   - 删除后：需要在 EdgeOne 控制台配置，或使用 Wrangler 配置

---

### 5. 替代方案

#### 方案 A：完全删除 backend/（激进）

**步骤**:
1. 删除 `backend/` 目录
2. 使用 Wrangler CLI 本地开发：
   ```bash
   # 安装 Wrangler
   npm install -g wrangler
   
   # 本地运行 Functions
   wrangler pages dev ./web/dist --port 8788
   ```
3. 修改代理配置指向 Wrangler 端口
4. 更新所有文档

**优点**:
- ✅ 彻底消除重复
- ✅ 本地环境 = 生产环境

**缺点**:
- ❌ 学习成本：需要熟悉 Wrangler
- ❌ 调试困难：EdgeOne Functions 调试不如 Node.js 方便
- ❌ 小程序开发受阻：需要额外配置

**工作量**: 🔴 高（1-2 天）

---

#### 方案 B：保留 backend/，标注为"本地开发专用"（温和）

**步骤**:
1. 在 backend/README.md 顶部添加：
   ```markdown
   # ⚠️ 本地开发专用
   本目录仅用于本地开发和测试，**生产环境使用 functions/api/generate.js**。
   修改 prompt、LLM 参数时，**必须同步修改两处**。
   ```

2. 添加同步检查脚本：
   ```bash
   # scripts/check-sync.sh
   # 检测 backend/ 和 functions/ 的关键逻辑是否一致
   ```

3. 在 Git commit hook 中提醒开发者

**优点**:
- ✅ 保持现有开发体验
- ✅ 小程序开发不受影响
- ✅ 工作量最小

**缺点**:
- ❌ 仍有代码重复
- ❌ 需要手动同步（但可通过规范控制）

**工作量**: 🟢 低（1 小时）

---

#### 方案 C：提取公共模块，backend 和 functions 共享（理想）

**步骤**:
1. 创建 `shared/` 目录：
   ```
   shared/
   ├── prompt-builder.js     # Prompt 构建逻辑
   ├── llm-caller.js         # LLM 调用逻辑
   ├── content-filter.js     # 内容过滤
   └── style-dimensions.js   # 风格维度定义
   ```

2. backend 和 functions 都引用 shared/
3. 使用打包工具（esbuild）打包 functions/

**优点**:
- ✅ 代码复用，单一真实源
- ✅ 保持本地开发体验
- ✅ 架构最优

**缺点**:
- ❌ 需要配置打包流程
- ❌ EdgeOne Functions 可能不支持外部依赖（需验证）

**工作量**: 🟡 中（4-6 小时）

---

## 💡 推荐方案

### 🥇 推荐：方案 B（保留 + 标注）

**理由**:
1. **开发效率优先** - 本地 Node.js 调试非常方便
2. **小程序开发需要** - 微信开发者工具依赖本地后端
3. **重复可控** - 通过规范和文档管理
4. **成本最低** - 1 小时内完成

**实施步骤**:
1. 更新 backend/README.md 顶部警告
2. 在 claude-progress.txt 中记录"双架构维护注意事项"
3. 在 User Rules 中添加"修改 prompt 必须同步两处"

---

### 🥈 备选：方案 C（提取公共模块）

**适用场景**: 如果项目长期维护，且有足够时间重构

**先决条件**:
- 验证 EdgeOne Functions 是否支持打包后的依赖
- 确认打包后的体积符合 EdgeOne 限制

---

## 📊 决策矩阵

| 维度 | 方案 A (删除) | 方案 B (保留) | 方案 C (共享) |
|------|--------------|--------------|--------------|
| **代码重复** | 🟢 无 | 🔴 有 | 🟢 无 |
| **开发体验** | 🔴 差 | 🟢 好 | 🟢 好 |
| **维护成本** | 🟡 中 | 🔴 高 | 🟢 低 |
| **小程序开发** | 🔴 受阻 | 🟢 流畅 | 🟢 流畅 |
| **实施成本** | 🔴 高 | 🟢 低 | 🟡 中 |
| **架构优雅度** | 🟢 高 | 🔴 低 | 🟢 高 |

---

## ⚠️ 风险提示

### 如果保留 backend/（方案 B）

**风险**:
- 开发者忘记同步修改，导致开发环境和生产环境不一致

**缓解措施**:
1. 在文档中用醒目标记提醒
2. 定期对比两处代码（可用脚本）
3. 在 feature_list.json 中添加"代码同步检查"任务

### 如果删除 backend/（方案 A）

**风险**:
- 小程序本地开发无法进行
- 开发调试效率降低

**缓解措施**:
1. 提前学习 Wrangler 使用
2. 配置完善的日志系统
3. 考虑使用 Cloudflare Tunnel 映射本地环境

---

## 📝 后续行动

### 立即行动（方案 B）
1. [ ] 更新 backend/README.md，添加警告标识
2. [ ] 在 claude-progress.txt 记录双架构注意事项
3. [ ] 更新 User Rules，添加同步修改规范

### 中期优化（可选）
1. [ ] 编写同步检查脚本
2. [ ] 设置 Git pre-commit hook
3. [ ] 定期审计两处代码一致性

### 长期重构（可选）
1. [ ] 评估方案 C 可行性
2. [ ] 实施公共模块提取
3. [ ] 优化打包流程

---

## 📚 附录

### backend/ 使用的 npm 依赖
```json
{
  "express": "^4.18.2",
  "express-rate-limit": "^7.1.5",
  "openai": "^4.20.1",
  "bad-words": "^3.0.4",
  "node-cache": "^5.1.2",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5"
}
```
**总大小**: ~29MB (含 node_modules)

### functions/ 依赖（无外部依赖）
- 纯 JavaScript，无需 node_modules
- 所有逻辑内联在单文件中

---

**评估人**: Claude AI  
**报告生成时间**: 2025-12-18 19:50  
**建议决策时间**: 2025-12-18 内决定

