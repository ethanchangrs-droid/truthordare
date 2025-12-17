import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'tongyi';
    this.initProvider();
  }

  initProvider() {
    if (this.provider === 'tongyi') {
      // 通义千问（使用 OpenAI 兼容接口）
      this.client = new OpenAI({
        apiKey: process.env.TONGYI_API_KEY,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      });
    } else if (this.provider === 'deepseek') {
      // DeepSeek API
      this.client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
      });
    } else {
      throw new Error(`[LLM] 不支持的供应商: ${this.provider}`);
    }
  }

  async generate({ mode, style, locale, count, audienceAge, intensity }) {
    const prompt = this.buildPrompt({ mode, style, locale, count, audienceAge, intensity });
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];

    try {
      let response;
      if (this.provider === 'tongyi') {
        response = await this.client.chat.completions.create({
          model: 'qwen-plus', // 可替换为 qwen-max 或 qwen-turbo
          messages,
          temperature: 0.8,
          max_tokens: 1000,
        });
      } else if (this.provider === 'deepseek') {
        response = await this.client.chat.completions.create({
          model: 'deepseek-chat',
          messages,
          temperature: 0.8,
          max_tokens: 1000,
        });
      }

      const rawText = response.choices?.[0]?.message?.content?.trim() || '';
      return this.parseResponse(rawText);
    } catch (err) {
      console.error('[LLM] 调用失败:', err.message);
      throw new Error(`LLM调用失败: ${err.message}`);
    }
  }

  buildPrompt({ mode, style, locale, count, audienceAge, intensity }) {
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
    return { system: systemPrompt, user: userPrompt };
  }

  parseResponse(rawText) {
    try {
      // 清理 Markdown 包裹（如 ```json [...]```）
      const jsonMatch = rawText.match(/\[(.*)\]/s);
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
}

export default new LLMService();