import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/auth.js';
import { authRateLimiter } from '../../shared/middleware/rateLimit.js';
import { changePasswordSchema, loginSchema, refreshSchema, registerSchema, updateProfileSchema } from './auth.dto.js';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateProfile);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), authController.changePassword);

export const authRoutes = router;
