import { Router } from 'express';
import { PurchaseController } from './purchase.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { purchaseSchema } from './purchase.validation.js';
import { auth } from '../../middlewares/auth.js';

const router = Router();

router.post('/', auth(), validateRequest(purchaseSchema), PurchaseController.purchase);

export const PurchaseRoutes = router;
