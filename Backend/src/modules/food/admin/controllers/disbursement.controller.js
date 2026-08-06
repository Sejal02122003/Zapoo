import FoodDisbursement from '../models/disbursement.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import mongoose from 'mongoose';

export const getDisbursements = async (req, res) => {
    try {
        const { targetType, zone, deliveryMan, restaurant, paymentMethod, status, time, page = 1, limit = 50 } = req.query;

        const query = {};

        if (targetType) query.targetType = targetType;
        if (status && status !== 'All status') query.status = status.toLowerCase();
        if (paymentMethod && paymentMethod !== 'All Payment Method') query.paymentMethod = paymentMethod.toLowerCase();

        // Time filtering
        if (time && time !== 'All Time') {
            const now = new Date();
            let startDate = new Date();
            if (time === 'Today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (time === 'This Week') {
                startDate.setDate(now.getDate() - 7);
            } else if (time === 'This Month') {
                startDate.setMonth(now.getMonth() - 1);
            } else if (time === 'This Year') {
                startDate.setFullYear(now.getFullYear() - 1);
            }
            query.createdAt = { $gte: startDate };
        }

        // Fetching data
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Find matching disbursements and populate targetId
        let disbursements = await FoodDisbursement.find(query)
            .populate('targetId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // In-memory filter for populated fields (like zone, deliveryMan name, restaurant name)
        if (zone && zone !== 'All Zones') {
            // Note: In a real heavy app, you'd use aggregation or store zone on disbursement
            // Since this is for simple integration, we'll filter after population
            disbursements = disbursements.filter(d => {
                if (!d.targetId) return false;
                // Add logic here if user models have zone info
                return true; 
            });
        }
        
        if (deliveryMan && deliveryMan !== 'All delivery mans' && targetType === 'delivery_man') {
            disbursements = disbursements.filter(d => {
                const name = d.targetId?.firstName + ' ' + d.targetId?.lastName;
                return name.toLowerCase().includes(deliveryMan.toLowerCase());
            });
        }

        if (restaurant && restaurant !== 'All restaurants' && targetType === 'restaurant') {
            disbursements = disbursements.filter(d => {
                return d.targetId?.restaurantName?.toLowerCase().includes(restaurant.toLowerCase());
            });
        }

        // Stats calculation
        const stats = await FoodDisbursement.aggregate([
            { $match: { targetType: targetType || { $exists: true } } },
            {
                $group: {
                    _id: null,
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
                    canceled: { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, '$amount', 0] } }
                }
            }
        ]);

        const totalCount = await FoodDisbursement.countDocuments(query);

        res.json({
            success: true,
            data: {
                disbursements,
                stats: stats[0] || { pending: 0, completed: 0, canceled: 0 },
                pagination: {
                    total: totalCount,
                    page: parseInt(page),
                    pages: Math.ceil(totalCount / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error fetching disbursements:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const createDisbursement = async (req, res) => {
    try {
        const { targetType, targetId, amount, paymentMethod, transactionIds, adminNote } = req.body;
        
        const targetTypeModel = targetType === 'delivery_man' ? 'FoodDeliveryPartner' : 'FoodRestaurant';
        
        const disbursement = new FoodDisbursement({
            targetType,
            targetId,
            targetTypeModel,
            amount,
            paymentMethod,
            transactionIds,
            adminNote
        });

        await disbursement.save();
        res.status(201).json({ success: true, data: disbursement });
    } catch (error) {
        console.error('Error creating disbursement:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateDisbursementStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'completed', 'canceled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const disbursement = await FoodDisbursement.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!disbursement) {
            return res.status(404).json({ success: false, message: 'Disbursement not found' });
        }

        res.json({ success: true, data: disbursement });
    } catch (error) {
        console.error('Error updating disbursement:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
