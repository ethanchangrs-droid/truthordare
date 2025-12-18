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
        timeout: this.params.timeout, // 添加超时配置
        maxRetries: 0, // 禁用 OpenAI SDK 的自动重试，我们自己实现
      });
    } else if (this.provider === 'deepseek') {
      // DeepSeek API
      this.client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
        timeout: this.params.timeout, // 添加超时配置
        maxRetries: 0, // 禁用 OpenAI SDK 的自动重试，我们自己实现
      });
    } else {
      throw new Error(`[LLM] 不支持的供应商: ${this.provider}`);
    }
  }

  /**
   * 延迟函数（用于重试）
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试的 API 调用
   */
  async callWithRetry(fn, attemptNumber = 1) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = 
        err.message.includes('timeout') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('ENOTFOUND') ||
        err.message.includes('peer_error') ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ENOTFOUND';

      if (isRetryable && attemptNumber < this.params.retry.maxAttempts) {
        const delay = Math.min(
          this.params.retry.initialDelay * Math.pow(this.params.retry.backoffMultiplier, attemptNumber - 1),
          this.params.retry.maxDelay
        );
        
        console.warn(`[LLM] 第 ${attemptNumber} 次请求失败，${delay}ms 后重试...`, err.message);
        await this.delay(delay);
        
        return this.callWithRetry(fn, attemptNumber + 1);
      }
      
      throw err;
    }
  }

  async generate({ mode, style, locale, count, audienceAge, intensity, seed }) {
    const prompt = buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed });
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];

    try {
      // 使用重试机制包裹 API 调用
      const response = await this.callWithRetry(async () => {
        if (this.provider === 'tongyi') {
          return await this.client.chat.completions.create({
            model: this.params.models.tongyi,
            messages,
            temperature: this.params.temperature,
            max_tokens: this.params.maxTokens,
            frequency_penalty: this.params.frequencyPenalty,
            presence_penalty: this.params.presencePenalty,
          });
        } else if (this.provider === 'deepseek') {
          return await this.client.chat.completions.create({
            model: this.params.models.deepseek,
            messages,
            temperature: this.params.temperature,
            max_tokens: this.params.maxTokens,
            frequency_penalty: this.params.frequencyPenalty,
            presence_penalty: this.params.presencePenalty,
          });
        }
      });

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
      
      console.log('[LLM] 原始响应:', rawText.substring(0, 500)); // 调试日志
      
      // 清理 Markdown 包裹（如 ```json [...]```）
      // 同时处理异常包裹如 {[...]} 或 ({[...]})
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
        // 策略：从后往前找到第一个引号，截取到该引号之前
        const lastQuoteIndex = textContent.lastIndexOf('"');
        if (lastQuoteIndex !== -1) {
          textContent = textContent.substring(0, lastQuoteIndex);
        }
        
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