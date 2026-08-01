import mongoose from 'mongoose';

const promoBannerSchema = new mongoose.Schema(
    {
        idSlug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        subtitle: {
            type: String,
            trim: true,
        },
        ctaText: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            trim: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            default: null,
        },
        scope: {
            type: String,
            enum: ['global', 'zone'],
            default: 'global',
        },
        zoneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodZone',
            default: null,
        },
        adRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AdRequest',
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const PromoBanner = mongoose.model('PromoBanner', promoBannerSchema);
