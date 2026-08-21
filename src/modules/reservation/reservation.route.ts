import { Router } from 'express';
import { ReservationController } from './reservation.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { reserveDropSchema } from './reservation.validation.js';
import { auth } from '../../middlewares/auth.js';
import { reserveLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.get('/me', auth(), ReservationController.getMine);
router.post('/', auth(), reserveLimiter, validateRequest(reserveDropSchema), ReservationController.reserve);
router.post('/:reservationId/cancel', auth(), ReservationController.cancel);

export const ReservationRoutes = router;
