export const COLLECTION_DATA = {
  momo: {
    titlePrefix: "HOT & STEAMING",
    titleMain: "MOMOS",
    description: "From classic steamed to spicy kurkure, satisfy your dumpling cravings right here!",
    dropdownTitle: "MOMO CRAVINGS",
    emojis: ["🥟", "🥢", "🌶️", "🥣"],
    restaurants: [
      {
        id: "momo-1",
        name: "The Dumpling House",
        deliveryTime: "25-30 min",
        distance: "2.5 km",
        rating: 4.8,
        totalRatings: 500,
        isNew: false,
        slug: "the-dumpling-house",
        menuItems: [
          { id: "momo-item-1", name: "Classic Steamed Veg Momo", price: 120, isVeg: true, image: "https://images.unsplash.com/photo-1625220194771-7eb5a2225215?q=80&w=800&auto=format&fit=crop" },
          { id: "momo-item-2", name: "Chicken Steamed Momo", price: 150, isVeg: false, image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=800&auto=format&fit=crop" }
        ]
      },
      {
        id: "momo-2",
        name: "Momo Magic",
        deliveryTime: "15-25 min",
        distance: "1.2 km",
        rating: 4.5,
        totalRatings: 320,
        isNew: true,
        slug: "momo-magic",
        menuItems: [
          { id: "momo-item-3", name: "Kurkure Paneer Momo", price: 180, isVeg: true, image: "https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=800&auto=format&fit=crop" },
          { id: "momo-item-4", name: "Fried Chicken Momo", price: 160, isVeg: false, image: "https://images.unsplash.com/photo-1574484284002-952d92456975?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  dosa: {
    titlePrefix: "CRISPY & GOLDEN",
    titleMain: "DOSAS",
    description: "From crispy paper roasts to spicy mysore masala, discover authentic South Indian flavors!",
    dropdownTitle: "DOSA DELIGHTS",
    emojis: ["🥘", "🥥", "🍅", "🌿"],
    restaurants: [
      {
        id: "dosa-1",
        name: "South Indian Delight",
        deliveryTime: "25-35 min",
        distance: "3.2 km",
        rating: 4.7,
        totalRatings: 1250,
        isNew: false,
        slug: "south-indian-delight",
        menuItems: [
          { id: "dosa-item-1", name: "Classic Masala Dosa", price: 130, isVeg: true, image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=800&auto=format&fit=crop" },
          { id: "dosa-item-2", name: "Mysore Masala Dosa", price: 160, isVeg: true, image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?q=80&w=800&auto=format&fit=crop" }
        ]
      },
      {
        id: "dosa-2",
        name: "Dosa Express",
        deliveryTime: "15-20 min",
        distance: "1.5 km",
        rating: 4.4,
        totalRatings: 420,
        isNew: true,
        slug: "dosa-express",
        menuItems: [
          { id: "dosa-item-3", name: "Paneer Cheese Dosa", price: 190, isVeg: true, image: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=800&auto=format&fit=crop" },
          { id: "dosa-item-4", name: "Paper Roast Dosa", price: 110, isVeg: true, image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  pizza: {
    titlePrefix: "HOT & CHEESY",
    titleMain: "PIZZA",
    description: "From classic margherita to loaded supreme, get your perfect slice delivered hot!",
    dropdownTitle: "PIZZA PARTY",
    emojis: ["🍕", "🧀", "🍅", "🌿"],
    restaurants: [
      {
        id: "pizza-1",
        name: "Pizza Paradise",
        deliveryTime: "30-40 min",
        distance: "3.5 km",
        rating: 4.6,
        totalRatings: 850,
        isNew: false,
        slug: "pizza-paradise",
        menuItems: [
          { id: "pizza-item-1", name: "Classic Margherita", price: 199, isVeg: true, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=800&auto=format&fit=crop" },
          { id: "pizza-item-2", name: "Pepperoni Passion", price: 299, isVeg: false, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=800&auto=format&fit=crop" }
        ]
      },
      {
        id: "pizza-2",
        name: "Slice of Italy",
        deliveryTime: "25-35 min",
        distance: "2.1 km",
        rating: 4.3,
        totalRatings: 320,
        isNew: true,
        slug: "slice-of-italy",
        menuItems: [
          { id: "pizza-item-3", name: "Veggie Supreme", price: 249, isVeg: true, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop" },
          { id: "pizza-item-4", name: "Mushroom & Olive", price: 279, isVeg: true, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  burger: {
    titlePrefix: "JUICY & THICK",
    titleMain: "BURGERS",
    description: "Satisfy your cravings with our mouth-watering, fully loaded burgers!",
    dropdownTitle: "BURGER BASH",
    emojis: ["🍔", "🍟", "🥤", "🍅"],
    restaurants: [
      {
        id: "burger-1",
        name: "Burger Brothers",
        deliveryTime: "20-30 min",
        distance: "2.8 km",
        rating: 4.5,
        totalRatings: 670,
        isNew: false,
        slug: "burger-brothers",
        menuItems: [
          { id: "burger-item-1", name: "Classic Cheeseburger", price: 149, isVeg: false, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop" },
          { id: "burger-item-2", name: "Veggie Patty Burger", price: 129, isVeg: true, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  poha: {
    titlePrefix: "LIGHT & FLUFFY",
    titleMain: "POHA",
    description: "Start your day right with authentic, traditional Indian breakfast!",
    dropdownTitle: "POHA PARADISE",
    emojis: ["🍛", "🥜", "🍋", "🌶️"],
    restaurants: [
      {
        id: "poha-1",
        name: "Morning Bites",
        deliveryTime: "15-25 min",
        distance: "1.8 km",
        rating: 4.8,
        totalRatings: 920,
        isNew: false,
        slug: "morning-bites",
        menuItems: [
          { id: "poha-item-1", name: "Indori Poha", price: 60, isVeg: true, image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?q=80&w=800&auto=format&fit=crop" },
          { id: "poha-item-2", name: "Kanda Poha", price: 50, isVeg: true, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  thali: {
    titlePrefix: "WHOLESOME & RICH",
    titleMain: "THALI",
    description: "Experience a feast of flavors with our grand traditional thalis!",
    dropdownTitle: "THALI FEAST",
    emojis: ["🍱", "🍚", "🍲", "🫓"],
    restaurants: [
      {
        id: "thali-1",
        name: "Royal Kitchen",
        deliveryTime: "35-50 min",
        distance: "4.5 km",
        rating: 4.4,
        totalRatings: 1500,
        isNew: false,
        slug: "royal-kitchen",
        menuItems: [
          { id: "thali-item-1", name: "Maharaja Veg Thali", price: 299, isVeg: true, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=800&auto=format&fit=crop" },
          { id: "thali-item-2", name: "Special Punjabi Thali", price: 250, isVeg: true, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  sandwich: {
    titlePrefix: "GRILLED & TOASTED",
    titleMain: "SANDWICH",
    description: "Packed with your favorite fillings, grilled to perfect crispiness!",
    dropdownTitle: "SANDWICH SPOT",
    emojis: ["🥪", "🧀", "🥬", "🍅"],
    restaurants: [
      {
        id: "sandwich-1",
        name: "The Toast Club",
        deliveryTime: "20-30 min",
        distance: "2.0 km",
        rating: 4.6,
        totalRatings: 430,
        isNew: true,
        slug: "the-toast-club",
        menuItems: [
          { id: "sandwich-item-1", name: "Bombay Grilled Sandwich", price: 120, isVeg: true, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop" },
          { id: "sandwich-item-2", name: "Club Sandwich", price: 160, isVeg: false, image: "https://images.unsplash.com/photo-1553909489-cd47ce7ea3c1?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  tea: {
    titlePrefix: "WARM & SOOTHING",
    titleMain: "TEA",
    description: "Sip on the finest blends of traditional Indian chai and snacks!",
    dropdownTitle: "TEA TIME",
    emojis: ["☕", "🫖", "🍪", "🌿"],
    restaurants: [
      {
        id: "tea-1",
        name: "Chai Point",
        deliveryTime: "15-20 min",
        distance: "1.0 km",
        rating: 4.7,
        totalRatings: 2100,
        isNew: false,
        slug: "chai-point",
        menuItems: [
          { id: "tea-item-1", name: "Masala Chai Flask", price: 149, isVeg: true, image: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=800&auto=format&fit=crop" },
          { id: "tea-item-2", name: "Ginger Tea", price: 50, isVeg: true, image: "https://images.unsplash.com/photo-1576092762791-dd9e2220abd1?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  idli: {
    titlePrefix: "SOFT & FLUFFY",
    titleMain: "IDLI",
    description: "Enjoy steaming hot idlis served with spicy sambar and fresh chutney!",
    dropdownTitle: "IDLI STATION",
    emojis: ["🍚", "🥥", "🍲", "🌿"],
    restaurants: [
      {
        id: "idli-1",
        name: "Idli House",
        deliveryTime: "20-25 min",
        distance: "2.4 km",
        rating: 4.8,
        totalRatings: 640,
        isNew: false,
        slug: "idli-house",
        menuItems: [
          { id: "idli-item-1", name: "Thatte Idli", price: 80, isVeg: true, image: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=800&auto=format&fit=crop" },
          { id: "idli-item-2", name: "Mini Sambar Idli", price: 110, isVeg: true, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  "south-indian": {
    titlePrefix: "AUTHENTIC SPICES",
    titleMain: "SOUTH INDIAN",
    description: "Dive into a rich heritage of traditional South Indian cuisine!",
    dropdownTitle: "SOUTH SPECIAL",
    emojis: ["🥘", "🥥", "🍛", "🌶️"],
    restaurants: [
      {
        id: "south-indian-1",
        name: "Dakshin Flavors",
        deliveryTime: "30-40 min",
        distance: "3.8 km",
        rating: 4.5,
        totalRatings: 1100,
        isNew: false,
        slug: "dakshin-flavors",
        menuItems: [
          { id: "south-item-1", name: "Pesarattu", price: 140, isVeg: true, image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?q=80&w=800&auto=format&fit=crop" },
          { id: "south-item-2", name: "Bisi Bele Bath", price: 180, isVeg: true, image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  },
  "veg-meal": {
    titlePrefix: "PURE & FRESH",
    titleMain: "VEG MEALS",
    description: "Nourish yourself with completely pure, wholesome vegetarian dishes!",
    dropdownTitle: "PURE VEG",
    emojis: ["🥗", "🥦", "🥕", "🥑"],
    restaurants: [
      {
        id: "veg-meal-1",
        name: "Green Leaf Cafe",
        deliveryTime: "25-35 min",
        distance: "2.9 km",
        rating: 4.7,
        totalRatings: 890,
        isNew: false,
        slug: "green-leaf-cafe",
        menuItems: [
          { id: "veg-item-1", name: "Paneer Butter Masala Meal", price: 220, isVeg: true, image: "https://images.unsplash.com/photo-1550461716-406e902b3df5?q=80&w=800&auto=format&fit=crop" },
          { id: "veg-item-2", name: "Dal Makhani with Rice", price: 180, isVeg: true, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop" }
        ]
      }
    ]
  }
};
