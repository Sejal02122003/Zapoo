import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sejalchhapre123_db_user:hTr3DL5eGLPji8vV@test.ddions6.mongodb.net/?appName=Test';

async function inspect() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const orders = await db.collection('food_orders').find({}).limit(10).toArray();
    console.log('Total orders count:', await db.collection('food_orders').countDocuments());
    console.log('Sample orders in DB:');
    console.log(JSON.stringify(orders, null, 2));
    await mongoose.disconnect();
}

inspect();
