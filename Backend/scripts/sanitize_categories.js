import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { FoodItem } from '../src/modules/food/admin/models/food.model.js';
import { FoodCategory } from '../src/modules/food/admin/models/category.model.js';

async function sanitizeDbData() {
  await mongoose.connect(config.mongodbUri);
  console.log('Connected to MongoDB. Auditing categories & food items...');

  // 1. Audit & fix category names that might not be strings
  const categories = await FoodCategory.find({}).lean();
  let fixedCategories = 0;
  for (const cat of categories) {
    if (typeof cat.name !== 'string' || cat.name === null || cat.name === undefined) {
      const safeName = String(cat.name || 'Category').trim();
      await FoodCategory.updateOne({ _id: cat._id }, { $set: { name: safeName } });
      fixedCategories++;
    }
  }

  // 2. Audit & fix food items categoryName / category fields
  const foods = await FoodItem.find({}).lean();
  let fixedFoods = 0;
  for (const food of foods) {
    let update = {};
    if (food.categoryName !== undefined && typeof food.categoryName !== 'string') {
      update.categoryName = String(food.categoryName || 'Menu').trim();
    }
    if (food.category !== undefined && typeof food.category !== 'string') {
      update.category = String(food.category || 'Menu').trim();
    }
    if (Object.keys(update).length > 0) {
      await FoodItem.updateOne({ _id: food._id }, { $set: update });
      fixedFoods++;
    }
  }

  console.log(`Sanitization finished! Fixed ${fixedCategories} categories and ${fixedFoods} food items.`);
  process.exit(0);
}

sanitizeDbData().catch(err => {
  console.error('Error during database sanitization:', err);
  process.exit(1);
});
