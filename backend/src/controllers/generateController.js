import llmService from '../services/llmService.js';
import { ContentFilter } from '../utils/contentFilter.js';

export const generateQuestions = async (req, res) => {
  const { mode, style, locale = 'zh-CN', count = 10, audienceAge = 'adult', intensity = 'medium' } = req.body;

  // TODO: 参数校验
  // TODO: 速率限制中间件

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
    res.status(500).json({ error: `生成失败: ${err.message}` });
  }
};