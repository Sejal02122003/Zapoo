import { sendResponse } from '../../../../utils/response.js';
import {
    getAllAdminOffers,
    addOffer,
    updateOfferOrder,
    toggleOfferStatus,
    deleteOffer
} from '../services/offers.service.js';

export const getAdminOffersController = async (req, res, next) => {
    try {
        const offers = await getAllAdminOffers();
        return sendResponse(res, 200, 'Offers fetched', { offers });
    } catch (error) {
        next(error);
    }
};

export const addOfferController = async (req, res, next) => {
    try {
        const { restaurantId, offerType, offerText } = req.body;
        if (!restaurantId || !offerType) {
            return sendResponse(res, 400, 'Restaurant ID and Offer Type are required');
        }
        const offer = await addOffer(restaurantId, offerType, offerText);
        return sendResponse(res, 201, 'Offer added successfully', { offer });
    } catch (error) {
        next(error);
    }
};

export const updateOfferOrderController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { order } = req.body;
        if (order === undefined) {
            return sendResponse(res, 400, 'Order value is required');
        }
        const offer = await updateOfferOrder(id, order);
        return sendResponse(res, 200, 'Offer order updated successfully', { offer });
    } catch (error) {
        next(error);
    }
};

export const toggleOfferStatusController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const offer = await toggleOfferStatus(id);
        return sendResponse(res, 200, 'Offer status updated successfully', { offer });
    } catch (error) {
        next(error);
    }
};

export const deleteOfferController = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteOffer(id);
        return sendResponse(res, 200, 'Offer removed successfully');
    } catch (error) {
        next(error);
    }
};
