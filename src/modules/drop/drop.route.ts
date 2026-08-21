import { Router } from 'express';
import { DropController } from './drop.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { createDropSchema } from './drop.validation.js';
import { auth } from '../../middlewares/auth.js';

const router = Router();

// GET /api/drops -> dashboard feed: live stock + top-3 recent purchasers per drop
router.get('/', DropController.getAllDrops);

router.get('/:dropId', DropController.getDropById);

// POST /api/drops -> "Merch Drop" creation API (no admin UI required)
router.post('/', auth(), validateRequest(createDropSchema), DropController.createDrop);

export const DropRoutes = router;
