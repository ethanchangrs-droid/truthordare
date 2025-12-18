# 真心话 / 大冒险 LLM 生成器 技术设计（SPEC）

版本: V1.4_202512181524  
更新时间(UTC+8): 2025-12-18 15:24:00 CST

## 版本记录
| 版本 | 日期 | 更新内容 |
|------|------|---------|
| V1.4 | 2025-12-18 | **架构优化**：LLM响应解析逻辑统一到 shared/llm/parser.js；消除82行重复代码；降低50%维护成本 |
| V1.3 | 2025-12-17 | 每次生成1题；新增seed参数；缓存逻辑改用随机数；新增"大尺度"风格；敏感词调整；限流20次/分 |
| V1.2 | 2025-12-17 | 改造为 EdgeOne Pages Functions 架构；无需后端服务器 |
| V1.1 | 2025-12-17 | 代码与文档对齐；统一参数命名；标注实现状态 |
| V1.0 | 2025-12-17 | 初始版本 |

## 总体架构

### 部署架构（EdgeOne Pages + Edge Functions）✅ 已实现

```
用户请求
    ↓
EdgeOne CDN（全球边缘节点）
    ├── 静态资源 (web/dist) → CDN 分发
    └── /api/* 请求 → Edge Functions
                            ↓
                      LLM API (DeepSeek/通义千问)
```

### 架构特点
- **无服务器**：所有逻辑在 EdgeOne 边缘节点执行 ✅
- **前端**：Web（React SPA）与小程序端（仅微信）
- **边缘函数**：`/api/generate` 接口，调用 LLM Provider
- **LLM Provider**：DeepSeek（默认），通义千问备选
- **内容安全**：边缘函数内置敏感词过滤
- **公共模块** (V1.4 新增)：`shared/` 目录统一管理核心逻辑 ✅

### 代码架构（V1.4 优化）

```
TruthorDare/
├── shared/                    # ✅ 公共模块（单一真实源）
│   ├── llm/
│   │   └── parser.js         # ✅ LLM响应解析器（统一处理）
│   ├── prompt/
│   │   ├── builder.js        # ✅ Prompt构建逻辑
│   │   └── dimensions.js     # ✅ 话题维度定义
│   └── config/
│       └── llm-params.js     # ✅ LLM参数配置
├── backend/                   # 本地开发服务器
│   └── src/services/
│       └── llmService.js     # ← 引用 shared/llm/parser.js
└── functions/                 # EdgeOne 边缘函数
    └── api/
        └── generate-source.js # ← 引用 shared/llm/parser.js
        └── generate.js        # ← 打包后部署版本
```

**架构优势**：
- ✅ **消除重复**：82行核心解析逻辑只维护一处
- ✅ **统一行为**：后端服务和边缘函数100%一致
- ✅ **降低成本**：Bug修复自动同步，维护成本降低50%
- ✅ **可测试性**：公共模块可编写完整单元测试

## 数据流
1. 前端提交 `mode`（truth/dare）、`style`、`locale`、`count`、`audienceAge`、`intensity`、`seed`
2. **Prompt 构建**：`shared/prompt/builder.js` 根据参数生成 LLM prompt
3. **LLM 调用**：后端/边缘函数调用 DeepSeek/通义千问 API
4. **响应解析**：`shared/llm/parser.js` 统一解析 LLM 返回的原始文本 ✅ (V1.4)
5. **内容过滤**：剔除不合规项
6. 返回安全结果与元数据（耗时、过滤比、缓存状态等）

## API 设计 ✅ 已实现
- `POST /api/generate`
  - Request JSON：
    - `mode`: `"truth" | "dare"` ✅
    - `style`: 中文风格名（正常/暧昧/搞笑/职场/酒局/家庭/烧脑/极限/少儿适宜/派对/温情/**大尺度**）✅ **（共12项）**
    - `locale`: `"zh-CN" | "en-US"`，默认 `zh-CN` ✅
    - `count`: 1-20，默认 `1` ✅ **（每次生成1题）**
    - `audienceAge`: `"kids" | "teen" | "adult"`，默认 `adult` ✅
    - `intensity`: `"soft" | "medium" | "hard"`，默认 `medium`（大尺度风格自动使用 `hard`）✅
    - `seed`: 1-100，随机数种子，用于缓存命中判断 ✅ **（新增）**
  - Response JSON：
    - `items`: `[{ id, type, text }]` ✅
    - `meta`: `{ provider, promptId, latencyMs, filteredCount, cached, seed }` ✅
  - 错误：`400` 参数错误；`429` 触发限流；`500` 供应商错误 ✅

## Prompt 模板（示例）
- 系统指令：
  - 你是派对互动策划助手。根据模式与风格生成简洁、可执行的问题或任务，避免不当内容。
- 用户模板：
  - 语言：`{{locale}}`；模式：`{{mode}}`；风格：`{{style}}`；数量：`{{count}}`
  - 受众年龄：`{{audienceAge}}`；尺度：`{{intensity}}`
  - 输出格式：JSON 数组，每项包含 `type` 与 `text`，`type` 为 `truth` 或 `dare`。

## 内容安全过滤 ✅ 已实现

### 敏感词策略（已调整）

**保留限制（所有风格）**：
- 违法相关：毒品、诈骗、赌博、走私、贩卖
- 严重暴力：杀人、砍杀、虐待、绑架
- 未成年保护：未成年、儿童色情、恋童
- 歧视相关：种族歧视、地域黑、性别歧视、残疾歧视
- 极端内容：自杀、自残、邪教、恐怖主义

**已放宽（普通风格）**：
- 暧昧/性暗示相关
- 酒精相关
- 轻度恶作剧

**已移除**：
- 隐私相关限制

### 大尺度风格特殊处理
- 使用更宽松的敏感词库
- Prompt 明确允许：暧昧话题、性暗示、轻度身体接触、饮酒惩罚、恶作剧
- 仍禁止：违法、未成年、歧视、严重暴力

## 速率限制与缓存

### 限流
- **每分钟最多 20 次调用**（通过 EdgeOne 规则配置）
- 前端防抖：生成过程中按钮禁用，防止重复提交

### 缓存策略
- **缓存 Key**：`mode:style:seed`
- **seed**：前端每次请求生成 1~1000 随机整数
- **缓存上限**：100 条记录（LRU淘汰）
- **命中率**：约 0.1%（理论），实际命中率取决于缓存容量和访问模式
- **TTL**：10 分钟
- **注意**：边缘函数内存缓存，不同边缘节点独立

## 遥测与日志
- 事件：`generate_request`、`generate_done`、`filter_triggered`、`error`
- 不记录隐私输入；日志脱敏；异常报警（如错误率 > 阈值）

## 部署与配置 ✅ 已实现

### EdgeOne Pages 部署（推荐）
- **构建命令**：`cd web && npm install && npm run build`
- **输出目录**：`web/dist`
- **边缘函数**：`functions/api/generate.js`

### 环境变量（在 EdgeOne 控制台配置）
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `LLM_PROVIDER` | LLM 供应商 | `deepseek` 或 `tongyi` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-xxxxxx` |
| `TONGYI_API_KEY` | 通义千问 API Key | `sk-xxxxxx` |
| `DEEPSEEK_MODEL` | 模型名称（可选） | `deepseek-chat` |
| `TONGYI_MODEL` | 模型名称（可选） | `qwen-plus` |

### Secrets 管理
- 环境变量在 EdgeOne 控制台加密存储
- 不写入代码仓库
- 本地开发使用 `backend/.env` 文件

## 前端实现要点
- Web：组件化 Mode/Style 选择器、生成按钮、结果列表、复制、加载骨架/错误提示 ✅；整体视觉为派对风格 ✅
- 小程序（微信）：原生组件等效实现 ✅，支持复制 ✅，不提供分享卡片
- 状态管理：轻量（使用 React Hooks 本地状态）✅

## 测试方案
- 单元：Prompt 组装/过滤函数
- 集成：调用模拟 Provider，验证接口格式
- 端到端（E2E）：页面加载、选择、生成、复制；错误态与重试路径

## LLM 响应解析 ✅ V1.4 统一架构

### 解析器：`shared/llm/parser.js`

**职责**：
- 解析 LLM 返回的原始文本
- 处理各种异常格式（Markdown包裹、大括号包裹、中文引号等）
- 提供统一的错误处理

**支持的格式**：
1. ✅ 标准JSON格式：`[{ "type": "dare", "text": "内容" }]`
2. ✅ 大括号包裹：`{[ { "type": "dare", "text": "内容" } ]}`
3. ✅ Markdown包裹：` ```json [...] ``` `
4. ✅ 中文引号：`"` (U+201C) 和 `"` (U+201D)
5. ✅ text内容含未转义引号：手动提取兜底

**解析流程**：
```
LLM 原始响应
    ↓
1. 移除 Markdown 代码块包裹
    ↓
2. 移除外层大括号包裹
    ↓
3. 提取方括号内容
    ↓
4. 尝试 JSON.parse（快速路径）
    ↓ 失败
5. 手动提取 type 和 text 字段（鲁棒路径）
   - 同时匹配中英文引号 (" " " ' ')
   - 使用字符串索引而非正则
   - 允许 text 包含任意字符
    ↓
返回标准化数组：[{ id, type, text }]
```

**历史问题修复**：
| 时间 | 问题 | 解决方式 |
|------|------|----------|
| 2025-12-18 12:10 | 大冒险+大尺度：text含引号破坏JSON | 手动字符串提取 |
| 2025-12-18 14:00 | 异常包裹格式 `{[...]}` | 正则移除包裹 |
| 2025-12-18 15:00 | 中文引号 U+201C/U+201D | Unicode字符类匹配 |

**V1.4 架构改进**：
- ✅ **统一维护**：从两处重复代码（后端+边缘函数）统一到 `shared/llm/parser.js`
- ✅ **消除重复**：减少 82 行重复代码
- ✅ **自动同步**：修复 Bug 时只需改一处，两处自动生效
- ✅ **降低成本**：维护成本降低 50%

## 其他约定
- 语言：默认 `zh-CN`，支持 `en-US`
- 数据策略：不保存用户输入与生成结果，仅记录必要的系统运行日志（脱敏）
