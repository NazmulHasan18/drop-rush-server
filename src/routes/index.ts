import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.route.js';
import { DropRoutes } from '../modules/drop/drop.route.js';
import { ReservationRoutes } from '../modules/reservation/reservation.route.js';
import { PurchaseRoutes } from '../modules/purchase/purchase.route.js';

const router = Router();

const moduleRoutes: Array<{ path: string; route: Router }> = [
  { path: '/auth', route: AuthRoutes },
  { path: '/drops', route: DropRoutes },
  { path: '/reservations', route: ReservationRoutes },
  { path: '/purchases', route: PurchaseRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
