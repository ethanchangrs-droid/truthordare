import llmService from '../services/llmService.js';
import { ContentFilter } from '../utils/contentFilter.js';
import cacheService from '../services/cacheService.js';

export const generateQuestions = async (req, res) => {
  const { mode, style, locale = 'zh-CN', count = 1, audienceAge = 'adult', intensity = 'medium', seed = 1 } = req.body;

  // 参数校验
  if (!mode || !['truth', 'dare'].includes(mode)) {
    return res.status(400).json({ error: '无效的模式，必须是 truth 或 dare' });
  }

  if (!style || typeof style !== 'string') {
    return res.status(400).json({ error: '无效的风格，必须是非空字符串' });
  }

  if (typeof count !== 'number' || count <= 0 || count > 20) {
    return res.status(400).json({ error: '无效的数量，必须是1-20之间的数字' });
  }

  if (!['zh-CN', 'en-US'].includes(locale)) {
    return res.status(400).json({ error: '不支持的语言，仅支持 zh-CN 或 en-US' });
  }

  if (!['kids', 'teen', 'adult'].includes(audienceAge)) {
    return res.status(400).json({ error: '无效的受众年龄，必须是 kids, teen 或 adult' });
  }

  if (!['soft', 'medium', 'hard'].includes(intensity)) {
    return res.status(400).json({ error: '无效的尺度，必须是 soft, medium 或 hard' });
  }

  // 缓存参数：使用 mode + style + seed（约 1% 命中率）
  const cacheParams = { mode, style, seed };

  try {
    // 0. 检查缓存
    const cachedResult = cacheService.get(cacheParams);
    if (cachedResult) {
      return res.json({
        ...cachedResult,
        meta: {
          ...cachedResult.meta,
          cached: true,
          latencyMs: Date.now() - req.startTime,
        }
      });
    }

    // 1. 调用 LLM 服务（包含 seed 参数以增加题目多样性）
    const rawItems = await llmService.generate({ mode, style, locale, count, audienceAge, intensity, seed });

    // 2. 内容安全过滤
    const filteredItems = ContentFilter.filterItems(rawItems);
    const filteredCount = rawItems.length - filteredItems.length;

    // 3. 构建结果
    const result = {
      items: filteredItems,
      meta: {
        provider: llmService.provider,
        promptId: 'prompt-002',
        latencyMs: Date.now() - req.startTime,
        filteredCount,
        cached: false,
        seed
      }
    };

    // 4. 缓存结果（仅当有有效结果时）
    if (filteredItems.length > 0) {
      cacheService.set(cacheParams, result);
    }

    // 5. 返回结果
    res.json(result);
  } catch (err) {
    console.error('[Controller] 生成失败:', err.message);
    // 如果是API密钥错误，返回更友好的提示
    if (err.message.includes('API key')) {
      res.status(500).json({ 
        error: 'LLM服务配置错误，请检查API密钥是否正确设置', 
        code: 'LLM_CONFIG_ERROR' 
      });
    } else {
      res.status(500).json({ error: `生成失败: ${err.message}` });
    }
  }
};