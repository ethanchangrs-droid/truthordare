import NodeCache from 'node-cache';
import crypto from 'crypto';

/**
 * 缓存服务
 * - 使用内存缓存减少 LLM API 调用
 * - TTL: 10 分钟 (600 秒)
 * - Key: hash(mode, style, locale, audienceAge, intensity)
 */
class CacheService {
  constructor() {
    // 配置缓存：TTL 10分钟，每2分钟检查过期项
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes
      checkperiod: 120, // 2 minutes
      useClones: false, // 性能优化：不克隆对象
    });

    // 统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * 生成缓存 key
   * @param {Object} params - 请求参数
   * @param {string} params.mode - truth/dare
   * @param {string} params.style - 风格名称
   * @param {string} params.locale - 语言
   * @param {string} params.audienceAge - 受众年龄
   * @param {string} params.intensity - 尺度
   * @param {number} params.count - 数量
   * @returns {string} 缓存 key (MD5 hash)
   */
  generateKey(params) {
    const { mode, style, locale, audienceAge, intensity, count } = params;
    const keyString = `${mode}:${style}:${locale}:${audienceAge}:${intensity}:${count}`;
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * 获取缓存
   * @param {Object} params - 请求参数
   * @returns {Object|null} 缓存的结果或 null
   */
  get(params) {
    const key = this.generateKey(params);
    const value = this.cache.get(key);

    if (value !== undefined) {
      this.stats.hits++;
      console.log(`[Cache] HIT - ${key} (hits: ${this.stats.hits}, misses: ${this.stats.misses})`);
      return value;
    }

    this.stats.misses++;
    console.log(`[Cache] MISS - ${key} (hits: ${this.stats.hits}, misses: ${this.stats.misses})`);
    return null;
  }

  /**
   * 设置缓存
   * @param {Object} params - 请求参数
   * @param {Object} value - 要缓存的值（包含 items 和 meta）
   * @param {number} [ttl] - 可选的自定义 TTL（秒）
   * @returns {boolean} 是否成功
   */
  set(params, value, ttl = null) {
    const key = this.generateKey(params);
    const success = ttl !== null 
      ? this.cache.set(key, value, ttl)
      : this.cache.set(key, value);

    if (success) {
      this.stats.sets++;
      console.log(`[Cache] SET - ${key} (total sets: ${this.stats.sets})`);
    }

    return success;
  }

  /**
   * 删除指定缓存
   * @param {Object} params - 请求参数
   * @returns {number} 删除的项数
   */
  del(params) {
    const key = this.generateKey(params);
    return this.cache.del(key);
  }

  /**
   * 清空所有缓存
   */
  flush() {
    this.cache.flushAll();
    console.log('[Cache] 已清空所有缓存');
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%',
      keys: cacheStats.keys,
      ksize: cacheStats.ksize,
      vsize: cacheStats.vsize,
    };
  }
}

// 单例模式
const cacheService = new CacheService();

export default cacheService;

