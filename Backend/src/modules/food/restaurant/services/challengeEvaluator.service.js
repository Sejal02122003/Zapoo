import mongoose from 'mongoose';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodRestaurantMenu as FoodMenu } from '../../restaurant/models/restaurantMenu.model.js';

// Base Evaluator
export class BaseEvaluator {
    constructor(challenge, order) {
        this.challenge = challenge;
        this.order = order;
    }

    /**
     * @returns {Promise<Number>} The amount to increment the progress by. Returns 0 if criteria not met.
     */
    async evaluate() {
        throw new Error('evaluate() must be implemented by subclasses');
    }
}

// 1. Total Orders Evaluator
export class OrderEvaluator extends BaseEvaluator {
    async evaluate() {
        return 1; // Basic order completed counts as 1
    }
}

// 2. New Customers Evaluator
export class CustomerEvaluator extends BaseEvaluator {
    async evaluate() {
        // Count previous completed orders from this user at this restaurant
        const previousOrders = await FoodOrder.countDocuments({
            restaurantId: this.order.restaurantId,
            userId: this.order.userId,
            _id: { $ne: this.order._id },
            orderStatus: { $in: ['completed', 'delivered'] }
        });
        
        // If it's their very first order, it counts as 1 new customer
        return previousOrders === 0 ? 1 : 0;
    }
}

// 3. Total Revenue Evaluator
export class RevenueEvaluator extends BaseEvaluator {
    async evaluate() {
        // Evaluate based on the total cart/subtotal value or totalAmount
        const amount = Number(this.order.pricing?.itemTotal || this.order.totalAmount || 0);
        return amount;
    }
}

// 4. Delivery Orders Evaluator
export class DeliveryEvaluator extends BaseEvaluator {
    async evaluate() {
        return this.order.orderType === 'delivery' ? 1 : 0;
    }
}

// 5. Takeaway Orders Evaluator
export class TakeawayEvaluator extends BaseEvaluator {
    async evaluate() {
        return this.order.orderType === 'takeaway' ? 1 : 0;
    }
}

// 6. Vegan Orders Evaluator
export class VeganEvaluator extends BaseEvaluator {
    async evaluate() {
        // Check if the order contains any vegan (veg) items
        const hasVegan = (this.order.items || []).some(item => item.isVeg === true);
        return hasVegan ? 1 : 0;
    }
}

// 7. Category Orders Evaluator
export class CategoryEvaluator extends BaseEvaluator {
    async evaluate() {
        const targetCategoryId = this.challenge.criteria?.categoryId;
        if (!targetCategoryId) return 0;

        const itemIds = (this.order.items || []).map(item => item.itemId);
        if (itemIds.length === 0) return 0;

        // Fetch menu items to check their categories
        const menuItems = await FoodMenu.find({
            _id: { $in: itemIds.map(id => new mongoose.Types.ObjectId(id)) },
            restaurantId: this.order.restaurantId
        }).select('categoryId');

        const hasCategory = menuItems.some(
            menu => menu.categoryId && menu.categoryId.toString() === targetCategoryId.toString()
        );

        return hasCategory ? 1 : 0;
    }
}

// Factory Function
export function getEvaluator(challenge, order) {
    const type = challenge.criteria?.type || 'TOTAL_ORDERS';
    switch (type) {
        case 'TOTAL_ORDERS': return new OrderEvaluator(challenge, order);
        case 'NEW_CUSTOMERS': return new CustomerEvaluator(challenge, order);
        case 'TOTAL_REVENUE': return new RevenueEvaluator(challenge, order);
        case 'DELIVERY_ORDERS': return new DeliveryEvaluator(challenge, order);
        case 'TAKEAWAY_ORDERS': return new TakeawayEvaluator(challenge, order);
        case 'VEGAN_ORDERS': return new VeganEvaluator(challenge, order);
        case 'CATEGORY_ORDERS': return new CategoryEvaluator(challenge, order);
        default: 
            return new OrderEvaluator(challenge, order); // Fallback to basic order count
    }
}
