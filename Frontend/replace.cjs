const fs = require('fs');
let c = fs.readFileSync('src/modules/Food/pages/user/TakeawayPage.jsx', 'utf8');

c = c.replace(
  /\(\(\) => \{\n\s*const allMomoItems = sortedAndFilteredRestaurants\.flatMap[\s\S]*?grid grid-cols-2[\s\S]*?<\/div>\s*\);\s*\}\)\(\)/,
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

fs.writeFileSync('src/modules/Food/pages/user/TakeawayPage.jsx', c);
