import { Router } from 'express';
import * as controller from './orders.controller.js';

/** Restaurant-scoped order routes. Mounted at /api/restaurants */
export const restaurantOrdersRouter: Router = Router();
restaurantOrdersRouter.get('/:slug/orders', controller.list);
restaurantOrdersRouter.post('/:slug/orders', controller.create);
restaurantOrdersRouter.get('/:slug/stats', controller.stats);

/** Single-order routes. Mounted at /api/orders */
export const ordersRouter: Router = Router();
ordersRouter.get('/:id', controller.getById);
ordersRouter.patch('/:id/status', controller.updateStatus);
ordersRouter.post('/:id/advance', controller.advance);
