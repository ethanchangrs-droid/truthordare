# 后端服务 - Backend

真心话/大冒险 LLM 生成器的后端 API 服务。

## 技术栈

- **框架**: Express.js
- **语言**: JavaScript (Node.js 16+)
- **LLM**: 通义千问 / DeepSeek (OpenAI 兼容接口)
- **缓存**: node-cache (内存缓存)
- **安全**: bad-words + 自定义敏感词过滤
- **限流**: express-rate-limit

## 项目结构

```
backend/
├── src/
│   ├── server.js                 # 应用入口，Express 服务器配置
│   ├── config/
│   │   └── sensitiveWords.js     # 自定义敏感词配置
│   ├── routes/
│   │   └── generateRoutes.js     # API 路由定义
│   ├── controllers/
│   │   └── generateController.js # 生成接口业务逻辑
│   ├── services/
│   │   ├── llmService.js         # LLM 服务封装（通义/DeepSeek）
│   │   └── cacheService.js       # 缓存服务（MD5 key + 统计）
│   ├── middleware/
│   │   └── rateLimiter.js        # 速率限制中间件
│   └── utils/
│       └── contentFilter.js      # 内容安全过滤工具
├── .env.example                  # 环境变量模板
├── package.json                  # 依赖配置
└── README.md                     # 本文档
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少配置以下内容：

```bash
# 选择 LLM 供应商
LLM_PROVIDER=tongyi  # 或 deepseek

# 通义千问 API Key
TONGYI_API_KEY=sk-xxxxxxxxxxxxxx

# 或 DeepSeek API Key
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxx
```

### 3. 启动服务

```bash
# 开发模式（使用 nodemon，自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3002` 启动。

### 4. 测试接口

```bash
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "truth",
    "style": "正常",
    "count": 3
  }'
```

## 环境变量配置

### 必需配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `LLM_PROVIDER` | LLM 供应商 | `tongyi` 或 `deepseek` |
| `TONGYI_API_KEY` | 通义千问 API Key | `sk-xxx...` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-xxx...` |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3002` |
| `TONGYI_BASE_URL` | 通义千问 API 地址 | `https://dashscope.aliyuncs.com/...` |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | `https://api.deepseek.com/v1` |
| `TONGYI_MODEL` | 通义千问模型名称 | `qwen-plus` |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 | `deepseek-chat` |
| `LLM_TEMPERATURE` | 生成温度 | `0.8` |
| `LLM_MAX_TOKENS` | 最大 token 数 | `1000` |
| `RATE_LIMIT_PER_MINUTE` | 每分钟限流次数 | `60` |
| `CACHE_TTL` | 缓存过期时间（秒） | `600` (10分钟) |

详细说明见 [.env.example](./env.example)。

## API 文档

### POST /api/generate

生成真心话/大冒险题目。

**请求参数**:

```json
{
  "mode": "truth",           // 模式: "truth" 或 "dare"
  "style": "正常",            // 风格: 11种可选（正常/暧昧/搞笑等）
  "locale": "zh-CN",         // 语言: "zh-CN" 或 "en-US"，默认 zh-CN
  "count": 5,                // 数量: 1-20，默认 10
  "audienceAge": "adult",    // 受众: "kids"/"teen"/"adult"，默认 adult
  "intensity": "medium"      // 尺度: "soft"/"medium"/"hard"，默认 medium
}
```

**成功响应** (200):

```json
{
  "items": [
    {
      "id": "gen-1234567890-0",
      "type": "truth",
      "text": "你最尴尬的一次经历是什么？"
    }
  ],
  "meta": {
    "provider": "deepseek",
    "promptId": "prompt-001",
    "latencyMs": 1250,
    "filteredCount": 0,
    "cached": false
  }
}
```

**错误响应**:

- `400` - 参数错误
- `429` - 请求过于频繁（触发限流）
- `500` - 服务器内部错误

## 核心模块说明

### services/llmService.js

LLM 服务封装，支持多供应商：

- **通义千问**: 使用 OpenAI 兼容接口
- **DeepSeek**: 使用 OpenAI 兼容接口
- **Prompt 模板**: 结构化 Prompt 管理
- **响应解析**: JSON 格式验证与转换

### services/cacheService.js

缓存服务，提升性能：

- **缓存策略**: MD5 key 生成（基于请求参数）
- **TTL**: 默认 10 分钟
- **统计信息**: hits/misses/hitRate
- **内存缓存**: 使用 node-cache

### controllers/generateController.js

生成接口业务逻辑：

- 参数校验
- 缓存检查
- LLM 调用
- 内容过滤
- 响应封装

### middleware/rateLimiter.js

速率限制中间件：

- 限制频率: 6 次/分钟
- 基于 IP 地址
- 使用 express-rate-limit

### utils/contentFilter.js

内容安全过滤：

- bad-words 库（英文）
- 自定义敏感词（中文）
- 过滤后统计

## 开发指南

### 添加新的 LLM 供应商

1. 编辑 `services/llmService.js`
2. 在 `initProvider()` 中添加新供应商逻辑
3. 更新 `.env.example`
4. 更新本文档

### 修改 Prompt 模板

编辑 `services/llmService.js` 中的 `buildPrompt()` 方法。

### 添加新的敏感词

编辑 `config/sensitiveWords.js`。

### 调整限流策略

修改 `middleware/rateLimiter.js` 或设置环境变量 `RATE_LIMIT_PER_MINUTE`。

## 测试

```bash
# 测试 API 连接
node test-api-connection.js

# 测试生成接口
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"mode":"truth","style":"正常","count":3}'
```

## 部署

### 使用 PM2

```bash
npm install -g pm2
pm2 start src/server.js --name truthordare-api
```

### 使用 Docker

```bash
docker build -t truthordare-backend .
docker run -p 3002:3002 --env-file .env truthordare-backend
```

### Serverless 部署

参考项目根目录的 `DEPLOY_EDGEONE.md` 文档。

## 常见问题

**Q: LLM API 调用失败？**  
A: 检查 API Key 是否正确，网络是否通畅。

**Q: 缓存未生效？**  
A: 检查相同参数的请求，查看响应中的 `cached` 字段。

**Q: 内容被过滤？**  
A: 查看响应中的 `filteredCount`，调整敏感词配置。

**Q: 如何查看缓存统计？**  
A: 可在 `cacheService.js` 中调用 `getStats()` 方法。

## 相关文档

- [项目总体 README](../README.md)
- [环境变量配置排查报告](../log/环境变量配置排查报告_202512171641.md)
- [EdgeOne 部署指南](../DEPLOY_EDGEONE.md)

## License

MIT