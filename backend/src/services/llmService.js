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

  async generate({ mode, style, locale, count, audienceAge, intensity, seed }) {
    const prompt = this.buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed });
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
          temperature: 1.0, // 提高随机性
          max_tokens: 1000,
          frequency_penalty: 1.5, // 重复词惩罚：降低已出现词的重复概率
          presence_penalty: 1.2,  // 话题惩罚：鼓励新话题
        });
      } else if (this.provider === 'deepseek') {
        response = await this.client.chat.completions.create({
          model: 'deepseek-chat',
          messages,
          temperature: 1.0, // 提高随机性
          max_tokens: 1000,
          frequency_penalty: 1.5, // 重复词惩罚：降低已出现词的重复概率
          presence_penalty: 1.2,  // 话题惩罚：鼓励新话题
        });
      }

      const rawText = response.choices?.[0]?.message?.content?.trim() || '';
      return this.parseResponse(rawText);
    } catch (err) {
      console.error('[LLM] 调用失败:', err.message);
      throw new Error(`LLM调用失败: ${err.message}`);
    }
  }

  buildPrompt({ mode, style, locale, count, audienceAge, intensity, seed }) {
    // 风格维度定义（增强话题多样性）
    const styleDimensions = {
      '暧昧': ['初次见面的印象', '身体接触的尴尬瞬间', '暗恋的秘密', '约会中的小细节', '暧昧的肢体语言', '性吸引力', '浪漫幻想', '亲密关系边界'],
      '搞笑': ['尴尬糗事', '童年趣事', '模仿表演', '奇葩经历', '社死瞬间', '恶搞挑战', '荒诞想象', '沙雕行为'],
      '职场': ['职场政治', '领导关系', '同事八卦', '职业规划', '工作失误', '办公室恋情', '跳槽经历', '职场困境'],
      '酒局': ['酒量糗事', '酒后失态', '劝酒文化', '喝酒游戏', '酒桌规矩', '醉酒经历', '拼酒挑战', '酒后真话'],
      '家庭': ['父母关系', '兄弟姐妹', '家庭秘密', '童年回忆', '家族传统', '代际冲突', '亲情时刻', '家庭责任'],
      '烧脑': ['逻辑推理', '道德困境', '哲学思考', '假设情境', '价值选择', '心理测试', '智力挑战', '深度追问'],
      '极限': ['恐高挑战', '社交恐惧', '身体极限', '心理压力', '冒险经历', '生存考验', '勇气测试', '突破舒适区'],
      '派对': ['游戏互动', '才艺表演', '团队协作', '即兴创作', '节奏挑战', '角色扮演', '集体惩罚', '热场活动'],
      '温情': ['感恩时刻', '友情回忆', '善良行为', '温暖瞬间', '心灵成长', '真诚表达', '情感支持', '美好愿望'],
      '大尺度': ['性经历', '身体隐私', '性幻想', '情欲挑战', '亲密接触', '性话题', '大胆表白', '禁忌边缘'],
      '少儿适宜': ['校园趣事', '兴趣爱好', '动画游戏', '运动挑战', '才艺展示', '友谊故事', '梦想分享', '创意想象'],
      '正常': ['生活经历', '人际关系', '个人成长', '兴趣爱好', '未来规划', '价值观念', '情感表达', '社交互动']
    };

    const dimensions = styleDimensions[style] || [];
    const dimensionHint = dimensions.length > 0 
      ? `\n话题维度参考（请从中选择不同维度，避免重复）：${dimensions.join('、')}` 
      : '';

    const systemPrompt = `
你是派对互动策划助手。根据模式与风格生成简洁、可执行的问题或任务，避免不当内容。
生成题目的场景和话题要多变，避免单一重复，努力让派对持续升温和有趣。
输出格式为严格的 JSON 数组，每项包含 type（truth/dare）与 text（题目内容）。
示例：
[
  {"type": "truth", "text": "你最尴尬的一次经历是什么？"},
  {"type": "dare", "text": "模仿一种动物叫声持续10秒"}
]
`;
    const userPrompt = `
语言：${locale}；模式：${mode}；风格：${style}；数量：${count}
受众年龄：${audienceAge}；尺度：${intensity}；题目编号：${seed || 'N/A'}${dimensionHint}
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