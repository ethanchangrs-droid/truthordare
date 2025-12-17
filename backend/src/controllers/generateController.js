// 模拟生成逻辑（待实现真实 LLM 调用）
export const generateQuestions = async (req, res) => {
  const { mode, style, locale = 'zh-CN', count = 10, audienceAge = 'adult', intensity = 'medium' } = req.body;

  // TODO: 参数校验
  // TODO: 速率限制中间件
  // TODO: 调用 services/llmService.js
  // TODO: 内容安全过滤 utils/filter.js

  // Mock 数据
  const mockItems = Array.from({ length: count }, (_, i) => ({
    id: `item-${Date.now()}-${i}`,
    type: mode,
    text: `[Mock] 请执行第${i + 1}项${mode === 'truth' ? '真心话' : '大冒险'}任务（风格：${style}）`
  }));

  res.json({
    items: mockItems,
    meta: {
      provider: 'mock',
      promptId: 'mock-prompt-001',
      latencyMs: 120,
      filteredCount: 0
    }
  });
};