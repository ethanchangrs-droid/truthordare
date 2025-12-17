# Services - 服务层

本目录包含核心业务服务模块。

## 模块列表

### llmService.js - LLM 服务

封装大语言模型调用，支持多供应商。

**支持的供应商**:
- `tongyi`: 通义千问（默认），使用 OpenAI 兼容接口
- `deepseek`: DeepSeek API

**环境变量配置**:

```bash
LLM_PROVIDER=tongyi                                                    # 或 deepseek
TONGYI_API_KEY=sk-xxx                                                  # 通义千问 API Key
DEEPSEEK_API_KEY=sk-xxx                                                # DeepSeek API Key
TONGYI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1     # 可选
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1                         # 可选
TONGYI_MODEL=qwen-plus                                                 # 可选
DEEPSEEK_MODEL=deepseek-chat                                           # 可选
```

**使用示例**:

```javascript
import llmService from './services/llmService.js';

const items = await llmService.generate({
  mode: 'truth',          // 'truth' 或 'dare'
  style: '搞笑',           // 风格名称
  locale: 'zh-CN',        // 'zh-CN' 或 'en-US'
  count: 10,              // 1-20
  audienceAge: 'adult',   // 'kids'/'teen'/'adult'
  intensity: 'medium'     // 'soft'/'medium'/'hard'
});

// 返回格式: [{ id, type, text }, ...]
```

**输出格式**:

```javascript
[
  {
    id: 'gen-1234567890-0',
    type: 'truth',
    text: '你最尴尬的一次经历是什么？'
  }
]
```

---

### cacheService.js - 缓存服务

基于内存的缓存服务，提升性能并降低 LLM API 调用成本。

**功能特性**:
- ✅ MD5 key 生成（基于请求参数）
- ✅ TTL 过期机制（默认 10 分钟）
- ✅ 缓存统计（hits/misses/hitRate）
- ✅ 自动清理过期数据

**环境变量配置**:

```bash
CACHE_TTL=600  # 缓存过期时间（秒），默认 10 分钟
```

**使用示例**:

```javascript
import cacheService from './services/cacheService.js';

// 生成缓存参数
const params = { mode, style, locale, audienceAge, intensity, count };

// 1. 检查缓存
const cached = cacheService.get(params);
if (cached) {
  return cached;  // 缓存命中
}

// 2. 调用 LLM（缓存未命中）
const result = await llmService.generate(params);

// 3. 存入缓存
cacheService.set(params, { items: result, meta: {...} });

// 4. 查看统计
const stats = cacheService.getStats();
console.log(stats);
// { hits: 10, misses: 5, hitRate: '66.67%', keys: 5 }
```

**缓存策略**:

- **Key 生成**: `MD5(mode:style:locale:audienceAge:intensity:count)`
- **存储位置**: 内存（node-cache）
- **TTL**: 600 秒（10 分钟）
- **清理机制**: 自动检查（每 2 分钟）

**性能提升**:

- 命中缓存: ~0ms 延迟
- 未命中: ~3-5s 延迟（LLM 调用）
- 成本节省: 减少重复 LLM API 调用

---

## 添加新服务

### 1. 创建服务文件

```javascript
// emailService.js
class EmailService {
  constructor() {
    this.config = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
    };
  }

  async send(to, subject, body) {
    // 实现发送邮件逻辑
  }
}

export default new EmailService();
```

### 2. 在 controller 中使用

```javascript
import emailService from '../services/emailService.js';

await emailService.send('user@example.com', 'Hello', 'Content');
```

### 3. 更新本 README

在上方"模块列表"中添加新服务的说明。

---

## 最佳实践

### 单例模式

服务应该导出单例，避免重复实例化：

```javascript
export default new MyService();  // ✅ 推荐
// export default MyService;     // ❌ 不推荐
```

### 错误处理

服务应该抛出有意义的错误：

```javascript
async generate(params) {
  try {
    return await this.client.chat.completions.create(...);
  } catch (err) {
    throw new Error(`LLM调用失败: ${err.message}`);
  }
}
```

### 配置管理

使用环境变量管理配置，提供默认值：

```javascript
this.timeout = parseInt(process.env.LLM_TIMEOUT || '30000');
this.retries = parseInt(process.env.LLM_RETRIES || '3');
```

---

## 相关文档

- [后端 README](../../README.md)
- [Controllers README](../controllers/README.md)
- [Middleware README](../middleware/README.md)
