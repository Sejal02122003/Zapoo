import mongoose from 'mongoose';
import { config } from '../src/config/env.js';

async function updateDb() {
  await mongoose.connect(config.mongodbUri);
  console.log('Connected to MongoDB. Scanning for api.domain.com URLs...');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  let totalDocsUpdated = 0;

  for (const colInfo of collections) {
    if (colInfo.name.startsWith('system.')) continue;
    const col = mongoose.connection.db.collection(colInfo.name);
    const docs = await col.find({}).toArray();

    for (const doc of docs) {
      const docStr = JSON.stringify(doc);
      if (docStr.includes('api.domain.com')) {
        const updatedStr = docStr.replace(/https?:\/\/api\.domain\.com/g, 'https://zapoo.co.in');
        const updatedDoc = JSON.parse(updatedStr);
        delete updatedDoc._id;
        await col.updateOne({ _id: doc._id }, { $set: updatedDoc });
        totalDocsUpdated++;
      }
    }
  }

  console.log('Database cleanup completed! Total documents updated from api.domain.com to zapoo.co.in:', totalDocsUpdated);
  await mongoose.disconnect();
  process.exit(0);
}

updateDb().catch(err => {
  console.error('Error updating DB:', err);
  process.exit(1);
});
