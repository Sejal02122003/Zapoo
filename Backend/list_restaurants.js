import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const listRestaurants = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        
        let restaurantCollectionName = 'food_restaurants';
        let restaurants = await mongoose.connection.collection(restaurantCollectionName).find({}).toArray();
        
        if (restaurants.length === 0) {
            restaurantCollectionName = 'restaurants';
            restaurants = await mongoose.connection.collection(restaurantCollectionName).find({}).toArray();
        }
        
        console.log(`\nFound ${restaurants.length} restaurants in the database:`);
        restaurants.forEach(r => {
            console.log(`- ${r.name || r.restaurantName || r.title || 'Unknown Name'} (Active: ${r.isActive})`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

listRestaurants();
