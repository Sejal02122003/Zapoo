import mongoose from 'mongoose';
import { RestaurantChallenge } from '../models/restaurantChallenge.model.js';
import { RestaurantChallengeParticipation } from '../models/restaurantChallengeParticipation.model.js';
import { RestaurantBonusTransaction } from '../models/restaurantBonusTransaction.model.js';
import { FoodRestaurantWallet } from '../models/restaurantWallet.model.js';
import { getEvaluator } from './challengeEvaluator.service.js';
import { appEvents, EVENTS } from '../../../../core/utils/events.js';

// Setup Event Listener


appEvents.on(EVENTS.ORDER_CREATED, async (order) => {
    console.log(`[CHALLENGE] ORDER_CREATED event received for order ${order._id}`);
    try {
        await evaluateChallengeEvent(order);
        console.log(`[CHALLENGE] Evaluation complete for order ${order._id}`);
    } catch (err) {
        console.error('Error evaluating restaurant challenges:', err);
    }
});

/**
 * Event Handler: Evaluate Challenges for a Completed Order
 */
async function evaluateChallengeEvent(order) {
    if (!order || !order.restaurantId) return;

    // 1. Find Active Challenges
    const now = new Date();
    const activeChallenges = await RestaurantChallenge.find({
        status: 'Active',
        $or: [{ startDate: { $lte: now } }, { startDate: null }],
        $or: [{ endDate: { $gte: now } }, { endDate: null }]
    });

    if (activeChallenges.length === 0) return;

    for (const challenge of activeChallenges) {
        // Evaluate eligibility based on restaurantFilter
        if (challenge.restaurantFilter) {
            // Note: Simplistic filter evaluation.
            if (challenge.restaurantFilter.type !== 'ALL' && challenge.restaurantFilter.restaurantId !== order.restaurantId.toString()) {
                continue;
            }
        }

        // 2. Find or Create Participation
        let participation = await RestaurantChallengeParticipation.findOne({
            restaurantId: order.restaurantId,
            challengeId: challenge._id
        });

        if (!participation) {
            participation = await RestaurantChallengeParticipation.create({
                restaurantId: order.restaurantId,
                challengeId: challenge._id,
                progress: 0
            });
        }

        if (participation.completed) continue;

        // 3. Evaluate criteria
        const evaluator = getEvaluator(challenge, order);
        const progressIncrement = await evaluator.evaluate();

        if (progressIncrement > 0) {
            participation.progress += progressIncrement;
            
            // Check if completed
            const target = challenge.criteria?.target || 1;
            if (participation.progress >= target) {
                participation.completed = true;
                participation.completedAt = new Date();
                await participation.save();
                
                // 4. Issue Reward
                await issueReward(participation, challenge);
            } else {
                await participation.save();
            }
        }
    }
}

/**
 * Issue Reward atomically using Transactions
 */
async function issueReward(participation, challenge) {
    if (participation.rewardIssued) return;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Re-fetch to lock
        const lockedParticipation = await RestaurantChallengeParticipation.findById(participation._id).session(session);
        if (lockedParticipation.rewardIssued) {
            await session.abortTransaction();
            session.endSession();
            return;
        }

        const amount = Number(challenge.reward?.amount || 0);
        
        let tx = null;
        if (amount > 0) {
            // Create Transaction
            tx = await RestaurantBonusTransaction.create([{
                restaurantId: participation.restaurantId,
                challengeId: challenge._id,
                amount,
                rewardType: challenge.reward?.type || 'WALLET_CREDIT',
                remarks: `Reward for completing challenge: ${challenge.title}`
            }], { session });

            // Credit Wallet directly 
            await FoodRestaurantWallet.findOneAndUpdate(
                { restaurantId: participation.restaurantId },
                { $inc: { balance: amount } },
                { session, upsert: true }
            );
        }

        // Update Participation
        lockedParticipation.rewardIssued = true;
        lockedParticipation.rewardIssuedAt = new Date();
        if (tx && tx.length > 0) {
            lockedParticipation.transactionId = tx[0]._id;
        }
        await lockedParticipation.save({ session });

        await session.commitTransaction();
        session.endSession();
        
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}

export const challengeService = {
    evaluateChallengeEvent,
    async createChallenge(data, adminId) {
        return RestaurantChallenge.create({ ...data, createdBy: adminId });
    },
    async getChallenges(filter = {}) {
        return RestaurantChallenge.find(filter).sort({ createdAt: -1 });
    },
    async getChallengeById(id) {
        return RestaurantChallenge.findById(id);
    },
    async updateChallenge(id, data) {
        return RestaurantChallenge.findByIdAndUpdate(id, data, { new: true });
    },
    async deleteChallenge(id) {
        return RestaurantChallenge.findByIdAndDelete(id);
    },
    async getRestaurantChallenges(restaurantId) {
        const now = new Date();
        const challenges = await RestaurantChallenge.find({
            status: { $ne: 'Draft' }
        }).lean();

        const participations = await RestaurantChallengeParticipation.find({ restaurantId }).lean();
        
        return challenges.map(challenge => {
            const part = participations.find(p => p.challengeId.toString() === challenge._id.toString());
            return {
                challenge,
                participation: part || null
            };
        });
    }
};
