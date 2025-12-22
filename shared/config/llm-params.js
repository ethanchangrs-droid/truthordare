/**
 * LLM 参数配置 - 公共模块
 * 
 * ⚠️ 单一真实源：所有 LLM 参数统一在此配置
 * 
 * 本文件被以下模块引用：
 * - backend/src/services/llmService.js
 * - functions/api/generate.js (通过打包)
 * 
 * 修改此文件后：
 * 1. backend 自动生效（nodemon 热重载）
 * 2. functions 需要运行 `npm run build:functions` 重新打包
 */

/**
 * LLM 调用参数配置
 */
export const llmParams = {
  // 🎲 采样参数
  temperature: 1.0,          // 随机性（0-2，越高越随机）
  maxTokens: 1000,           // 最大生成 token 数
  frequencyPenalty: 1.5,     // 重复词惩罚（-2 到 2，正值减少重复）
  presencePenalty: 1.2,      // 话题惩罚（-2 到 2，正值鼓励新话题）
  
  // 🤖 模型配置
  models: {
    tongyi: 'qwen-plus',     // 可选: qwen-max, qwen-turbo
    deepseek: 'deepseek-chat'
  },
  
  // 💾 缓存配置
  cache: {
    ttl: 600,                // TTL（秒）- 10 分钟
    maxSize: 100             // 最大缓存条数（LRU）
  },
  
  // 🚦 限流配置
  rateLimit: {
    perMinute: 60            // 每分钟最大请求次数
  },
  
  // ⏱️ 超时与重试配置
  // Bug修复：网络异常 peer_error - 添加超时控制和自动重试
  // 原因：无超时导致连接挂起，无重试导致瞬时网络故障直接失败
  // 解决方案：30秒超时 + 最多3次重试 + 指数退避
  timeout: 30000,            // 超时时间（毫秒）- 30秒
  retry: {
    maxAttempts: 3,          // 最多重试次数
    initialDelay: 1000,      // 初始延迟（毫秒）
    maxDelay: 5000,          // 最大延迟（毫秒）
    backoffMultiplier: 2     // 指数退避倍数
  }
};

/**
 * 参数调优指南
 */
export const ParamsTuningGuide = {
  temperature: {
    description: '控制输出的随机性和创造性',
    range: '0-2',
    current: 1.0,
    tips: [
      '0.7-0.9: 更确定、一致的输出',
      '1.0-1.2: 平衡随机性和质量（推荐）',
      '1.3-2.0: 更有创意，但可能不稳定'
    ]
  },
  frequencyPenalty: {
    description: '降低已出现词汇的重复概率',
    range: '-2 到 2',
    current: 1.5,
    tips: [
      '0.0: 不惩罚重复',
      '0.5-1.0: 轻度减少重复',
      '1.0-1.5: 中度减少重复（推荐）',
      '1.5-2.0: 强力避免重复'
    ]
  },
  presencePenalty: {
    description: '鼓励模型探索新话题',
    range: '-2 到 2',
    current: 1.2,
    tips: [
      '0.0: 不鼓励新话题',
      '0.5-1.0: 轻度鼓励',
      '1.0-1.5: 中度鼓励（推荐）',
      '1.5-2.0: 强力鼓励新话题'
    ]
  },
  maxTokens: {
    description: '单次生成的最大 token 数',
    range: '1-8192',
    current: 1000,
    tips: [
      '500: 适合单条短内容',
      '1000: 单条中等内容（推荐）',
      '2000+: 多条或长内容'
    ]
  }
};

