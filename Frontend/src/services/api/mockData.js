export const mockRestaurants = [
  {
    _id: "mock-rest-1",
    restaurantId: "mock-rest-1",
    id: "mock-rest-1",
    name: "The Spice Route",
    slug: "the-spice-route",
    profileImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=500&fit=crop",
    coverImages: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&h=500&fit=crop"],
    rating: 4.8,
    reviews: 1250,
    estimatedDeliveryTime: "30-40 mins",
    distanceText: "2.5 km",
    topCategory: "Indian",
    cuisines: ["North Indian", "Mughlai", "Biryani"],
    address: "123 Food Street, Foodville",
    location: {
      formattedAddress: "123 Food Street, Foodville, 400001",
      latitude: 19.0760,
      longitude: 72.8777
    },
    priceRange: "$$",
    isActive: true,
    isAcceptingOrders: true,
  },
  {
    _id: "mock-rest-2",
    restaurantId: "mock-rest-2",
    id: "mock-rest-2",
    name: "Burger Joint",
    slug: "burger-joint",
    profileImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop",
    coverImages: ["https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&h=500&fit=crop"],
    rating: 4.5,
    reviews: 890,
    estimatedDeliveryTime: "20-30 mins",
    distanceText: "1.2 km",
    topCategory: "American",
    cuisines: ["Burgers", "Fast Food", "Beverages"],
    address: "456 Burger Ave, Foodville",
    location: {
      formattedAddress: "456 Burger Ave, Foodville, 400002",
      latitude: 19.0800,
      longitude: 72.8800
    },
    priceRange: "$",
    isActive: true,
    isAcceptingOrders: true,
  }
];

export const mockOffers = {
  dailyDeals: [
    {
      id: "deal-1",
      restaurantId: "mock-rest-1",
      restaurantName: "The Spice Route",
      restaurantImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=500&fit=crop",
      dealText: "50% OFF up to ₹100",
      title: "50% OFF",
      restaurantRating: 4.8,
      deliveryTime: "30-40 mins"
    },
    {
      id: "deal-2",
      restaurantId: "mock-rest-2",
      restaurantName: "Burger Joint",
      restaurantImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop",
      dealText: "Flat ₹150 OFF",
      title: "Flat ₹150 OFF",
      restaurantRating: 4.5,
      deliveryTime: "20-30 mins"
    }
  ],
  bestOffers: [
    {
      id: "offer-1",
      restaurantId: "mock-rest-1",
      restaurantName: "The Spice Route",
      restaurantImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=500&fit=crop",
      title: "Buy 1 Get 1 Free",
      restaurantRating: 4.8,
      deliveryTime: "30-40 mins"
    },
    {
      id: "offer-2",
      restaurantId: "mock-rest-2",
      restaurantName: "Burger Joint",
      restaurantImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop",
      title: "20% OFF above ₹500",
      restaurantRating: 4.5,
      deliveryTime: "20-30 mins"
    }
  ]
};

export const mockMenus = {
  "mock-rest-1": {
    sections: [
      {
        name: "Recommended",
        items: [
          {
            _id: "item-1",
            id: "item-1",
            name: "Butter Chicken",
            description: "Creamy and rich tomato-based curry with tender chicken pieces.",
            price: 350,
            image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&h=500&fit=crop",
            isVeg: false,
            isBestseller: true,
            inStock: true,
          },
          {
            _id: "item-2",
            id: "item-2",
            name: "Paneer Tikka Masala",
            description: "Grilled paneer cubes in a spicy tomato and onion gravy.",
            price: 300,
            image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&h=500&fit=crop",
            isVeg: true,
            isBestseller: true,
            inStock: true,
          }
        ]
      },
      {
        name: "Breads",
        items: [
          {
            _id: "item-3",
            id: "item-3",
            name: "Garlic Naan",
            description: "Soft and fluffy flatbread flavored with garlic and butter.",
            price: 60,
            image: "https://images.unsplash.com/photo-1626200419188-348eebf82b71?w=500&h=500&fit=crop",
            isVeg: true,
            isBestseller: false,
            inStock: true,
          }
        ]
      }
    ]
  },
  "mock-rest-2": {
    sections: [
      {
        name: "Burgers",
        items: [
          {
            _id: "item-4",
            id: "item-4",
            name: "Classic Chicken Burger",
            description: "Crispy chicken patty with lettuce, tomato, and mayo.",
            price: 250,
            image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop",
            isVeg: false,
            isBestseller: true,
            inStock: true,
          },
          {
            _id: "item-5",
            id: "item-5",
            name: "Veggie Supreme Burger",
            description: "Plant-based patty with cheese, fresh veggies, and our secret sauce.",
            price: 200,
            image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&h=500&fit=crop",
            isVeg: true,
            isBestseller: true,
            inStock: true,
          }
        ]
      }
    ]
  }
};
