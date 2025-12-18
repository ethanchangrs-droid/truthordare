import dotenv from 'dotenv';
import OpenAI from 'openai';
import { buildPrompt } from '../../../shared/prompt/builder.js';
import { llmParams } from '../../../shared/config/llm-params.js';
import { parseResponse } from '../../../shared/llm/parser.js';

dotenv.config();

class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'tongyi';
    this.params = llmParams; // 直接使用配置文件
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

  async generate({ mode, style, locale, count, audienceAge, intensity, seed }) {
    const prompt = buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed });
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];

    try {
      let response;
      if (this.provider === 'tongyi') {
        response = await this.client.chat.completions.create({
          model: this.params.models.tongyi,
          messages,
          temperature: this.params.temperature,
          max_tokens: this.params.maxTokens,
          frequency_penalty: this.params.frequencyPenalty,
          presence_penalty: this.params.presencePenalty,
        });
      } else if (this.provider === 'deepseek') {
        response = await this.client.chat.completions.create({
          model: this.params.models.deepseek,
          messages,
          temperature: this.params.temperature,
          max_tokens: this.params.maxTokens,
          frequency_penalty: this.params.frequencyPenalty,
          presence_penalty: this.params.presencePenalty,
        });
      }

      const rawText = response.choices?.[0]?.message?.content?.trim() || '';
      return parseResponse(rawText);
    } catch (err) {
      console.error('[LLM] 调用失败:', err.message);
      throw new Error(`LLM调用失败: ${err.message}`);
    }
  }
}

export default new LLMService();