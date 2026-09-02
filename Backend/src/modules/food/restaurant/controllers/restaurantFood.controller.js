import { sendResponse, sendError } from '../../../../utils/response.js';
import { createRestaurantFood, updateRestaurantFood, bulkCreateFood, deleteFood } from '../services/restaurantFood.service.js';

const getTargetRestaurantId = (req) => {
    return req.body?.restaurantId || req.query?.restaurantId || req.user?.restaurantId || req.user?.userId;
};

export const createRestaurantFoodController = async (req, res, next) => {
    try {
        const restaurantId = getTargetRestaurantId(req);
        const food = await createRestaurantFood(restaurantId, req.body || {});
        return sendResponse(res, 201, 'Food created successfully', { food });
    } catch (error) {
        next(error);
    }
};

export const bulkCreateRestaurantFoodController = async (req, res, next) => {
    try {
        const restaurantId = getTargetRestaurantId(req);
        const items = Array.isArray(req.body) ? req.body : (req.body?.items || []);
        const results = await bulkCreateFood(restaurantId, items);
        return sendResponse(res, 201, 'Bulk upload completed', results);
    } catch (error) {
        next(error);
    }
};


export const updateRestaurantFoodController = async (req, res, next) => {
    try {
        const restaurantId = getTargetRestaurantId(req);
        const food = await updateRestaurantFood(restaurantId, req.params.id, req.body || {});
        if (!food) return sendError(res, 404, 'Food not found');
        return sendResponse(res, 200, 'Food updated successfully', { food });
    } catch (error) {
        next(error);
    }
};

export const deleteRestaurantFoodController = async (req, res, next) => {
    try {
        const restaurantId = getTargetRestaurantId(req);
        await deleteFood(restaurantId, req.params.id);
        return sendResponse(res, 200, 'Food deleted successfully');
    } catch (error) {
        next(error);
    }
};
