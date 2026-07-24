import express from 'express';
import * as weatherPricingController from '../controllers/weatherPricing.controller.js';

export const weatherPricingRoutes = express.Router();

weatherPricingRoutes.get('/', weatherPricingController.getActiveWeatherPolicy);
weatherPricingRoutes.patch('/', weatherPricingController.updateWeatherPolicy);
weatherPricingRoutes.patch('/toggle', weatherPricingController.toggleWeatherPolicy);
