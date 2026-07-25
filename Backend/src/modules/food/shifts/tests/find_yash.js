import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function findYash() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        for (const col of collections) {
            const docs = await db.collection(col.name).find({
                $or: [
                    { name: /yash/i },
                    { email: /yash/i },
                    { phone: /yash/i }
                ]
            }).toArray();

            if (docs.length > 0) {
                console.log(`\nFound ${docs.length} matches in collection "${col.name}":`);
                docs.forEach(d => console.log('Doc:', { _id: d._id, name: d.name, email: d.email, phone: d.phone, userId: d.userId, role: d.role }));
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

findYash();
