import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import { auth } from '../../middlewares/auth.js';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.get('/me', auth(), AuthController.me);

export const AuthRoutes = router;
