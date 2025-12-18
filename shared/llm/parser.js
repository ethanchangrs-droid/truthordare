/**
 * LLM响应解析器
 * 
 * 统一处理 backend 和 EdgeOne Functions 的 LLM 响应解析逻辑
 * 
 * 支持的格式：
 * - 标准格式: [{ "type": "dare", "text": "内容" }]
 * - 大括号包裹: {[ { "type": "dare", "text": "内容" } ]}
 * - Markdown包裹: ```json [...] ```
 * - text内容含未转义引号的情况
 * - 中文全角引号: " (U+201C), " (U+201D)
 */

/**
 * 解析 LLM 响应
 * @param {string} rawText - LLM 原始响应文本
 * @returns {Array<{id: string, type: string, text: string}>} 解析后的题目列表
 * @throws {Error} 解析失败时抛出错误
 */
export function parseResponse(rawText) {
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
    // 引号类型: " (U+0022), " (U+201C 左), " (U+201D 右)
    const typeMatch = jsonString.match(/[""\u201C\u201D]type[""\u201C\u201D]\s*:\s*[""\u201C\u201D]?(truth|dare)[""\u201C\u201D]?/i);
    if (!typeMatch) {
      throw new Error('无法提取 type 字段');
    }
    
    // 提取 text 字段 - 使用更鲁棒的方法
    // 策略：找到 "text": " 后的内容，同时匹配中文全角引号
    // 引号类型: " (U+0022), " (U+201C 左), " (U+201D 右)
    const textFieldMatch = jsonString.match(/[""\u201C\u201D]text[""\u201C\u201D]\s*:\s*[""\u201C\u201D]/);
    if (!textFieldMatch) {
      throw new Error('无法提取 text 字段');
    }
    
    // 找到 text 值的起始位置
    const textValueStart = jsonString.indexOf(textFieldMatch[0]) + textFieldMatch[0].length;
    let textContent = jsonString.substring(textValueStart);
          
    // 从后往前找到真正的结束引号（跳过 }、]、空白等）
    // 同时匹配中英文引号
    textContent = textContent.replace(/[""\u201C\u201D]\s*\}[\s\}\]]*$/, '');
          
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

