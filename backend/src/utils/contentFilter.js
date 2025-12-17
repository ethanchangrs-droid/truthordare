import BadWordsFilter from 'bad-words';
import { SENSITIVE_WORDS } from '../config/sensitiveWords.js'; // 自定义敏感词库

const filter = new BadWordsFilter();
filter.addWords(...SENSITIVE_WORDS); // 扩展默认词库

export class ContentFilter {
  /**
   * 检查单条内容是否包含敏感词
   * @param {string} text - 待检查文本
   * @returns {boolean} - 是否包含敏感词
   */
  static containsSensitive(text) {
    try {
      return filter.isProfane(text);
    } catch (err) {
      console.error('[Filter] 检查敏感词失败:', err.message);
      return false;
    }
  }

  /**
   * 过滤一批内容，移除敏感项
   * @param {Array<{type:string, text:string}>} items - 内容数组
   * @returns {Array<{type:string, text:string}>} - 过滤后的内容
   */
  static filterItems(items) {
    return items.filter(item => {
      if (this.containsSensitive(item.text)) {
        console.warn(`[Filter] 移除敏感内容: ${item.text}`);
        return false;
      }
      return true;
    });
  }
}