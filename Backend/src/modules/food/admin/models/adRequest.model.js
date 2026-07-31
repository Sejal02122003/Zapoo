import mongoose from 'mongoose';

const adRequestSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    restaurantName: {
      type: String,
      required: true,
      trim: true,
    },
    restaurantAddress: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
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
    zoneName: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['pending_pricing', 'pending_payment', 'paid', 'live', 'rejected'],
      default: 'pending_pricing',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

adRequestSchema.index({ restaurantId: 1 });
adRequestSchema.index({ status: 1 });

const AdRequest = mongoose.model('AdRequest', adRequestSchema);
export { AdRequest };
export default AdRequest;
