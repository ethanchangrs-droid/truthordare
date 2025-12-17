/**
 * EdgeOne Pages Function - 生成真心话/大冒险题目
 * 
 * 环境变量配置（在 EdgeOne 控制台设置）：
 * - LLM_PROVIDER: 'tongyi' 或 'deepseek'
 * - TONGYI_API_KEY: 通义千问 API Key
 * - DEEPSEEK_API_KEY: DeepSeek API Key
 */

// 敏感词库（简化版，边缘函数不支持 bad-words 库）
const SENSITIVE_WORDS = [
  '暴力', '打人', '伤害', '虐待', '恐吓', '斗殴', '砍杀',
  '色情', '性爱', '裸体', '三级片', '成人', '黄色', '性交易',
  '政治', '政府', '国家', '领导人', '颠覆', '反政府', '游行',
  '歧视', '侮辱', '骂人', '脏话', '种族', '地域黑', '性别歧视',
  '身份证', '手机号', '住址', '银行卡', '密码', '隐私', '个人信息',
  '自杀', '毒品', '赌博', '宗教', '邪教', '迷信', '诈骗'
];

/**
 * 检查文本是否包含敏感词
 */
function containsSensitive(text) {
  const lowerText = text.toLowerCase();
  return SENSITIVE_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

/**
 * 过滤敏感内容
 */
function filterItems(items) {
  return items.filter(item => !containsSensitive(item.text));
}

/**
 * 构建 Prompt
 */
function buildPrompt({ mode, style, locale, count, audienceAge, intensity }) {
  const systemPrompt = `
你是派对互动策划助手。根据模式与风格生成简洁、可执行的问题或任务，避免不当内容。
输出格式为严格的 JSON 数组，每项包含 type（truth/dare）与 text（题目内容）。
示例：
[
  {"type": "truth", "text": "你最尴尬的一次经历是什么？"},
  {"type": "dare", "text": "模仿一种动物叫声持续10秒"}
]
`;
  const userPrompt = `
语言：${locale}；模式：${mode}；风格：${style}；数量：${count}
受众年龄：${audienceAge}；尺度：${intensity}
请生成 ${count} 条符合要求的内容，严格遵守 JSON 格式。
`;
  return { system: systemPrompt.trim(), user: userPrompt.trim() };
}

/**
 * 解析 LLM 响应
 */
function parseResponse(rawText) {
  try {
    // 清理 Markdown 包裹（如 ```json [...]```）
    const jsonMatch = rawText.match(/\[([\s\S]*)\]/);
    const jsonString = jsonMatch ? `[${jsonMatch[1]}]` : rawText;
    const items = JSON.parse(jsonString);

    if (!Array.isArray(items)) {
      throw new Error('解析失败：响应不是数组');
    }

    return items.map((item, index) => ({
      id: `gen-${Date.now()}-${index}`,
      type: item.type,
      text: item.text
    }));
  } catch (err) {
    console.error('[LLM] 解析响应失败:', rawText, err.message);
    throw new Error(`LLM响应解析失败: ${err.message}`);
  }
}

/**
 * 调用 LLM API
 */
async function callLLM(env, { mode, style, locale, count, audienceAge, intensity }) {
  const provider = env.LLM_PROVIDER || 'tongyi';
  const prompt = buildPrompt({ mode, style, locale, count, audienceAge, intensity });
  
  let apiUrl, apiKey, model;
  
  if (provider === 'tongyi') {
    apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    apiKey = env.TONGYI_API_KEY;
    model = env.TONGYI_MODEL || 'qwen-plus';
  } else if (provider === 'deepseek') {
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    apiKey = env.DEEPSEEK_API_KEY;
    model = env.DEEPSEEK_MODEL || 'deepseek-chat';
  } else {
    throw new Error(`不支持的 LLM 供应商: ${provider}`);
  }

  if (!apiKey) {
    throw new Error(`未配置 ${provider.toUpperCase()}_API_KEY 环境变量`);
  }

  const response = await fetch(apiUrl, {
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
      temperature: 0.8,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API 调用失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content?.trim() || '';
  
  return parseResponse(rawText);
}

/**
 * 简单的内存缓存（边缘函数中缓存生命周期较短）
 */
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

function getCacheKey(params) {
  return JSON.stringify(params);
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setToCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * EdgeOne Pages Function 入口
 */
export async function onRequest(context) {
  const { request, env } = context;
  const startTime = Date.now();

  // CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // 只接受 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { 
      mode, 
      style, 
      locale = 'zh-CN', 
      count = 10, 
      audienceAge = 'adult', 
      intensity = 'medium' 
    } = body;

    // 参数校验
    if (!mode || !['truth', 'dare'].includes(mode)) {
      return jsonResponse({ error: '无效的模式，必须是 truth 或 dare' }, 400);
    }

    if (!style || typeof style !== 'string') {
      return jsonResponse({ error: '无效的风格，必须是非空字符串' }, 400);
    }

    if (typeof count !== 'number' || count <= 0 || count > 20) {
      return jsonResponse({ error: '无效的数量，必须是1-20之间的数字' }, 400);
    }

    if (!['zh-CN', 'en-US'].includes(locale)) {
      return jsonResponse({ error: '不支持的语言，仅支持 zh-CN 或 en-US' }, 400);
    }

    if (!['kids', 'teen', 'adult'].includes(audienceAge)) {
      return jsonResponse({ error: '无效的受众年龄，必须是 kids, teen 或 adult' }, 400);
    }

    if (!['soft', 'medium', 'hard'].includes(intensity)) {
      return jsonResponse({ error: '无效的尺度，必须是 soft, medium 或 hard' }, 400);
    }

    const cacheParams = { mode, style, locale, audienceAge, intensity, count };
    const cacheKey = getCacheKey(cacheParams);

    // 检查缓存
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      return jsonResponse({
        ...cachedResult,
        meta: {
          ...cachedResult.meta,
          cached: true,
          latencyMs: Date.now() - startTime
        }
      });
    }

    // 调用 LLM
    const rawItems = await callLLM(env, { mode, style, locale, count, audienceAge, intensity });

    // 内容过滤
    const filteredItems = filterItems(rawItems);
    const filteredCount = rawItems.length - filteredItems.length;

    const result = {
      items: filteredItems,
      meta: {
        provider: env.LLM_PROVIDER || 'tongyi',
        promptId: 'prompt-001',
        latencyMs: Date.now() - startTime,
        filteredCount,
        cached: false
      }
    };

    // 缓存结果
    if (filteredItems.length > 0) {
      setToCache(cacheKey, result);
    }

    return jsonResponse(result);

  } catch (err) {
    console.error('[EdgeFunction] 生成失败:', err.message);
    
    if (err.message.includes('API key') || err.message.includes('API_KEY')) {
      return jsonResponse({ 
        error: 'LLM服务配置错误，请检查环境变量中的API密钥', 
        code: 'LLM_CONFIG_ERROR' 
      }, 500);
    }
    
    return jsonResponse({ error: `生成失败: ${err.message}` }, 500);
  }
}

/**
 * 返回 JSON 响应
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

