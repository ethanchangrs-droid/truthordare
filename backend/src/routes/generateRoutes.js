import { Router } from 'express';
import { generateQuestions } from '../controllers/generateController.js';

const router = Router();

router.post('/generate', generateQuestions);

export default router;