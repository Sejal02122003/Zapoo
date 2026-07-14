const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/modules/Food/pages/user/TakeawayPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add import for TakeawayRestaurantRow
if (!content.includes('import TakeawayRestaurantRow')) {
  content = content.replace(
    'import { motion, AnimatePresence } from "framer-motion"',
    'import { motion, AnimatePresence } from "framer-motion"\nimport TakeawayRestaurantRow from "@food/components/user/TakeawayRestaurantRow"'
  );
}

// 2. Change getRestaurants to include isTakeawayEnabled
content = content.replace(
  /const response = await restaurantAPI\.getRestaurants\(zoneId \? \{ zoneId \} : \{\}\)/g,
  'const response = await restaurantAPI.getRestaurants({ ...(zoneId ? { zoneId } : {}), isTakeawayEnabled: true })'
);

// 3. Remove fetchMenusForChunk useEffect entirely
content = content.replace(
  /\/\/\ 2\. Fetch menus for the current chunk when visible count increases[\s\S]*?\}, \[allRawRestaurants, visibleRestaurantCount, zoneId, isOutOfService\]\)/,
  ''
);

// 4. Remove category rendering block
content = content.replace(
  /<div className=\{`sticky z-30 transition-all duration-300[\s\S]*?<\/div>\s*\{\/\* Filters Section \(Not Sticky\) \*\/\}/,
  '{/* Filters Section (Not Sticky) */}'
);

// 5. Replace the rendering of allMomoItems grid with sortedAndFilteredRestaurants mapping
content = content.replace(
  /\(\(\) => \{[\s\S]*?const allMomoItems[\s\S]*?return \([\s\S]*?grid grid-cols-2[\s\S]*?<\/div>\s*\);\s*\}\)\(\)/,
  `(() => {
    return (
      <div className="flex flex-col space-y-4 pb-12">
        {sortedAndFilteredRestaurants.map((restaurant) => (
          <TakeawayRestaurantRow key={restaurant._id || restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    );
  })()`
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully refactored TakeawayPage.jsx');
