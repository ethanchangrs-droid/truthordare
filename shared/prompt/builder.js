/**
 * Prompt 构建器 - 公共模块
 * 
 * 本文件被以下模块引用：
 * - backend/src/services/llmService.js
 * - functions/api/generate.js (通过打包)
 */

import { getDimensionHint, styleDimensions } from './dimensions.js';

/**
 * 根据模式获取风格的话题维度
 * @param {string} style - 风格名称
 * @param {string} mode - 模式(truth/dare)
 * @returns {Array} 维度数组
 */
function getDimensionsByMode(style, mode) {
  const styleConfig = styleDimensions[style];
  if (!styleConfig) return [];
  
  // 如果是旧的数组格式，直接返回
  if (Array.isArray(styleConfig)) {
    return styleConfig;
  }
  
  // 如果是新的对象格式，返回对应模式的维度
  return styleConfig[mode] || [];
}

/**
 * 构建 LLM Prompt
 * @param {Object} params
 * @param {string} params.mode - truth/dare
 * @param {string} params.style - 风格
 * @param {string} params.locale - 语言
 * @param {number} params.count - 数量
 * @param {string} params.audienceAge - 受众年龄
 * @param {string} params.intensity - 尺度
 * @param {number} params.seed - 随机种子
 * @returns {Object} { system: string, user: string }
 */
export function buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed }) {
  const isExplicit = style === '大尺度';
  
  // 代码层面随机选取一个话题维度，而不是让 LLM 自己选择
  // 风格名称容错：如果找不到维度定义，使用"正常"风格作为兜底
  const dimensions = getDimensionsByMode(style, mode) || getDimensionsByMode('正常', mode) || [];
  
  if (dimensions.length === 0) {
    console.warn(`[Prompt] 未找到风格 "${style}" 的维度定义，使用空维度`);
  }
  
  const targetDimensionIndex = dimensions.length > 0 ? Math.floor(Math.random() * dimensions.length) : null;
  const targetDimension = targetDimensionIndex !== null ? dimensions[targetDimensionIndex] : null;
  
  // 注意：getDimensionHint 仍然使用原来的 styleDimensions[style] 格式
  const dimensionHint = getDimensionHint(style);

  let systemPrompt;
  
  // 根据模式定义特性说明
  const modeInstruction = mode === 'truth' 
    ? `
**真心话（Truth）模式 - 严格要求**：
✅ 必须是：
  - 提问、询问、要求回答
  - 让玩家用语言表达：讲述、描述、回答、分享
  - 题目开头：你..., 描述..., 讲述..., 说说..., 回忆...
  
❌ 绝对禁止：
  - 任何需要"做动作"的内容（如：模仿、表演、做出...动作）
  - 任何需要"执行任务"的内容（如：完成、挑战）
  - 题目中不能出现：模仿、表演、做、执行、完成、动作、姿势等动词
  
示例（正确）：
  - 你最尴尬的一次经历是什么？
  - 描述你童年时最有趣的一次恶作剧
  - 讲述你人生中最'社死'的瞬间`
    : `
**大冒险（Dare）模式 - 严格要求**：
✅ 必须是：
  - 命令、指令、要求执行
  - 让玩家现场做动作：模仿、表演、做出、完成
  - 题目开头：模仿..., 做出..., 表演..., 完成..., 向...做...
  
❌ 绝对禁止：
  - 任何只需要"说话回答"的内容
  - 题目中不能是：表达、讲述、描述、回答、说说、回忆等纯语言表达
  
示例（正确）：
  - 模仿一种动物叫声持续10秒
  - 用最夸张的姿势完成5个深蹲
  - 对着房间里的一个物品表白15秒`;

  if (isExplicit) {
    systemPrompt = `
你是成人派对互动策划助手。根据模式生成大胆、刺激的问题或任务，适合18岁以上成人聚会。
可以但不限于包含：暧昧话题、性暗示、轻度身体接触挑战、饮酒惩罚、恶作剧挑战、隐私身体部位、性经历等。
禁止包含：违法内容、涉及未成年人、歧视性内容、严重暴力。
生成题目的场景和话题要多变，避免单一重复，努力让派对持续升温和有趣。
确保语言简洁，任务可执行。

⚠️ 重要格式要求：
- 必须使用标准 JSON 格式，type 和 text 字段名必须用双引号(")包裹
- text 字段的值也必须用双引号(")包裹，符合 JSON 规范
- text 内容中如需强调某些词，可以用单引号(')或书名号(《》)，但不要用双引号
- 示例：{"type": "truth", "text": "你最'尴尬'的经历是什么？"}

${modeInstruction}

输出格式为严格的 JSON 数组，每项包含 type（${mode}）与 text（题目内容）。
⚠️ 特别注意：JSON 的键和值必须用双引号(")，text 内容中避免使用双引号以防转义问题。

示例：
[
  {"type": "${mode}", "text": "${mode === 'truth' ? '你最大胆的一次约会经历是什么？' : '选一个人，用眼神对视30秒不许笑'}"}
]
`;
  } else {
    systemPrompt = `
你是派对互动策划助手。根据模式与风格生成简洁、可执行的问题或任务，避免不当内容。
生成题目的场景和话题要多变，避免单一重复，努力让派对持续升温和有趣。

${modeInstruction}

输出格式为严格的 JSON 数组，每项包含 type（${mode}）与 text（题目内容）。
⚠️ 特别注意：JSON 的键和值必须用双引号(")，text 内容中避免使用双引号以防转义问题。
示例：
[
  {"type": "${mode}", "text": "${mode === 'truth' ? '你最尴尬的一次经历是什么？' : '模仿一种动物叫声持续10秒'}"}
]
`;
  }

  // 构建 userPrompt，明确指定本次使用的维度
  let userPrompt = `
语言：${locale}；模式：${mode}；风格：${style}；数量：${count}
受众年龄：${audienceAge}；尺度：${intensity}；题目编号：${seed || 'N/A'}`;

  if (targetDimension) {
    userPrompt += `\n\n🎯 本次核心话题维度：【${targetDimension}】
⚠️ 请严格围绕"${targetDimension}"这个维度设计题目内容，不要偏离到其他维度。
如果维度是"童年趣事"，就不要设计成"模仿表演"；
如果维度是"尴尬糗事"，就设计回忆尴尬经历的问题或任务，而不是表演类。
每个维度都有独特的表达方式，请充分发挥创意。`;
  } else if (dimensionHint) {
    userPrompt += dimensionHint;
  }

  userPrompt += `\n\n请生成 ${count} 条符合要求的内容，严格遵守 JSON 格式。`;

  return {
    system: systemPrompt.trim(),
    user: userPrompt.trim()
  };
}

