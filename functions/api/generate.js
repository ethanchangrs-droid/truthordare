/**
 * EdgeOne Pages Function - 生成真心话/大冒险题目
 * 
 * 环境变量配置（在 EdgeOne 控制台设置）：
 * - LLM_PROVIDER: 'tongyi' 或 'deepseek'
 * - TONGYI_API_KEY: 通义千问 API Key
 * - DEEPSEEK_API_KEY: DeepSeek API Key
 * 
 * 更新记录：
 * - 2025-12-17: 新增 seed 参数用于缓存；新增"大尺度"风格；调整敏感词库；限流 20次/分钟
 */

// 敏感词库（已放宽：暧昧/性暗示、酒精、恶作剧；保留：违法、未成年保护、歧视）
// 注意：隐私相关限制已移除
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
 * @param {string} text - 待检查文本
 * @param {boolean} isExplicit - 是否为大尺度模式
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
 * 构建 Prompt
 */
function buildPrompt({ mode, style, locale, count, audienceAge, intensity }) {
  // 大尺度风格的特殊 Prompt
  const isExplicit = style === '大尺度';
  
  let systemPrompt;
  if (isExplicit) {
    systemPrompt = `
你是成人派对互动策划助手。根据模式生成大胆、刺激的问题或任务，适合18岁以上成人聚会。
可以包含：暧昧话题、性暗示、轻度身体接触挑战、饮酒惩罚、恶作剧挑战等。
禁止包含：违法内容、涉及未成年人、歧视性内容、严重暴力。
输出格式为严格的 JSON 数组，每项包含 type（truth/dare）与 text（题目内容）。
示例：
[
  {"type": "truth", "text": "你最大胆的一次约会经历是什么？"},
  {"type": "dare", "text": "选一个人，用眼神对视30秒不许笑"}
]
`;
  } else {
    systemPrompt = `
你是派对互动策划助手。根据模式与风格生成简洁、可执行的问题或任务，避免不当内容。
输出格式为严格的 JSON 数组，每项包含 type（truth/dare）与 text（题目内容）。
示例：
[
  {"type": "truth", "text": "你最尴尬的一次经历是什么？"},
  {"type": "dare", "text": "模仿一种动物叫声持续10秒"}
]
`;
  }

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
  const provider = env.LLM_PROVIDER || 'deepseek'; // 默认使用 DeepSeek
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
      temperature: 0.9, // 提高随机性
      max_tokens: 500   // 单条内容不需要太多 token
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
 * 注意：不同边缘节点的缓存是独立的
 */
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

/**
 * 生成缓存 Key
 * 使用 mode, style, seed 作为缓存键（约 1% 命中率）
 */
function getCacheKey({ mode, style, seed }) {
  return `${mode}:${style}:${seed}`;
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
      count = 1, // 默认生成 1 条
      audienceAge = 'adult', 
      intensity = 'medium',
      seed = 1 // 随机数种子，用于缓存
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

    // 缓存 Key：mode + style + seed（约 1% 命中率）
    const cacheKey = getCacheKey({ mode, style, seed });

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
    const rawItems = await callLLM(env, { mode, style, locale, count, audienceAge, intensity });

    // 内容过滤（大尺度风格使用宽松过滤）
    const isExplicit = style === '大尺度';
    const filteredItems = filterItems(rawItems, isExplicit);
    const filteredCount = rawItems.length - filteredItems.length;

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
