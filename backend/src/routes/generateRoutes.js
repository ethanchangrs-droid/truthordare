import { Router } from 'express';
import { generateQuestions } from '../controllers/generateController.js';

const router = Router();

// 添加请求开始时间中间件
const startTimeMiddleware = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

router.post('/generate', startTimeMiddleware, generateQuestions);

export default router;