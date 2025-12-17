import llmService from '../services/llmService.js';
import { ContentFilter } from '../utils/contentFilter.js';

export const generateQuestions = async (req, res) => {
  const { mode, style, locale = 'zh-CN', count = 10, audienceAge = 'adult', intensity = 'medium' } = req.body;

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

  if (!['child', 'teen', 'adult'].includes(audienceAge)) {
    return res.status(400).json({ error: '无效的受众年龄，必须是 child, teen 或 adult' });
  }

  if (!['low', 'medium', 'high'].includes(intensity)) {
    return res.status(400).json({ error: '无效的尺度，必须是 low, medium 或 high' });
  }

  try {
    // 1. 调用 LLM 服务
    const rawItems = await llmService.generate({ mode, style, locale, count, audienceAge, intensity });

    // 2. 内容安全过滤
    const filteredItems = ContentFilter.filterItems(rawItems);
    const filteredCount = rawItems.length - filteredItems.length;

    // 3. 返回结果
    res.json({
      items: filteredItems,
      meta: {
        provider: llmService.provider,
        promptId: 'prompt-001',
        latencyMs: Date.now() - req.startTime, // 假设中间件记录了 startTime
        filteredCount
      }
    });
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