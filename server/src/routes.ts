import { Router } from 'express';
import { restaurantsRouter } from './modules/restaurants/restaurants.routes.js';
import { menuRouter } from './modules/menu/menu.routes.js';
import { ordersRouter, restaurantOrdersRouter } from './modules/orders/orders.routes.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Restaurant-scoped resources (each router owns distinct sub-paths).
apiRouter.use('/restaurants', restaurantsRouter);
apiRouter.use('/restaurants', menuRouter);
apiRouter.use('/restaurants', restaurantOrdersRouter);

// Single-order operations.
apiRouter.use('/orders', ordersRouter);
