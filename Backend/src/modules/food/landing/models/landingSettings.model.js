import mongoose from 'mongoose';

const foodLandingSettingsSchema = new mongoose.Schema(
    {
        heroHeading: {
            type: String,
            default: 'GOOD FOOD, JUST A TAP AWAY.'
        },
        heroSubheading: {
            type: String,
            default: 'Discover the best food around you, order your favourites for delivery, or order ahead for a quick and easy pickup.'
        },
        exploreMoreHeading: {
            type: String,
            default: 'Explore more'
        },
        appDownloadHeading: {
            type: String,
            default: 'Order Food Anywhere, Anytime with Zapoo App'
        },
        appDownloadSubheading: {
            type: String,
            default: 'Get real-time tracking, exclusive discounts, instant cashback, and fast delivery right at your doorstep.'
        },
        recommendedRestaurantIds: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'FoodRestaurant',
            default: []
        },
        showHeroBanners: {
            type: Boolean,
            default: true
        },
        showUnder99: {
            type: Boolean,
            default: true
        },
        showDining: {
            type: Boolean,
            default: true
        },
        showExploreIcons: {
            type: Boolean,
            default: true
        },
        showTop10: {
            type: Boolean,
            default: true
        },
        showGourmet: {
            type: Boolean,
            default: true
        },
        under99PriceLimit: {
            type: Number,
            default: 99,
            min: 1,
            max: 10000
        },
        festBannerImages: {
            type: [String],
            default: []
        },
        stats: {
            restaurants: { type: String, default: '3,00,000+' },
            cities: { type: String, default: '800+' },
            orders: { type: String, default: '3 billion+' }
        },
        appLinks: {
            playStore: { type: String, default: 'https://play.google.com/store/search?q=zapoo&c=apps&hl=en' },
            appStore: { type: String, default: '' },
            restaurantPartner: { type: String, default: 'https://share.google/LGq4J5ulU5bTmzVqD' },
            deliveryPartner: { type: String, default: 'https://play.google.com/store/apps/details?id=com.zapoo.delivery1&hl=en' }
        },
        socialLinks: {
            instagram: { type: String, default: '' },
            twitter: { type: String, default: '' },
            facebook: { type: String, default: '' },
            linkedin: { type: String, default: '' },
            youtube: { type: String, default: '' }
        },
        copyrightText: {
            type: String,
            default: '© 2026 Zapoo Inc. All rights reserved.'
        },
        heroSlides: {
            type: Array,
            default: []
        }
    },
    {
        collection: 'food_landing_settings',
        timestamps: true
    }
);

export const FoodLandingSettings = mongoose.model('FoodLandingSettings', foodLandingSettingsSchema);
