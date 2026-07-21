const fs = require('fs');

let backendFile = 'src/modules/food/admin/controllers/locationCoupon.controller.js';
let content = fs.readFileSync(backendFile, 'utf8');

content = content.replace("import { LocationCoupon } from '../models/locationCoupon.model.js';", "import { LocationCoupon } from '../models/locationCoupon.model.js';\nimport { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';");

content = content.replace(
    "const { code, title, description, restaurantId, minimumOrderAmount, minimumItems, discountType, discountValue, maximumDiscount, maximumDistance, isActive, startDate, endDate } = req.body;",
    "const { code, title, description, restaurantName, minimumOrderAmount, minimumItems, discountType, discountValue, maximumDiscount, maximumDistance, isActive, startDate, endDate } = req.body;\n\n        if (!restaurantName) return sendResponse(res, 400, 'Restaurant Name is required');\n        const restaurant = await FoodRestaurant.findOne({ restaurantName: new RegExp('^' + restaurantName + '', 'i') });\n        if (!restaurant) return sendResponse(res, 404, 'Restaurant not found with the given name');\n        const restaurantId = restaurant._id;"
);

content = content.replace(
    "const updates = req.body;",
    "const updates = req.body;\n        if (updates.restaurantName) {\n            const restaurant = await FoodRestaurant.findOne({ restaurantName: new RegExp('^' + updates.restaurantName + '', 'i') });\n            if (!restaurant) return sendResponse(res, 404, 'Restaurant not found with the given name');\n            updates.restaurantId = restaurant._id;\n            delete updates.restaurantName;\n        }"
);

fs.writeFileSync(backendFile, content, 'utf8');
console.log("Updated Backend");
