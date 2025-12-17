import { rateLimit } from 'express-rate-limit';

// 速率限制中间件：每分钟最多6次请求
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 6, // 默认每分钟6次
  message: {
    error: '请求过于频繁，请稍后再试',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true, // 返回标准的RateLimit-*头
  legacyHeaders: false, // 禁用X-RateLimit-*头
});

export default limiter;