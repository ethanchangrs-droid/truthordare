# 速率限制中间件说明

## 功能
- 基于 IP 地址的请求频率限制
- 默认策略：每分钟最多 6 次 `/api/generate` 调用

## 配置
- 环境变量：
  - `RATE_LIMIT_WINDOW_MS`：时间窗口（毫秒，默认 60000）
  - `RATE_LIMIT_MAX`：最大请求数（默认 6）

## 使用方式
```js
// server.js
import { createRateLimiter } from './middleware/rateLimiter.js';
app.use('/api', createRateLimiter()); // 对 /api 路由组应用限流
```

## 响应格式
```json
{
  "error": "请求过于频繁，请稍后再试（限制：6 次/60秒）"
}
```