import express from "express";
import { authMiddleware } from "../../../../core/auth/auth.middleware.js";
import { requireRoles } from "../../../../core/roles/role.middleware.js";
import {
  getOwnerSummaryController,
  listOutletsController,
  createOutletController,
  getOutletByIdController,
  updateOutletController,
  resetOutletCredentialsController,
  deleteOutletController,
  listOwnerOrdersController,
  getOwnerInventoryController,
  getOwnerFinanceController,
} from "../controllers/owner.controller.js";

import {
  createRestaurantFoodController,
  bulkCreateRestaurantFoodController,
  updateRestaurantFoodController,
  deleteRestaurantFoodController,
} from "../../restaurant/controllers/restaurantFood.controller.js";

const router = express.Router();

// Owner protection: requires authentication + OWNER or RESTAURANT or ADMIN role
const ownerAuth = [
  authMiddleware,
  requireRoles("OWNER", "RESTAURANT", "ADMIN", "SUPER_ADMIN"),
];

// Summary & Dashboard KPI
router.get("/summary", ownerAuth, getOwnerSummaryController);

// Outlets Management
router.get("/outlets", ownerAuth, listOutletsController);
router.post("/outlets", ownerAuth, createOutletController);
router.get("/outlets/:id", ownerAuth, getOutletByIdController);
router.patch("/outlets/:id", ownerAuth, updateOutletController);
router.post("/outlets/:id/reset-credentials", ownerAuth, resetOutletCredentialsController);
router.delete("/outlets/:id", ownerAuth, deleteOutletController);

// Multi-Outlet Orders Hub
router.get("/orders", ownerAuth, listOwnerOrdersController);

// Multi-Outlet Inventory Hub & Menu Foods CRUD
router.get("/inventory", ownerAuth, getOwnerInventoryController);
router.post("/foods", ownerAuth, createRestaurantFoodController);
router.post("/foods/bulk", ownerAuth, bulkCreateRestaurantFoodController);
router.patch("/foods/:id", ownerAuth, updateRestaurantFoodController);
router.delete("/foods/:id", ownerAuth, deleteRestaurantFoodController);

// Multi-Outlet Finance & Profit Hub
router.get("/finance", ownerAuth, getOwnerFinanceController);

export default router;
