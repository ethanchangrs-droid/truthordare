import dotenv from 'dotenv';
import OpenAI from 'openai';
import { buildPrompt } from '../../../shared/prompt/builder.js';
import { llmParams } from '../../../shared/config/llm-params.js';

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
      return this.parseResponse(rawText);
    } catch (err) {
      console.error('[LLM] 调用失败:', err.message);
      throw new Error(`LLM调用失败: ${err.message}`);
    }
  }

  parseResponse(rawText) {
    try {
      // 先尝试直接解析
      let jsonString = rawText.trim();
      
      // 清理 Markdown 包裹（如 ```json [...]```）
      const jsonMatch = jsonString.match(/\[(.*)\]/s);
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
          const textStartMatch = objStr.match(/"text"\s*:\s*"/);
          if (!textStartMatch) continue;
          
          const textStart = objStr.indexOf('"text"');
          const colonIndex = objStr.indexOf(':', textStart);
          const firstQuoteAfterColon = objStr.indexOf('"', colonIndex + 1);
          
          // 从第一个引号后开始，找到倒数第二个引号（最后一个是对象结尾的}前的）
          let textContent = objStr.substring(firstQuoteAfterColon + 1);
          
          // 移除末尾的 "}] 之类的字符
          textContent = textContent.replace(/"\s*\}\s*\]?\s*$/, '');
          
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
}

export default new LLMService();