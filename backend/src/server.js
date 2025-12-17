import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRoutes from './routes/generateRoutes.js';
import { createRateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(createRateLimiter()); // 全局限流（默认 6 次/分钟）

// 路由
app.get('/', (req, res) => {
  res.json({ message: '欢迎使用真心话/大冒险生成器后端服务' });
});

app.use('/api', generateRoutes);

app.listen(PORT, () => {
  console.log(`[Server] 后端服务启动于端口 ${PORT}`);
});