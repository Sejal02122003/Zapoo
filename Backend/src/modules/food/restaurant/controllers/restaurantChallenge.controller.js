import { challengeService } from '../services/restaurantChallenge.service.js';
import { sendResponse } from '../../../../utils/response.js';

export async function getMyChallenges(req, res, next) {
    try {
        const restaurantId = req.user?.userId;
        const challenges = await challengeService.getRestaurantChallenges(restaurantId);
        sendResponse(res, 200, 'Challenges fetched successfully', challenges);
    } catch (err) {
        next(err);
    }
}
