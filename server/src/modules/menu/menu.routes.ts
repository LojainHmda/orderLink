import { Router } from 'express';
import * as controller from './menu.controller.js';

// Mounted at /api/restaurants
export const menuRouter: Router = Router();

menuRouter.get('/:slug/menu', controller.list);
menuRouter.post('/:slug/menu', controller.create);
menuRouter.put('/:slug/menu/:itemId', controller.update);
menuRouter.patch('/:slug/menu/:itemId/availability', controller.setAvailability);
menuRouter.delete('/:slug/menu/:itemId', controller.remove);
