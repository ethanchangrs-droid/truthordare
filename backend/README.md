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
- 安装依赖：`npm install`
- 启动服务：`npm start` 或 `npm run dev`（开发模式）

## 环境变量
- `.env` 文件中配置：
  - `LLM_PROVIDER`：`tongyi`（默认）或 `deepseek`
  - `TONGYI_API_KEY` 或 `DEEPSEEK_API_KEY`
  - `RATE_LIMIT_PER_MINUTE`=6

## 接口
- `POST /api/generate`
  - 请求体：`{ mode, style, locale, count, audienceAge, intensity }`
  - 响应：`{ items: [{ id, type, text }], meta: { ... } }`