import { FoodLandingSettings } from '../models/landingSettings.model.js';

export const getLandingSettings = async () => {
    let doc = await FoodLandingSettings.findOne();
    if (!doc) {
        doc = await FoodLandingSettings.create({});
    }
    const legacyUrl = 'com.indian.bite.user';
    if (!doc.appLinks?.playStore || doc.appLinks.playStore.includes(legacyUrl)) {
        doc.appLinks = doc.appLinks || {};
        doc.appLinks.playStore = 'https://play.google.com/store/apps/details?id=com.zapoo.user1';
        await doc.save();
    }
    return doc.toObject();
};

export const updateLandingSettings = async (payload) => {
    const doc = await FoodLandingSettings.findOneAndUpdate({}, payload, {
        new: true,
        upsert: true
    }).lean();
    return doc;
};

