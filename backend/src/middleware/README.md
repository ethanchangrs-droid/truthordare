# Middleware - 中间件层

本目录包含 Express 中间件模块，用于请求预处理、安全防护等。

## 模块列表

### rateLimiter.js - 速率限制

防止 API 滥用的限流中间件。

**功能**:
- ✅ 基于 IP 地址限流
- ✅ 可配置时间窗口和最大请求数
- ✅ 超限返回 429 错误
- ✅ 友好的错误提示

**环境变量配置**:

```bash
RATE_LIMIT_WINDOW_MS=60000  # 时间窗口（毫秒），默认 60000（1分钟）
RATE_LIMIT_MAX=6            # 最大请求数，默认 6
```

**使用示例**:

```javascript
// server.js
import { createRateLimiter } from './middleware/rateLimiter.js';

// 方式1：应用到所有 API 路由
app.use('/api', createRateLimiter());

// 方式2：应用到特定路由
import rateLimiter from './middleware/rateLimiter.js';
app.post('/api/generate', rateLimiter, generateController);
```

**限流策略**:

- **窗口**: 1 分钟（滚动窗口）
- **限制**: 6 次请求/IP/分钟
- **标识**: 基于客户端 IP 地址
- **算法**: 固定窗口计数器

**响应格式**:

当触发限流时（429 Too Many Requests）：

```json
{
  "error": "请求过于频繁，请稍后再试（限制：6 次/60秒）"
}
```

**调整建议**:

- 开发环境: 可设置更高的限制（如 60 次/分钟）
- 生产环境: 根据实际需求调整（如 6 次/分钟）
- 付费用户: 可实现差异化限流

---

## 添加新中间件

### 示例1：日志中间件

```javascript
// logger.js
export default function logger(req, res, next) {
  const start = Date.now();
  
  // 请求日志
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // 响应日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}
```

### 示例2：认证中间件

```javascript
// auth.js
export default function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: '未授权访问',
      code: 'UNAUTHORIZED'
    });
  }
  
  try {
    // 验证 token
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ 
      error: 'Token 无效或已过期',
      code: 'INVALID_TOKEN'
    });
  }
}
```

### 示例3：CORS 中间件

```javascript
// cors.js
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:5174',     // 开发环境
  'https://your-domain.com',   // 生产环境
];

export default cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允许的来源'));
    }
  },
  credentials: true,
});
```

### 示例4：错误处理中间件

```javascript
// errorHandler.js
export default function errorHandler(err, req, res, next) {
  console.error('错误详情:', err);
  
  // 根据错误类型返回不同响应
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: '参数验证失败',
      details: err.details,
    });
  }
  
  if (err.status === 429) {
    return res.status(429).json({
      error: '请求过于频繁',
    });
  }
  
  // 默认 500 错误
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_ERROR',
  });
}
```

---

## 中间件最佳实践

### 1. 顺序很重要

```javascript
// ✅ 正确顺序
app.use(cors());           // 1. CORS（最先）
app.use(logger());         // 2. 日志
app.use(express.json());   // 3. 请求体解析
app.use(auth());           // 4. 认证
app.use(rateLimiter);      // 5. 限流
app.use('/api', routes);   // 6. 路由
app.use(errorHandler);     // 7. 错误处理（最后）
```

### 2. 异步中间件

```javascript
// ✅ 使用 try-catch
export default async function asyncMiddleware(req, res, next) {
  try {
    await someAsyncOperation();
    next();
  } catch (err) {
    next(err);  // 传递给错误处理中间件
  }
}
```

### 3. 条件中间件

```javascript
// 根据条件应用中间件
export default function conditionalAuth(req, res, next) {
  const publicPaths = ['/api/public', '/api/health'];
  
  if (publicPaths.includes(req.path)) {
    return next();  // 跳过认证
  }
  
  // 执行认证逻辑
  return auth(req, res, next);
}
```

### 4. 工厂模式

```javascript
// 创建可配置的中间件
export function createRateLimiter(options = {}) {
  const { windowMs = 60000, max = 6 } = options;
  
  return rateLimit({
    windowMs,
    max,
    message: `请求过于频繁（限制：${max} 次/${windowMs/1000}秒）`,
  });
}
```

---

## 常用中间件库

| 库名 | 用途 | 项目使用 |
|------|------|---------|
| `express-rate-limit` | 速率限制 | ✅ 已使用 |
| `helmet` | 安全头部 | ⏳ 待添加 |
| `morgan` | HTTP 日志 | ⏳ 待添加 |
| `cors` | 跨域处理 | ✅ 已使用 |
| `compression` | Gzip 压缩 | ⏳ 待添加 |
| `body-parser` | 请求体解析 | ✅ 已使用（Express 内置） |

---

## 相关文档

- [后端 README](../../README.md)
- [Services README](../services/README.md)
- [Controllers README](../controllers/README.md)
- [Express 中间件文档](https://expressjs.com/en/guide/using-middleware.html)
