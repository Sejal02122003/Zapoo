const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = content;
        for (const [search, replace] of replacements) {
            modified = modified.split(search).join(replace);
        }
        if (content !== modified) {
            fs.writeFileSync(filePath, modified, 'utf8');
            console.log('Updated', filePath);
        }
    } catch (e) {
        console.error('Failed to process', filePath, e.message);
    }
}

// 1. Home.jsx
replaceInFile('src/modules/Food/pages/user/Home.jsx', [
    ['under250PriceLimit', 'under99PriceLimit'],
    ['under250PriceLimit || 250', 'under99PriceLimit || 99'],
    ['(settingsData.under250PriceLimit) || 250', '(settingsData.under99PriceLimit) || 99'],
    ['to=\"/food/user/under250\"', 'to=\"/food/user/under99\"'],
    ['alt=\"Meals Under 250\"', 'alt=\"Meals Under 99\"'],
    ['Under ₹250', 'Under ₹99'],
    ['@food/assets/category-icons/price_promo.png', '@food/assets/under99Promo.png']
]);

// 2. TakeawayPage.jsx
replaceInFile('src/modules/Food/pages/user/TakeawayPage.jsx', [
    ['under-250-filters', 'under-99-filters'],
    ['readUnder250Filters', 'readUnder99Filters'],
    ['under250Restaurants', 'under99Restaurants'],
    ['setUnder250Restaurants', 'setUnder99Restaurants'],
    ['under250PriceLimit', 'under99PriceLimit'],
    ['setUnder250PriceLimit', 'setUnder99PriceLimit'],
    ['setUnder250PriceLimit(250)', 'setUnder99PriceLimit(99)'],
    ['under-250/public', 'under-250/public'], // Keep backend route same for now
    ['Under 250', 'Under 99'],
    ['under250', 'under99'],
    ['Number(item?.price || 0) <= 250', 'Number(item?.price || 0) <= 99']
]);

// 3. UserRouter.jsx
replaceInFile('src/modules/Food/components/user/UserRouter.jsx', [
    ['Under250', 'Under99'],
    ['under-250', 'under-99']
]);

// 4. RestaurantDetails.jsx
replaceInFile('src/modules/Food/pages/user/restaurants/RestaurantDetails.jsx', [
    ['under250', 'under99'],
    ['Under250', 'Under99']
]);

