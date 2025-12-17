import rateLimit from 'express-rate-limit';

// 速率限制中间件（基于 IP）
export const createRateLimiter = (windowMs = 60 * 1000, max = 6) => {
  return rateLimit({
    windowMs, // 时间窗口（毫秒）
    max, // 最大请求数
    message: {
      error: `请求过于频繁，请稍后再试（限制：${max} 次/${windowMs / 1000}秒）`
    },
    standardHeaders: true, // 返回标准化的限流头
    legacyHeaders: false, // 禁用旧版头
    skipSuccessfulRequests: false, // 成功请求也计入限流
  });
};