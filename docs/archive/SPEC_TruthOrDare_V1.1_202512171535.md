# 真心话 / 大冒险 LLM 生成器 技术设计（SPEC）

版本: V1.2_202512171730  
更新时间(UTC+8): 2025-12-17 17:30:00 CST

## 版本记录
| 版本 | 日期 | 更新内容 |
|------|------|---------|
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

## 数据流
1. 前端提交 `mode`（truth/dare）、`style`、`locale`、`count`、`audienceAge`、`intensity`
2. 后端拼装 Prompt，调用 Provider，获取候选列表
3. 过滤层剔除不合规项，返回安全结果与元数据（耗时、过滤比等）

## API 设计 ✅ 已实现
- `POST /api/generate`
  - Request JSON：
    - `mode`: `"truth" | "dare"` ✅
    - `style`: 中文风格名（正常/暧昧/搞笑/职场/酒局/家庭/烧脑/极限/少儿适宜/派对/温情）✅
    - `locale`: `"zh-CN" | "en-US"`，默认 `zh-CN` ✅
    - `count`: 1-20，默认 `10`（前端默认 `5`）✅
    - `audienceAge`: `"kids" | "teen" | "adult"`，默认 `adult` ✅
    - `intensity`: `"soft" | "medium" | "hard"`，默认 `medium` ✅
  - Response JSON：
    - `items`: `[{ id, type, text }]` ✅
    - `meta`: `{ provider, promptId, latencyMs, filteredCount }` ✅
  - 错误：`400` 参数错误；`429` 触发限流；`500` 供应商错误 ✅

## Prompt 模板（示例）
- 系统指令：
  - 你是派对互动策划助手。根据模式与风格生成简洁、可执行的问题或任务，避免不当内容。
- 用户模板：
  - 语言：`{{locale}}`；模式：`{{mode}}`；风格：`{{style}}`；数量：`{{count}}`
  - 受众年龄：`{{audienceAge}}`；尺度：`{{intensity}}`
  - 输出格式：JSON 数组，每项包含 `type` 与 `text`，`type` 为 `truth` 或 `dare`。

## 内容安全过滤 ✅ 已实现
- 供应商安全开关开启（如 `moderation`/`safety`）
- 本地规则：使用 `bad-words` 库 + 自定义敏感词（`config/sensitiveWords.js`）✅
- 策略：超出限制直接剔除 ✅；不足 `count` 时允许补生成一次（待实现）

## 速率限制与缓存
- 限流：按 IP/会话 每分钟最多 6 次调用（边缘函数内实现，或通过 EdgeOne 规则）
- 缓存：边缘函数内存缓存，`key = hash(mode, style, locale, audienceAge, intensity, count)`，TTL 10 分钟 ✅

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

## 其他约定
- 语言：默认 `zh-CN`，支持 `en-US`
- 数据策略：不保存用户输入与生成结果，仅记录必要的系统运行日志（脱敏）
