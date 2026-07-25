import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function searchAllCollections() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const targetId = new mongoose.Types.ObjectId('6a476a60974c450bae3a8cf5');

        console.log(`Searching for ID 6a476a60974c450bae3a8cf5 across ${collections.length} collections...`);

        for (const col of collections) {
            const collectionName = col.name;
            const doc = await db.collection(collectionName).findOne({
                $or: [
                    { _id: targetId },
                    { userId: targetId },
                    { deliveryPartnerId: targetId },
                    { _id: '6a476a60974c450bae3a8cf5' },
                    { userId: '6a476a60974c450bae3a8cf5' }
                ]
            });

            if (doc) {
                console.log(`\n🎉 FOUND MATCH IN COLLECTION: "${collectionName}"!`);
                console.log(JSON.stringify(doc, null, 2));
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

searchAllCollections();
