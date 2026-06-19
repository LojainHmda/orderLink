import { Router } from 'express';
import * as controller from './restaurants.controller.js';

// Mounted at /api/restaurants
export const restaurantsRouter: Router = Router();

restaurantsRouter.get('/', controller.list);
restaurantsRouter.get('/:slug', controller.getBySlug);
