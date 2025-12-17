# 后端服务说明

## 项目结构
- `src/`
  - `server.js`：入口文件
  - `routes/`：路由定义
  - `controllers/`：业务逻辑控制器
  - `services/`：LLM 调用与 Prompt 管理
  - `middleware/`：速率限制、日志等中间件
  - `utils/`：工具函数（如内容过滤）
  - `models/`：数据模型（当前为空，因不持久化）

## 开发与运行

### 首次运行
1. 安装依赖：`npm install`
2. 配置环境变量：
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填写必要的 API Key
   ```
3. 启动服务：`npm run dev`（开发模式）或 `npm start`（生产模式）

### 环境变量配置

**必需配置**：
- `LLM_PROVIDER`：LLM 供应商，可选 `tongyi`（默认）或 `deepseek`
- `TONGYI_API_KEY`：通义千问 API Key（如使用通义千问）
- `DEEPSEEK_API_KEY`：DeepSeek API Key（如使用 DeepSeek）

**可选配置**：
- `PORT`：服务端口，默认 `3002`
- `TONGYI_BASE_URL`：通义千问 API 地址，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `DEEPSEEK_BASE_URL`：DeepSeek API 地址，默认 `https://api.deepseek.com/v1`
- `TONGYI_MODEL`：通义千问模型，默认 `qwen-plus`
- `DEEPSEEK_MODEL`：DeepSeek 模型，默认 `deepseek-chat`
- `LLM_TEMPERATURE`：生成温度，默认 `0.8`
- `LLM_MAX_TOKENS`：最大 token 数，默认 `1000`
- `RATE_LIMIT_PER_MINUTE`：每分钟限流次数，默认 `6`
- `CACHE_TTL`：缓存过期时间（秒），默认 `600`（10分钟）

详细配置说明请参考 `.env.example` 文件。

## 接口
- `POST /api/generate`
  - 请求体：`{ mode, style, locale, count, audienceAge, intensity }`
  - 响应：`{ items: [{ id, type, text }], meta: { ... } }`