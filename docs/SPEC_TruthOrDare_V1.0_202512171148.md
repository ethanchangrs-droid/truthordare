# 真心话 / 大冒险 LLM 生成器 技术设计（SPEC）

版本: V1.0_202512171157  
更新时间(UTC+8): 2025-12-17 11:57:33 CST

## 总体架构
- 前端 Web（SPA/SSR）与小程序端（仅微信）
- 后端生成服务 `/api/generate`（可选：Serverless 或常驻服务）
- LLM Provider（通义千问优先，DeepSeek 备选），封装统一接口与 Prompt 模板
- 内容安全过滤层（供应商过滤 + 本地规则）

## 数据流
1. 前端提交 `mode`（truth/dare）、`style`、`locale`、`count`、`audienceAge`、`intensity`
2. 后端拼装 Prompt，调用 Provider，获取候选列表
3. 过滤层剔除不合规项，返回安全结果与元数据（耗时、过滤比等）

## API 设计
- `POST /api/generate`
  - Request JSON：
    - `mode`: `"truth" | "dare"`
    - `style`: 如 `"normal" | "flirty" | "funny" | "work" | ...`（最终以枚举表为准）
    - `locale`: `"zh-CN" | "en-US"` 等
    - `count`: 默认 `10`
    - `audienceAge`: `"kids" | "teen" | "adult"`
    - `intensity`: `"soft" | "medium" | "hard"`
  - Response JSON：
    - `items`: `[{ id, type, text }]`
    - `meta`: `{ provider, promptId, latencyMs, filteredCount }`
  - 错误：`400` 参数错误；`429` 触发限流；`500` 供应商错误

## Prompt 模板（示例）
- 系统指令：
  - 你是派对互动策划助手。根据模式与风格生成简洁、可执行的问题或任务，避免不当内容。
- 用户模板：
  - 语言：`{{locale}}`；模式：`{{mode}}`；风格：`{{style}}`；数量：`{{count}}`
  - 受众年龄：`{{audienceAge}}`；尺度：`{{intensity}}`
  - 输出格式：JSON 数组，每项包含 `type` 与 `text`，`type` 为 `truth` 或 `dare`。

## 内容安全过滤
- 供应商安全开关开启（如 `moderation`/`safety`）
- 本地规则：敏感词/歧视/暴力/涉政/涉黄/人身攻击/隐私数据（PII）
- 策略：超出限制直接剔除；不足 `count` 时允许补生成一次

## 速率限制与缓存
- 限流：按 IP/会话 每分钟最多 6 次调用（宽松策略，即 360 次/小时）
- 缓存：`key = hash(mode, style, locale, audienceAge, intensity)`，TTL 10 分钟（仅内存，不持久化用户数据）

## 遥测与日志
- 事件：`generate_request`、`generate_done`、`filter_triggered`、`error`
- 不记录隐私输入；日志脱敏；异常报警（如错误率 > 阈值）

## 部署与配置
- 环境变量：`LLM_PROVIDER`（`tongyi` | `deepseek`）、`LLM_API_KEY` 或特定 `TONGYI_API_KEY`/`DEEPSEEK_API_KEY`、`RATE_LIMIT_PER_MINUTE`=6
- Secrets 管理：不写入仓库；本地 `.env` 或托管密钥方案
- 可选：Serverless（如 Cloudflare/Netlify/Vercel Functions）或腾讯 EdgeOne 托管（Web 端后续支持）

## 前端实现要点
- Web：组件化 Mode/Style 选择器、生成按钮、结果列表、复制、加载骨架/错误提示；整体视觉为派对风格
- 小程序（微信）：原生组件等效实现，支持复制，不提供分享卡片
- 状态管理：轻量（使用本地状态即可），必要时引入 Store

## 测试方案
- 单元：Prompt 组装/过滤函数
- 集成：调用模拟 Provider，验证接口格式
- 端到端（E2E）：页面加载、选择、生成、复制；错误态与重试路径

## 其他约定
- 语言：默认 `zh-CN`，支持 `en-US`
- 数据策略：不保存用户输入与生成结果，仅记录必要的系统运行日志（脱敏）
