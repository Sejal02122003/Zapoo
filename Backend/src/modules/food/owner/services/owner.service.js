import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { FoodOutlet } from "../models/outlet.model.js";
import { FoodRestaurant } from "../../restaurant/models/restaurant.model.js";
import { FoodOrder } from "../../orders/models/order.model.js";
import { FoodRestaurantMenu } from "../../restaurant/models/restaurantMenu.model.js";
import { FoodItem } from "../../admin/models/food.model.js";
import { ValidationError, NotFoundError, AuthError } from "../../../../core/auth/errors.js";

/**
 * Helper to build pagination
 */
const buildPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Get comprehensive owner dashboard summary
 */
export async function getOwnerSummary(restaurantId, query = {}) {
  if (!restaurantId) throw new ValidationError("Restaurant ID is required");

  const restObjectId = new mongoose.Types.ObjectId(restaurantId);
  const { outletId, startDate, endDate } = query;

  // Base match filter for orders
  const matchFilter = {
    restaurantId: restObjectId,
    $or: [
      { "payment.method": { $in: ["cash", "cod", "CASH", "COD", "wallet", "WALLET"] } },
      { "payment.status": { $in: ["paid", "PAID", "authorized", "captured", "settled", "refunded"] } },
      { orderStatus: { $in: ["confirmed", "accepted", "preparing", "ready_for_pickup", "ready", "picked_up", "out_for_delivery", "reached_drop", "delivered", "completed", "cancelled_by_user", "cancelled_by_restaurant", "cancelled_by_admin"] } }
    ]
  };

  if (outletId && mongoose.Types.ObjectId.isValid(outletId)) {
    matchFilter.outletId = new mongoose.Types.ObjectId(outletId);
  }

  if (startDate || endDate) {
    matchFilter.createdAt = {};
    if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
    if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
  }

  // Fetch outlets list for this owner
  const outlets = await FoodOutlet.find({ restaurantId: restObjectId })
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate metrics
  const orderStats = await FoodOrder.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$orderStatus",
                  ["completed", "delivered", "confirmed", "preparing", "ready_for_pickup", "reached_pickup", "picked_up", "reached_drop"],
                ],
              },
              { $ifNull: ["$pricing.total", 0] },
              0,
            ],
          },
        },
        completedOrders: {
          $sum: {
            $cond: [{ $in: ["$orderStatus", ["completed", "delivered"]] }, 1, 0],
          },
        },
        pendingOrders: {
          $sum: {
            $cond: [{ $in: ["$orderStatus", ["created", "confirmed", "preparing", "ready_for_pickup"]] }, 1, 0],
          },
        },
        cancelledOrders: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$orderStatus",
                  ["cancelled_by_user", "cancelled_by_restaurant", "cancelled_by_admin", "dead"],
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const stats = orderStats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
  };

  // Estimate net profit (approx. 25% margin or based on business model)
  const totalRevenue = stats.totalRevenue || 0;
  const estimatedProfit = Math.round(totalRevenue * 0.25);

  // Outlet-wise breakdown aggregation
  const outletAggregation = await FoodOrder.aggregate([
    { $match: { restaurantId: restObjectId } },
    {
      $group: {
        _id: "$outletId",
        orderCount: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$orderStatus",
                  ["completed", "delivered", "confirmed", "preparing", "ready_for_pickup", "reached_pickup", "picked_up", "reached_drop"],
                ],
              },
              { $ifNull: ["$pricing.total", 0] },
              0,
            ],
          },
        },
      },
    },
  ]);

  const outletStatsMap = new Map();
  outletAggregation.forEach((item) => {
    if (item._id) {
      outletStatsMap.set(String(item._id), {
        orderCount: item.orderCount,
        revenue: item.revenue,
        profit: Math.round(item.revenue * 0.25),
      });
    }
  });

  const outletBreakdown = outlets.map((outlet) => {
    const oId = String(outlet._id);
    const agg = outletStatsMap.get(oId) || { orderCount: 0, revenue: 0, profit: 0 };
    return {
      _id: outlet._id,
      name: outlet.name,
      outletCode: outlet.outletCode,
      phone: outlet.phone,
      city: outlet.address?.city || outlet.address?.area || "Default City",
      area: outlet.address?.area || "",
      status: outlet.status,
      isAcceptingOrders: outlet.isAcceptingOrders,
      rating: outlet.rating || 4.5,
      totalOrders: agg.orderCount,
      totalRevenue: agg.revenue,
      totalProfit: agg.profit,
      permissions: outlet.permissions || [],
      managerName: outlet.managerName || "",
      managerPhone: outlet.managerPhone || "",
    };
  });

  // Recent 10 orders across outlets
  const recentOrders = await FoodOrder.find(matchFilter)
    .populate("userId", "name phone")
    .populate("outletId", "name outletCode")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Fetch restaurant details
  const restaurant = await FoodRestaurant.findById(restObjectId).lean();

  return {
    restaurant: restaurant
      ? {
          _id: restaurant._id,
          name: restaurant.name,
          phone: restaurant.phone,
          email: restaurant.email,
          logo: restaurant.logo,
          bannerImage: restaurant.bannerImage,
          rating: restaurant.rating || 4.5,
          status: restaurant.status,
          isActive: restaurant.isActive,
          isAcceptingOrders: restaurant.isAcceptingOrders,
          location: restaurant.location,
        }
      : null,
    summary: {
      totalRevenue,
      totalProfit: estimatedProfit,
      totalOrders: stats.totalOrders,
      completedOrders: stats.completedOrders,
      pendingOrders: stats.pendingOrders,
      cancelledOrders: stats.cancelledOrders,
      totalOutlets: outlets.length,
      activeOutlets: outlets.filter((o) => o.status === "active").length,
    },
    outletBreakdown,
    recentOrders: recentOrders.map((o) => ({
      _id: o._id,
      order_id: o.order_id || o.orderId || String(o._id).slice(-6),
      orderStatus: o.orderStatus,
      orderType: o.orderType,
      total: o.pricing?.total || 0,
      customerName: o.customerName || o.userId?.name || "Guest Customer",
      customerPhone: o.customerPhone || o.userId?.phone || "",
      outletName: o.outletId?.name || "Main Outlet",
      outletCode: o.outletId?.outletCode || "",
      outletId: o.outletId?._id || o.outletId,
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      createdAt: o.createdAt,
    })),
  };
}

/**
 * List outlets with search and status filter
 */
export async function listOutlets(restaurantId, query = {}) {
  if (!restaurantId) throw new ValidationError("Restaurant ID is required");

  const restObjectId = new mongoose.Types.ObjectId(restaurantId);
  const { page, limit, skip } = buildPagination(query);

  const filter = { restaurantId: restObjectId };
  if (query.status) {
    filter.status = query.status;
  }
  if (query.search) {
    const s = String(query.search).trim();
    filter.$or = [
      { name: { $regex: s, $options: "i" } },
      { outletCode: { $regex: s, $options: "i" } },
      { phone: { $regex: s, $options: "i" } },
      { "address.city": { $regex: s, $options: "i" } },
      { "address.area": { $regex: s, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    FoodOutlet.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOutlet.countDocuments(filter),
  ]);

  return {
    outlets: docs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create new outlet under owner's restaurant
 */
export async function createOutlet(restaurantId, data = {}) {
  if (!restaurantId) throw new ValidationError("Restaurant ID is required");
  if (!data.name) throw new ValidationError("Outlet Name is required");
  if (!data.phone) throw new ValidationError("Outlet Phone is required");

  const restObjectId = new mongoose.Types.ObjectId(restaurantId);

  // Generate unique outlet code if not specified
  let outletCode = data.outletCode ? String(data.outletCode).trim().toUpperCase() : "";
  if (!outletCode) {
    const count = await FoodOutlet.countDocuments({ restaurantId: restObjectId });
    outletCode = `OUTLET${String(count + 1).padStart(3, "0")}`;
  }

  // Check unique outletCode
  const existing = await FoodOutlet.findOne({
    restaurantId: restObjectId,
    outletCode,
  });
  if (existing) {
    throw new ValidationError(`Outlet code '${outletCode}' already exists for this restaurant`);
  }

  // Handle credentials
  const username = data.username ? String(data.username).trim().toLowerCase() : `${outletCode.toLowerCase()}@zapoo.com`;
  const rawPassword = data.password ? String(data.password).trim() : Math.random().toString(36).slice(-8) + "Zp@1";
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  const outletDoc = new FoodOutlet({
    restaurantId: restObjectId,
    name: data.name,
    outletCode,
    phone: data.phone,
    email: data.email || username,
    managerName: data.managerName || "",
    managerPhone: data.managerPhone || data.phone,
    address: {
      addressLine1: data.addressLine1 || data.address?.addressLine1 || "",
      addressLine2: data.addressLine2 || data.address?.addressLine2 || "",
      area: data.area || data.address?.area || "",
      city: data.city || data.address?.city || "",
      state: data.state || data.address?.state || "",
      pincode: data.pincode || data.address?.pincode || "",
      landmark: data.landmark || data.address?.landmark || "",
      formattedAddress: data.formattedAddress || data.address?.formattedAddress || "",
    },
    location: data.location || (data.latitude && data.longitude ? {
      type: "Point",
      coordinates: [Number(data.longitude), Number(data.latitude)],
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    } : undefined),
    zoneId: data.zoneId || undefined,
    status: data.status || "active",
    isAcceptingOrders: data.isAcceptingOrders !== undefined ? Boolean(data.isAcceptingOrders) : true,
    isTakeawayEnabled: data.isTakeawayEnabled !== undefined ? Boolean(data.isTakeawayEnabled) : true,
    pureVeg: Boolean(data.pureVeg),
    cuisines: Array.isArray(data.cuisines) ? data.cuisines : [],
    credentials: {
      username,
      passwordHash,
      rawPasswordDisplay: rawPassword,
      contactPhone: data.phone,
    },
    permissions: Array.isArray(data.permissions) && data.permissions.length > 0
      ? data.permissions
      : [
          "VIEW_ORDERS",
          "ACCEPT_ORDERS",
          "REJECT_ORDERS",
          "UPDATE_ORDER_STATUS",
          "MANAGE_MENU",
          "MANAGE_INVENTORY",
          "VIEW_PAYMENTS",
        ],
    timings: data.timings || {
      openTime: data.openTime || "09:00",
      closeTime: data.closeTime || "23:00",
      openDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    },
    fssaiNumber: data.fssaiNumber || "",
    gstNumber: data.gstNumber || "",
  });

  await outletDoc.save();

  return {
    outlet: outletDoc,
    generatedCredentials: {
      username,
      password: rawPassword,
    },
  };
}

/**
 * Get single outlet
 */
export async function getOutletById(restaurantId, outletId) {
  if (!restaurantId || !outletId) throw new ValidationError("Missing restaurantId or outletId");
  const doc = await FoodOutlet.findOne({
    _id: new mongoose.Types.ObjectId(outletId),
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  }).lean();
  if (!doc) throw new NotFoundError("Outlet not found");
  return doc;
}

/**
 * Update outlet
 */
export async function updateOutlet(restaurantId, outletId, updateData = {}) {
  if (!restaurantId || !outletId) throw new ValidationError("Missing restaurantId or outletId");

  const outlet = await FoodOutlet.findOne({
    _id: new mongoose.Types.ObjectId(outletId),
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });

  if (!outlet) throw new NotFoundError("Outlet not found");

  // Fields allowed to update
  if (updateData.name) outlet.name = String(updateData.name).trim();
  if (updateData.phone) outlet.phone = String(updateData.phone).trim();
  if (updateData.email) outlet.email = String(updateData.email).trim().toLowerCase();
  if (updateData.managerName !== undefined) outlet.managerName = String(updateData.managerName).trim();
  if (updateData.managerPhone !== undefined) outlet.managerPhone = String(updateData.managerPhone).trim();
  if (updateData.status) outlet.status = updateData.status;
  if (updateData.isAcceptingOrders !== undefined) outlet.isAcceptingOrders = Boolean(updateData.isAcceptingOrders);
  if (updateData.isTakeawayEnabled !== undefined) outlet.isTakeawayEnabled = Boolean(updateData.isTakeawayEnabled);
  if (updateData.pureVeg !== undefined) outlet.pureVeg = Boolean(updateData.pureVeg);
  if (Array.isArray(updateData.cuisines)) outlet.cuisines = updateData.cuisines;
  if (Array.isArray(updateData.permissions)) outlet.permissions = updateData.permissions;
  if (updateData.timings) outlet.timings = { ...outlet.timings, ...updateData.timings };
  if (updateData.fssaiNumber !== undefined) outlet.fssaiNumber = updateData.fssaiNumber;
  if (updateData.gstNumber !== undefined) outlet.gstNumber = updateData.gstNumber;

  if (updateData.address) {
    outlet.address = {
      ...outlet.address,
      ...updateData.address,
    };
  }

  if (updateData.location || (updateData.latitude && updateData.longitude)) {
    const lat = Number(updateData.latitude || updateData.location?.latitude);
    const lng = Number(updateData.longitude || updateData.location?.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      outlet.location = {
        type: "Point",
        coordinates: [lng, lat],
        latitude: lat,
        longitude: lng,
      };
    }
  }

  await outlet.save();
  return outlet;
}

/**
 * Reset outlet login credentials
 */
export async function resetOutletCredentials(restaurantId, outletId, data = {}) {
  if (!restaurantId || !outletId) throw new ValidationError("Missing restaurantId or outletId");

  const outlet = await FoodOutlet.findOne({
    _id: new mongoose.Types.ObjectId(outletId),
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });

  if (!outlet) throw new NotFoundError("Outlet not found");

  const newPassword = data.password ? String(data.password).trim() : Math.random().toString(36).slice(-8) + "Zp@1";
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  outlet.credentials = outlet.credentials || {};
  if (data.username) {
    outlet.credentials.username = String(data.username).trim().toLowerCase();
  }
  outlet.credentials.passwordHash = passwordHash;
  outlet.credentials.rawPasswordDisplay = newPassword;
  if (data.contactPhone) {
    outlet.credentials.contactPhone = String(data.contactPhone).trim();
  }

  await outlet.save();

  return {
    success: true,
    outletId: outlet._id,
    username: outlet.credentials.username,
    password: newPassword,
  };
}

/**
 * Delete / Deactivate outlet
 */
export async function deleteOutlet(restaurantId, outletId) {
  if (!restaurantId || !outletId) throw new ValidationError("Missing restaurantId or outletId");

  const outlet = await FoodOutlet.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(outletId),
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });

  if (!outlet) throw new NotFoundError("Outlet not found");
  return { success: true, message: "Outlet deleted successfully" };
}

/**
 * List all orders across all outlets for Owner with search, filter, pagination
 */
export async function listOwnerOrders(restaurantId, query = {}) {
  if (!restaurantId) throw new ValidationError("Restaurant ID is required");

  const restObjectId = new mongoose.Types.ObjectId(restaurantId);
  const { page, limit, skip } = buildPagination(query);

  const filter = { restaurantId: restObjectId };

  if (query.outletId && mongoose.Types.ObjectId.isValid(query.outletId)) {
    filter.outletId = new mongoose.Types.ObjectId(query.outletId);
  }

  if (query.status && query.status !== "all") {
    filter.orderStatus = query.status;
  }

  // Exclude unconfirmed/half-placed online payment attempts unless explicitly requested
  if (query.status !== "payment-failed") {
    const validPlacedOrderClause = {
      $or: [
        { "payment.method": { $in: ["cash", "cod", "CASH", "COD", "wallet", "WALLET"] } },
        { "payment.status": { $in: ["paid", "PAID", "authorized", "captured", "settled", "refunded"] } },
        { orderStatus: { $in: ["confirmed", "accepted", "preparing", "ready_for_pickup", "ready", "picked_up", "out_for_delivery", "reached_drop", "delivered", "completed", "cancelled_by_user", "cancelled_by_restaurant", "cancelled_by_admin"] } }
      ]
    };
    if (filter.$and) {
      filter.$and.push(validPlacedOrderClause);
    } else {
      filter.$and = [validPlacedOrderClause];
    }
  }

  if (query.search) {
    const s = String(query.search).trim();
    filter.$or = [
      { order_id: { $regex: s, $options: "i" } },
      { orderId: { $regex: s, $options: "i" } },
      { customerName: { $regex: s, $options: "i" } },
      { customerPhone: { $regex: s, $options: "i" } },
    ];
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .populate("userId", "name phone email profileImage")
      .populate("outletId", "name outletCode phone address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);

  return {
    orders: docs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Multi-outlet inventory status
 */
export async function getOwnerInventory(restaurantId, query = {}) {
  if (!restaurantId) throw new ValidationError("Restaurant ID is required");

  const restObjectId = new mongoose.Types.ObjectId(restaurantId);

  const outlets = await FoodOutlet.find({ restaurantId: restObjectId })
    .select("name outletCode status")
    .lean();

  // Query live menu items from FoodItem collection
  const foodItems = await FoodItem.find({
    restaurantId: restObjectId,
    approvalStatus: { $ne: "rejected" },
  })
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .lean();

  let totalItems = 0;
  let inStockItems = 0;
  let outOfStockItems = 0;
  const itemsList = [];

  if (foodItems && foodItems.length > 0) {
    const now = Date.now();
    foodItems.forEach((item) => {
      totalItems++;
      let isAvailable = item.isAvailable !== false;
      if (!isAvailable && item.outOfStockUntil) {
        const resumeMs = new Date(item.outOfStockUntil).getTime();
        if (resumeMs <= now) {
          isAvailable = true;
          // Asynchronously clear expired out-of-stock state in DB
          FoodItem.updateOne(
            { _id: item._id },
            { $set: { isAvailable: true, outOfStockUntil: null, stockTimingMode: 'none', stockTimingConfig: null } }
          ).catch(() => {});
        }
      }

      if (isAvailable) inStockItems++;
      else outOfStockItems++;

      const category =
        item.categoryName || item.categoryId?.name || item.category || "Main Menu";

      const stockRule = !isAvailable ? {
        mode: item.stockTimingMode || (item.outOfStockUntil ? "specific-time" : "manual"),
        resumeAt: item.outOfStockUntil ? new Date(item.outOfStockUntil).toISOString() : null,
        config: item.stockTimingConfig || null,
      } : null;

      itemsList.push({
        _id: item._id,
        id: String(item._id),
        name: item.name,
        category,
        price: item.price,
        isVeg: item.foodType === "Veg" || item.isVeg === true,
        foodType: item.foodType || "Non-Veg",
        isAvailable,
        outOfStockUntil: isAvailable ? null : item.outOfStockUntil,
        stockTimingMode: isAvailable ? "none" : (item.stockTimingMode || "manual"),
        stockTimingConfig: isAvailable ? null : item.stockTimingConfig,
        stockRule,
        stock: isAvailable ? 50 : 0,
        image: item.image || "",
        description: item.description || "",
        variants: item.variants || [],
      });
    });
  } else {
    // Fallback to legacy FoodRestaurantMenu if exists
    const menuDoc = await FoodRestaurantMenu.findOne({ restaurantId: restObjectId }).lean();
    const sections = menuDoc?.sections || [];

    sections.forEach((section) => {
      const items = section.items || [];
      items.forEach((item) => {
        totalItems++;
        const isAvailable = item.isAvailable !== false && item.inStock !== false;
        if (isAvailable) inStockItems++;
        else outOfStockItems++;

        itemsList.push({
          _id: item.itemId || item._id,
          id: String(item.itemId || item._id),
          name: item.name,
          category: section.categoryName || section.title || "Main Menu",
          price: item.price,
          isVeg: Boolean(item.isVeg),
          foodType: item.isVeg ? "Veg" : "Non-Veg",
          isAvailable,
          stock: item.stockCount !== undefined ? item.stockCount : 50,
          image: item.image || "",
          description: item.description || "",
        });
      });
    });
  }

  return {
    summary: {
      totalItems,
      inStockItems,
      outOfStockItems,
      totalOutlets: outlets.length,
    },
    outlets,
    items: itemsList,
  };
}

/**
 * Detailed finance report (Revenue, Profit, Outlet-wise breakdown)
 */
export async function getOwnerFinance(restaurantId, query = {}) {
  if (!restaurantId) throw new ValidationError("Restaurant ID is required");

  const summary = await getOwnerSummary(restaurantId, query);
  return {
    financeSummary: {
      grossSales: summary.summary.totalRevenue,
      netProfit: summary.summary.totalProfit,
      platformFeeDeductions: Math.round(summary.summary.totalRevenue * 0.08),
      taxCollected: Math.round(summary.summary.totalRevenue * 0.05),
      totalPayoutsReady: Math.round(summary.summary.totalRevenue * 0.87),
      totalOrders: summary.summary.totalOrders,
      completedOrders: summary.summary.completedOrders,
      cancelledOrders: summary.summary.cancelledOrders,
    },
    outletBreakdown: summary.outletBreakdown,
  };
}
