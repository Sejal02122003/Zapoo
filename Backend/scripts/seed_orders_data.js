import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sejalchhapre123_db_user:hTr3DL5eGLPji8vV@test.ddions6.mongodb.net/?appName=Test';

async function seedOrders() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully!');

        const db = mongoose.connection.db;

        // Get a valid user and restaurant
        const usersCol = db.collection('food_users');
        const restaurantsCol = db.collection('food_restaurants');
        const ordersCol = db.collection('food_orders');

        const user = await usersCol.findOne({}) || { _id: new mongoose.Types.ObjectId(), name: 'Rahul Sharma', phone: '9876543210' };
        const restaurant = await restaurantsCol.findOne({}) || { _id: new mongoose.Types.ObjectId(), restaurantName: 'Café Monarch', name: 'Café Monarch' };

        const userId = user._id;
        const restaurantId = restaurant._id;
        const restaurantName = restaurant.restaurantName || restaurant.name || 'Café Monarch';

        const sampleItems = [
            { itemId: 'item_1', name: 'Paneer Butter Masala', price: 280, quantity: 1, isVeg: true },
            { itemId: 'item_2', name: 'Garlic Naan', price: 60, quantity: 2, isVeg: true },
            { itemId: 'item_3', name: 'Mango Lassi', price: 90, quantity: 1, isVeg: true }
        ];

        const address = {
            label: 'Home',
            name: user.name || 'Rahul Sharma',
            fullName: user.name || 'Rahul Sharma',
            street: '123 MG Road, Vijay Nagar',
            city: 'Indore',
            state: 'Madhya Pradesh',
            zipCode: '452010',
            phone: user.phone || '9876543210'
        };

        const generateOrderDoc = (status, orderNum, dateOffsetDays = 0) => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - dateOffsetDays);

            return {
                order_id: `ZAP-${100000 + orderNum}`,
                orderId: `ZAP-${100000 + orderNum}`,
                userId: userId,
                restaurantId: restaurantId,
                customerName: user.name || 'Rahul Sharma',
                customerPhone: user.phone || '9876543210',
                restaurantName: restaurantName,
                orderType: 'delivery',
                orderStatus: status,
                items: sampleItems,
                deliveryAddress: address,
                pricing: {
                    subtotal: 490,
                    tax: 24.5,
                    packagingFee: 25,
                    deliveryFee: 40,
                    platformFee: 10,
                    discount: 50,
                    total: 539.5,
                    currency: 'INR'
                },
                payment: {
                    method: orderNum % 2 === 0 ? 'online' : 'cash',
                    status: status === 'delivered' ? 'paid' : (status === 'cancelled_by_user' || status === 'cancelled_by_restaurant' ? 'refunded' : 'created'),
                    amountDue: status === 'delivered' ? 0 : 539.5
                },
                createdAt: createdAt,
                updatedAt: createdAt
            };
        };

        const newOrders = [];
        let count = 1;

        // 6 Delivered Orders
        for (let i = 0; i < 6; i++) {
            newOrders.push(generateOrderDoc('delivered', count++, i));
        }

        // 16 Cancelled Orders
        for (let i = 0; i < 16; i++) {
            const status = i % 2 === 0 ? 'cancelled_by_user' : 'cancelled_by_restaurant';
            newOrders.push(generateOrderDoc(status, count++, i));
        }

        // 4 Pending Orders
        for (let i = 0; i < 4; i++) {
            newOrders.push(generateOrderDoc('created', count++, 0));
        }

        // 3 Processing / Accepted / Food on the way Orders
        newOrders.push(generateOrderDoc('confirmed', count++, 0));
        newOrders.push(generateOrderDoc('preparing', count++, 0));
        newOrders.push(generateOrderDoc('picked_up', count++, 0));

        console.log(`Inserting ${newOrders.length} sample orders into food_orders collection...`);
        const result = await ordersCol.insertMany(newOrders);
        console.log(`Successfully inserted ${result.insertedCount} orders!`);

    } catch (err) {
        console.error('Error seeding orders:', err);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
        process.exit(0);
    }
}

seedOrders();
