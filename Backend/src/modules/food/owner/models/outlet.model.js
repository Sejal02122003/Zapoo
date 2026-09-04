import mongoose from "mongoose";

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined,
    },
    latitude: { type: Number },
    longitude: { type: Number },
    formattedAddress: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    landmark: { type: String, trim: true },
  },
  { _id: false }
);

export const OUTLET_PERMISSIONS = [
  "VIEW_ORDERS",
  "ACCEPT_ORDERS",
  "REJECT_ORDERS",
  "UPDATE_ORDER_STATUS",
  "MANAGE_MENU",
  "MANAGE_INVENTORY",
  "VIEW_PAYMENTS",
  "VIEW_REVENUE",
  "VIEW_PROFIT",
  "MANAGE_STAFF",
];

const outletSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodRestaurant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    outletCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    phoneLast10: {
      type: String,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    managerName: {
      type: String,
      trim: true,
    },
    managerPhone: {
      type: String,
      trim: true,
    },
    address: {
      addressLine1: { type: String, trim: true },
      addressLine2: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      landmark: { type: String, trim: true },
      formattedAddress: { type: String, trim: true },
    },
    location: {
      type: geoPointSchema,
      default: undefined,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodZone",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "closed"],
      default: "active",
      index: true,
    },
    isAcceptingOrders: {
      type: Boolean,
      default: true,
      index: true,
    },
    isTakeawayEnabled: {
      type: Boolean,
      default: true,
    },
    pureVeg: {
      type: Boolean,
      default: false,
    },
    cuisines: {
      type: [String],
      default: [],
    },
    credentials: {
      username: { type: String, trim: true },
      passwordHash: { type: String },
      rawPasswordDisplay: { type: String }, // Stored for owner view display convenience
      contactPhone: { type: String, trim: true },
    },
    permissions: {
      type: [String],
      default: [
        "VIEW_ORDERS",
        "ACCEPT_ORDERS",
        "REJECT_ORDERS",
        "UPDATE_ORDER_STATUS",
        "MANAGE_MENU",
        "MANAGE_INVENTORY",
        "VIEW_PAYMENTS",
      ],
    },
    timings: {
      openTime: { type: String, default: "09:00" },
      closeTime: { type: String, default: "23:00" },
      openDays: {
        type: [String],
        default: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
      },
      schedule: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    outletTimings: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fssaiNumber: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    fcmTokens: { type: [String], default: [] },
    fcmTokenMobile: { type: [String], default: [] },
  },
  {
    collection: "food_restaurant_outlets",
    timestamps: true,
  }
);

outletSchema.pre("validate", function normalizeFields(next) {
  if (this.phone) {
    const digits = String(this.phone).replace(/\D/g, "");
    this.phoneLast10 = digits.slice(-10);
  }
  if (this.outletCode) {
    this.outletCode = String(this.outletCode).trim().toUpperCase();
  }
  next();
});

outletSchema.index({ restaurantId: 1, outletCode: 1 }, { unique: true });
outletSchema.index({ restaurantId: 1, status: 1 });
outletSchema.index({ "credentials.username": 1 }, { sparse: true });
outletSchema.index({ location: "2dsphere" });

export const FoodOutlet = mongoose.model("FoodOutlet", outletSchema);
