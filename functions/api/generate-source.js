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
 * 解析 LLM 响应
 */
function parseResponse(rawText) {
  try {
    // 先尝试直接解析
    let jsonString = rawText.trim();
    
    console.log('[LLM] 原始响应:', rawText.substring(0, 500)); // 调试日志
    
    // 清理 Markdown 包裹（如 ```json [...]```）
    // 同时处理异常包裹如 {[...]} 或 ({[...]})
    const jsonMatch = jsonString.match(/\[([\s\S]*)\]/);
    if (jsonMatch) {
      jsonString = `[${jsonMatch[1]}]`;
    }
    
    // 尝试第一次解析
    try {
      const items = JSON.parse(jsonString);
      if (Array.isArray(items)) {
        return items.map((item, index) => ({
          id: `gen-${Date.now()}-${index}`,
          type: item.type,
          text: item.text
        }));
      }
    } catch (firstError) {
      // 第一次解析失败，尝试修复引号问题
      console.warn('[LLM] 首次解析失败，尝试手动提取字段:', firstError.message);
      
      // 更鲁棒的策略：手动提取 type 和 text 字段
      const fixedObjects = [];
      
      // 分割成多个可能的对象
      const objectStrings = jsonString.split(/\},\s*\{/);
      
      for (let objStr of objectStrings) {
        // 补全可能缺失的大括号
        if (!objStr.startsWith('{')) objStr = '{' + objStr;
        if (!objStr.endsWith('}')) objStr = objStr + '}';
        
        // 提取 type 字段（这个通常没问题）
        const typeMatch = objStr.match(/"type"\s*:\s*"(truth|dare)"/);
        if (!typeMatch) continue;
        
        const type = typeMatch[1];
        
        // 提取 text 字段（可能包含未转义的引号）
        // 策略：找到 "text": " 之后，一直到最后的 " 之前的所有内容
        const textStart = objStr.indexOf('"text"');
        const colonIndex = objStr.indexOf(':', textStart);
        const firstQuoteAfterColon = objStr.indexOf('"', colonIndex + 1);
        
        // 从第一个引号后开始，找到倒数第二个引号（最后一个是对象结尾的}前的）
        let textContent = objStr.substring(firstQuoteAfterColon + 1);
        
        // 移除末尾的 "}] 之类的字符
        // 策略：从后往前找到第一个引号，截取到该引号之前
        const lastQuoteIndex = textContent.lastIndexOf('"');
        if (lastQuoteIndex !== -1) {
          textContent = textContent.substring(0, lastQuoteIndex);
        }
        
        fixedObjects.push({
          type: type,
          text: textContent
        });
      }
      
      if (fixedObjects.length > 0) {
        console.log('[LLM] 修复成功，提取到', fixedObjects.length, '个对象');
        return fixedObjects.map((item, index) => ({
          id: `gen-${Date.now()}-${index}`,
          type: item.type,
          text: item.text
        }));
      }
    }

    throw new Error('解析失败：响应不是数组');
  } catch (err) {
    console.error('[LLM] 解析响应失败:', rawText.substring(0, 200), '...', err.message);
    throw new Error(`LLM响应解析失败: ${err.message}`);
  }
}

/**
 * 延迟函数（用于重试）
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带超时和重试的 fetch 请求
 */
async function fetchWithRetry(url, options, attemptNumber = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), llmParams.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    
    const isRetryable = 
      err.name === 'AbortError' ||
      err.message.includes('timeout') ||
      err.message.includes('ECONNRESET') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('ENOTFOUND') ||
      err.message.includes('peer_error') ||
      err.message.includes('network');

    if (isRetryable && attemptNumber < llmParams.retry.maxAttempts) {
      const retryDelay = Math.min(
        llmParams.retry.initialDelay * Math.pow(llmParams.retry.backoffMultiplier, attemptNumber - 1),
        llmParams.retry.maxDelay
      );
      
      console.warn(`[LLM] 第 ${attemptNumber} 次请求失败，${retryDelay}ms 后重试...`, err.message);
      await delay(retryDelay);
      
      return fetchWithRetry(url, options, attemptNumber + 1);
    }
    
    throw err;
  }
}

/**
 * 调用 LLM API
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

  // 使用带重试和超时的 fetch
  const response = await fetchWithRetry(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: llmParams.temperature,
      max_tokens: llmParams.maxTokens,
      frequency_penalty: llmParams.frequencyPenalty,
      presence_penalty: llmParams.presencePenalty
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API 调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content?.trim() || '';
  
  return parseResponse(rawText);
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

