import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function main() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const { FoodRestaurant } = await import('./src/modules/food/restaurant/models/restaurant.model.js');
    const { getApprovedRestaurantByIdOrSlug, listApprovedRestaurants } = await import('./src/modules/food/restaurant/services/restaurant.service.js');
    const { getPublicApprovedRestaurantMenu } = await import('./src/modules/food/restaurant/services/restaurantMenu.service.js');
    const { getOutletTimingsForRestaurant } = await import('./src/modules/food/restaurant/services/outletTimings.service.js');

    const approvedRestaurants = await FoodRestaurant.find({ status: 'approved' }).lean();
    console.log(`Verifying actual services on all ${approvedRestaurants.length} approved restaurants:\n`);

    let allPassed = true;
    for (const r of approvedRestaurants) {
      const slug = r.slug || r.restaurantNameNormalized?.replace(/\s+/g, '-') || r.restaurantName.toLowerCase().replace(/\s+/g, '-');
      const idStr = String(r._id);

      // 1. Restaurant detail by slug and by id
      const docBySlug = await getApprovedRestaurantByIdOrSlug(slug);
      const docById = await getApprovedRestaurantByIdOrSlug(idStr);

      // 2. Menu by slug and by id
      const menuBySlug = await getPublicApprovedRestaurantMenu(slug);
      const menuById = await getPublicApprovedRestaurantMenu(idStr);

      // 3. Outlet timings by slug and by id
      const timingsBySlug = await getOutletTimingsForRestaurant(slug);
      const timingsById = await getOutletTimingsForRestaurant(idStr);

      const docOk = Boolean(docBySlug && docById && String(docBySlug._id) === idStr && docBySlug.slug && docBySlug.restaurantId);
      const menuOk = Boolean(menuBySlug?.sections?.length > 0 && menuById?.sections?.length > 0);
      const timingsOk = Boolean(timingsBySlug?.outletTimings && timingsById?.outletTimings);

      const restaurantOk = docOk && menuOk && timingsOk;
      if (!restaurantOk) allPassed = false;

      const itemCount = menuBySlug?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
      console.log(`[${restaurantOk ? 'PASS' : 'FAIL'}] "${r.restaurantName}" (slug: "${slug}"):`);
      console.log(`       Doc: ${docOk ? 'OK' : 'FAIL'}, Menu: ${menuOk ? `${menuBySlug.sections.length} sections (${itemCount} items)` : 'FAIL'}, Timings: ${timingsOk ? 'OK' : 'FAIL'}`);
    }

    // Test listApprovedRestaurants for slug population
    const listResult = await listApprovedRestaurants({ limit: 100 });
    const allHaveSlugs = (listResult.restaurants || []).every(r => typeof r.slug === 'string' && r.slug.length > 0);
    console.log(`\nlistApprovedRestaurants returned ${listResult.restaurants?.length} restaurants. All have slug: ${allHaveSlugs}`);

    console.log(`\nFINAL STATUS: ${allPassed && allHaveSlugs ? '100% WORKING AND VERIFIED!' : 'FAILURES DETECTED'}`);
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
