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

  /**
   * 解析 LLM 响应
   * 
   * 处理多种可能的格式：
   * - 标准格式: [{ "type": "dare", "text": "内容" }]
   * - 大括号包裹: {[ { "type": "dare", "text": "内容" } ]}
   * - Markdown包裹: ```json [...] ```
   * - text内容含未转义引号的情况
   */
  parseResponse(rawText) {
    try {
      let jsonString = rawText.trim();
      
      // 1. 移除 Markdown 代码块包裹
      jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      
      // 2. 移除外层大括号包裹: {[...]} → [...]
      // 注意：必须在提取方括号内容之前处理
      jsonString = jsonString.replace(/^\s*\{\s*\[/, '[').replace(/\]\s*\}\s*$/, ']');
      
      // 3. 提取方括号内容（处理可能的前后多余字符）
      const jsonMatch = jsonString.match(/\[([\s\S]*)\]/);
      if (jsonMatch) {
        jsonString = `[${jsonMatch[1]}]`;
      }
      
      // 4. 尝试 JSON.parse
      try {
        const items = JSON.parse(jsonString);
        if (Array.isArray(items) && items.length > 0 && items[0].text) {
          return items.map((item, index) => ({
            id: `gen-${Date.now()}-${index}`,
            type: item.type,
            text: item.text
          }));
        }
      } catch (parseError) {
        console.warn('[LLM] JSON解析失败，尝试手动提取:', parseError.message);
      }
      
    // 5. JSON.parse 失败或结果无效，使用正则直接提取
    // 提取 type 字段（同时匹配中英文引号）
    const typeMatch = jsonString.match(/[""]type[""]\s*:\s*[""]?(truth|dare)[""]?/i);
    if (!typeMatch) {
      throw new Error('无法提取 type 字段');
    }
    
    // 提取 text 字段 - 使用更鲁棒的方法
    // 策略：找到 "text": " 后的内容，同时匹配中文全角引号
    // 注意：LLM有时会返回中文引号 "" 而非英文引号 ""
    const textFieldMatch = jsonString.match(/[""]text[""]\s*:\s*[""]/);
    if (!textFieldMatch) {
      throw new Error('无法提取 text 字段');
    }
    
    // 找到 text 值的起始位置
    const textValueStart = jsonString.indexOf(textFieldMatch[0]) + textFieldMatch[0].length;
    let textContent = jsonString.substring(textValueStart);
    
    // 从后往前找到真正的结束引号（跳过 }、]、空白等）
    // 同时匹配中英文引号
    textContent = textContent.replace(/[""]\s*\}[\s\}\]]*$/, '');
      
      // 还原可能的转义字符
      textContent = textContent
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      
      console.log('[LLM] 手动提取成功');
      return [{
        id: `gen-${Date.now()}-0`,
        type: typeMatch[1],
        text: textContent
      }];
      
    } catch (err) {
      console.error('[LLM] 解析响应失败:', rawText.substring(0, 300), '...错误:', err.message);
      throw new Error(`LLM响应解析失败: ${err.message}`);
    }
  }
}

export default new LLMService();