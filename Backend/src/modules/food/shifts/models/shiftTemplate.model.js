import mongoose from 'mongoose';

const shiftSlotSchema = new mongoose.Schema({
    slotOrder: { type: Number, required: true },
    startTime: { type: String, required: true }, // Format "HH:mm" (e.g. "11:00")
    endTime: { type: String, required: true },   // Format "HH:mm" (e.g. "13:00")
    guaranteeAmount: { type: Number, required: true, min: 0 },
    minimumOrders: { type: Number, required: true, min: 0 },
    minimumLoginPercentage: { type: Number, required: true, min: 0, max: 100 },
    maxPartners: { type: Number, required: true, min: 1 },
    isNightSlot: { type: Boolean, default: false }
}, { _id: false });

const shiftTemplateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        city: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        slots: [shiftSlotSchema],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { collection: 'food_shift_templates', timestamps: true }
);

shiftTemplateSchema.index({ city: 1, isActive: 1 });

export const FoodShiftTemplate = mongoose.model('FoodShiftTemplate', shiftTemplateSchema);
