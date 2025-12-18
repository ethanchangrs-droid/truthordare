/**
 * EdgeOne Pages Function - 生成真心话/大冒险题目
 * 
 * ⚠️ 这是源文件，打包后部署到 EdgeOne
 * 使用 `npm run build:functions` 打包成 generate.js
 * 
 * 环境变量配置（在 EdgeOne 控制台设置）：
 * - LLM_PROVIDER: 'tongyi' 或 'deepseek'
 * - TONGYI_API_KEY: 通义千问 API Key
 * - DEEPSEEK_API_KEY: DeepSeek API Key
 */

import { buildPrompt } from '../../shared/prompt/builder.js';
import { llmParams } from '../../shared/config/llm-params.js';
import { parseResponse } from '../../shared/llm/parser.js';

// 敏感词库（已放宽：暧昧/性暗示、酒精、恶作剧；保留：违法、未成年保护、歧视）
const SENSITIVE_WORDS = [
  // 违法相关（保留）
  '毒品', '诈骗', '赌博', '走私', '贩卖',
  // 严重暴力（保留）
  '杀人', '砍杀', '虐待', '绑架',
  // 未成年保护（保留）
  '未成年', '儿童色情', '恋童',
  // 歧视相关（保留）
  '歧视', '种族歧视', '地域黑', '性别歧视', '残疾歧视',
  // 极端内容（保留）
  '自杀', '自残', '邪教', '恐怖主义'
];

// 大尺度风格的敏感词库（更宽松）
const SENSITIVE_WORDS_EXPLICIT = [
  // 违法相关（保留）
  '毒品', '诈骗', '赌博', '走私', '贩卖',
  // 严重暴力（保留）
  '杀人', '砍杀', '虐待', '绑架',
  // 未成年保护（保留）
  '未成年', '儿童色情', '恋童',
  // 歧视相关（保留）
  '歧视', '种族歧视', '地域黑', '性别歧视', '残疾歧视',
  // 极端内容（保留）
  '自杀', '自残', '邪教', '恐怖主义'
];

/**
 * 检查文本是否包含敏感词
 */
function containsSensitive(text, isExplicit = false) {
  const words = isExplicit ? SENSITIVE_WORDS_EXPLICIT : SENSITIVE_WORDS;
  const lowerText = text.toLowerCase();
  return words.some(word => lowerText.includes(word.toLowerCase()));
}

/**
 * 过滤敏感内容
 */
function filterItems(items, isExplicit = false) {
  return items.filter(item => !containsSensitive(item.text, isExplicit));
}

/**
 * 调用 LLM API（带超时和重试）
 * 
 * Bug修复：添加超时控制和自动重试机制
 * 原因：网络不稳定时出现 peer_error、超时等错误，导致生成失败
 * 解决方案：
 * 1. 使用 AbortController 实现 30 秒超时
 * 2. 实现自动重试（最多3次）+ 指数退避
 * 3. 区分可重试错误和不可重试错误
 */
async function callLLM(env, { mode, style, locale, count, audienceAge, intensity, seed }) {
  const provider = env.LLM_PROVIDER || 'deepseek';
  const prompt = buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed });
  
  let apiUrl, apiKey, model;
  
  if (provider === 'tongyi') {
    apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    apiKey = env.TONGYI_API_KEY;
    model = llmParams.models.tongyi;
  } else if (provider === 'deepseek') {
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    apiKey = env.DEEPSEEK_API_KEY;
    model = llmParams.models.deepseek;
  } else {
    throw new Error(`不支持的 LLM 供应商: ${provider}`);
  }

  if (!apiKey) {
    throw new Error(`未配置 ${provider.toUpperCase()}_API_KEY 环境变量`);
  }

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ],
    temperature: llmParams.temperature,
    max_tokens: llmParams.maxTokens,
    frequency_penalty: llmParams.frequencyPenalty,
    presence_penalty: llmParams.presencePenalty
  };

  // 使用重试逻辑
  return await fetchWithRetry(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
}

/**
 * 带超时和重试的 fetch 封装
 * 
 * @param {string} url - API URL
 * @param {object} options - fetch 选项
 * @returns {Promise<Array>} 解析后的题目数组
 */
async function fetchWithRetry(url, options) {
  const { maxAttempts, initialDelay, maxDelay, backoffMultiplier } = llmParams.retry;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 创建 AbortController 实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), llmParams.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API 调用失败: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content?.trim() || '';
      
      return parseResponse(rawText);
    } catch (error) {
      lastError = error;
      
      // 判断是否为可重试错误
      const isRetryable = isRetryableError(error);
      const isLastAttempt = attempt === maxAttempts;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // 计算退避延迟
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      console.log(`[LLM] 第 ${attempt} 次调用失败（${error.message}），${delay}ms 后重试...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error) {
  const errorMsg = error.message?.toLowerCase() || '';
  const errorName = error.name?.toLowerCase() || '';

  // 网络相关错误（可重试）
  const retryablePatterns = [
    'timeout',
    'abort',
    'network',
    'fetch',
    'econnreset',
    'econnrefused',
    'peer_error',
    'socket',
    '502',
    '503',
    '504'
  ];

  // 业务逻辑错误（不可重试）
  const nonRetryablePatterns = [
    '400',
    '401',
    '403',
    '429',
    'api key',
    'invalid'
  ];

  // 先检查不可重试
  if (nonRetryablePatterns.some(pattern => 
    errorMsg.includes(pattern) || errorName.includes(pattern)
  )) {
    return false;
  }

  // 再检查可重试
  return retryablePatterns.some(pattern => 
    errorMsg.includes(pattern) || errorName.includes(pattern)
  );
}

/**
 * 休眠指定毫秒数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 简单的内存缓存
 */
const cache = new Map();

function getCacheKey({ mode, style, seed }) {
  return `${mode}:${style}:${seed}`;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < llmParams.cache.ttl * 1000) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setToCache(key, data) {
  // LRU: 如果缓存满了，删除最旧的一条
  if (cache.size >= llmParams.cache.maxSize) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * 简单的限流器
 */
const rateLimitStore = new Map();

function checkRateLimit(clientIp) {
  const now = Date.now();
  if (!rateLimitStore.has(clientIp)) {
    rateLimitStore.set(clientIp, []);
  }
  
  const requests = rateLimitStore.get(clientIp);
  const windowStart = now - 60 * 1000; // 1 分钟窗口
  rateLimitStore.set(clientIp, requests.filter(ts => ts > windowStart));

  if (rateLimitStore.get(clientIp).length >= llmParams.rateLimit.perMinute) {
    return false;
  }
  
  rateLimitStore.get(clientIp).push(now);
  return true;
}

/**
 * 辅助函数：JSON 响应
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * EdgeOne Functions 入口
 */
export async function onRequest(context) {
  const { request, env } = context;
  const startTime = Date.now();

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return jsonResponse({}, 204);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: '仅支持 POST 请求' }, 405);
  }

  // 限流检查
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ 
      error: `请求过于频繁，请稍后再试（限制：${llmParams.rateLimit.perMinute} 次/分钟）` 
    }, 429);
  }

  try {
    const body = await request.json();
    const {
      mode,
      style,
      locale = 'zh-CN',
      count = 1,
      audienceAge = 'adult',
      intensity: reqIntensity = 'medium',
      seed
    } = body;

    // 参数验证
    if (!mode || !['truth', 'dare'].includes(mode)) {
      return jsonResponse({ error: 'mode 参数无效，必须是 truth 或 dare' }, 400);
    }
    if (!style) {
      return jsonResponse({ error: '缺少 style 参数' }, 400);
    }
    if (count < 1 || count > 20) {
      return jsonResponse({ error: 'count 参数范围为 1-20' }, 400);
    }

    let intensity = reqIntensity;
    if (style === '大尺度') {
      intensity = 'hard';
    }

    const cacheParams = { mode, style, locale, audienceAge, intensity, count, seed };
    const cacheKey = getCacheKey(cacheParams);

    // 检查缓存
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      return jsonResponse({
        ...cachedResult,
        meta: {
          ...cachedResult.meta,
          cached: true,
          latencyMs: Date.now() - startTime,
          seed
        }
      });
    }

    // 调用 LLM
    const rawItems = await callLLM(env, { mode, style, locale, count, audienceAge, intensity, seed });

    // 内容过滤
    const isExplicit = style === '大尺度';
    const filteredItems = filterItems(rawItems, isExplicit);
    const filteredCount = rawItems.length - filteredItems.length;

    // 构建结果
    const result = {
      items: filteredItems,
      meta: {
        provider: env.LLM_PROVIDER || 'deepseek',
        promptId: 'prompt-002',
        latencyMs: Date.now() - startTime,
        filteredCount,
        cached: false,
        seed
      }
    };

    // 缓存结果
    if (filteredItems.length > 0) {
      setToCache(cacheKey, result);
    }

    return jsonResponse(result);
  } catch (err) {
    console.error('[Function] 处理请求失败:', err);
    
    // 细化错误提示
    let errorMsg = '生成失败，请稍后再试';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (err.message.includes('API_KEY') || err.message.includes('未配置')) {
      errorMsg = 'LLM 服务配置错误，请联系管理员';
      errorCode = 'LLM_CONFIG_ERROR';
    } else if (err.message.includes('429')) {
      errorMsg = 'LLM 服务请求频率超限，请稍后再试';
      errorCode = 'LLM_RATE_LIMIT';
    } else if (err.message.includes('401') || err.message.includes('403')) {
      errorMsg = 'LLM 服务认证失败，请检查 API 密钥';
      errorCode = 'LLM_AUTH_ERROR';
    } else if (err.message.includes('解析失败') || err.message.includes('解析响应失败')) {
      errorMsg = 'LLM 响应格式异常，请重试';
      errorCode = 'LLM_PARSE_ERROR';
    } else if (err.message.includes('500') || err.message.includes('502') || err.message.includes('503')) {
      errorMsg = 'LLM 服务暂时不可用，请稍后再试';
      errorCode = 'LLM_SERVICE_ERROR';
    }
    
    return jsonResponse({ 
      error: errorMsg,
      code: errorCode,
      details: err.message  // 保留详细信息用于调试
    }, 500);
  }
}

