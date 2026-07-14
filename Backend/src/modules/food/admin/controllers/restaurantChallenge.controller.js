import { challengeService } from '../../restaurant/services/restaurantChallenge.service.js';
import { sendResponse } from '../../../../utils/response.js';

export async function createRestaurantChallenge(req, res, next) {
    try {
        const adminId = req.user._id;
        const challenge = await challengeService.createChallenge(req.body, adminId);
        sendResponse(res, 201, 'Challenge created successfully', challenge);
    } catch (err) {
        next(err);
    }
}

export async function getRestaurantChallenges(req, res, next) {
    try {
        const challenges = await challengeService.getChallenges(req.query);
        sendResponse(res, 200, 'Challenges fetched successfully', challenges);
    } catch (err) {
        next(err);
    }
}

export async function getRestaurantChallengeById(req, res, next) {
    try {
        const challenge = await challengeService.getChallengeById(req.params.id);
        if (!challenge) {
            return sendResponse(res, 404, 'Challenge not found');
        }
        sendResponse(res, 200, 'Challenge fetched successfully', challenge);
    } catch (err) {
        next(err);
    }
}

export async function updateRestaurantChallenge(req, res, next) {
    try {
        const challenge = await challengeService.updateChallenge(req.params.id, req.body);
        sendResponse(res, 200, 'Challenge updated successfully', challenge);
    } catch (err) {
        next(err);
    }
}

export async function deleteRestaurantChallenge(req, res, next) {
    try {
        await challengeService.deleteChallenge(req.params.id);
        sendResponse(res, 200, 'Challenge deleted successfully');
    } catch (err) {
        next(err);
    }
}
