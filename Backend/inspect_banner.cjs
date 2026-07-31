const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://sejalchhapre123_db_user:hTr3DL5eGLPji8vV@test.ddions6.mongodb.net/?appName=Test";

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        const diningBanners = await mongoose.connection.db.collection('food_dining_banners').find().toArray();
        console.log("FoodDiningBanners:", JSON.stringify(diningBanners, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

test();
