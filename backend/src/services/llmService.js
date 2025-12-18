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
    // Bug修复：添加超时配置，防止网络异常导致连接挂起
    // 原因：之前无超时控制，网络不稳定时对端关闭连接 (peer_error)
    const clientConfig = {
      timeout: this.params.timeout, // 30秒超时
    };

    if (this.provider === 'tongyi') {
      // 通义千问（使用 OpenAI 兼容接口）
      this.client = new OpenAI({
        apiKey: process.env.TONGYI_API_KEY,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        ...clientConfig,
      });
    } else if (this.provider === 'deepseek') {
      // DeepSeek API
      this.client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
        ...clientConfig,
      });
    } else {
      throw new Error(`[LLM] 不支持的供应商: ${this.provider}`);
    }
  }

  /**
   * Bug修复：实现重试逻辑，处理网络瞬时故障
   * 原因：网络不稳定时出现 peer_error、ECONNRESET、ETIMEDOUT 等错误
   * 解决方案：自动重试（最多3次）+ 指数退避（1s → 2s → 4s）
   * 
   * @param {Function} fn - 需要重试的异步函数
   * @returns {Promise} 函数执行结果
   */
  async callWithRetry(fn) {
    const { maxAttempts, initialDelay, maxDelay, backoffMultiplier } = this.params.retry;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // 判断是否为可重试错误
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === maxAttempts;

        if (!isRetryable || isLastAttempt) {
          throw error;
        }

        // 计算退避延迟：initialDelay * (backoffMultiplier ^ (attempt - 1))
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );

        console.log(`[LLM] 第 ${attempt} 次调用失败（${error.message}），${delay}ms 后重试...`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 判断错误是否可重试
   * 可重试：网络超时、连接重置、对端错误
   * 不可重试：认证失败、参数错误、频率超限
   */
  isRetryableError(error) {
    const errorMsg = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    // 网络相关错误（可重试）
    const retryablePatterns = [
      'timeout',
      'etimedout',
      'econnreset',
      'econnrefused',
      'peer_error',
      'socket hang up',
      'network error',
      '502',
      '503',
      '504'
    ];

    // 业务逻辑错误（不可重试）
    const nonRetryablePatterns = [
      '400', // 参数错误
      '401', // 认证失败
      '403', // 权限不足
      '429', // 频率超限
      'api key',
      'invalid'
    ];

    // 先检查不可重试
    if (nonRetryablePatterns.some(pattern => 
      errorMsg.includes(pattern) || errorCode.includes(pattern)
    )) {
      return false;
    }

    // 再检查可重试
    return retryablePatterns.some(pattern => 
      errorMsg.includes(pattern) || errorCode.includes(pattern)
    );
  }

  /**
   * 休眠指定毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generate({ mode, style, locale, count, audienceAge, intensity, seed }) {
    const prompt = buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed });
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ];

    // Bug修复：使用重试逻辑包裹 LLM 调用
    // 原因：网络不稳定时可能出现 peer_error、超时等错误
    // 解决方案：自动重试，提高成功率
    return await this.callWithRetry(async () => {
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
    });
  }
}

export default new LLMService();