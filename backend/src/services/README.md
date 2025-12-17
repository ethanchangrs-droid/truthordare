# LLM 服务说明

## 支持的供应商
- `tongyi`：通义千问（默认），使用 OpenAI 兼容接口
- `deepseek`：DeepSeek API

## 环境变量配置
- `.env` 文件中配置：
  - `LLM_PROVIDER`：`tongyi` 或 `deepseek`
  - `TONGYI_API_KEY`：通义千问 API Key（来自阿里云百炼平台）
  - `DEEPSEEK_API_KEY`：DeepSeek API Key

## 调用方法
```js
import llmService from './services/llmService.js';

const items = await llmService.generate({
  mode: 'truth',
  style: '搞笑',
  locale: 'zh-CN',
  count: 10,
  audienceAge: 'adult',
  intensity: 'medium'
});
```

## 输出格式
- 返回数组，每项包含：
  - `id`：唯一标识
  - `type`：`truth` 或 `dare`
  - `text`：题目内容