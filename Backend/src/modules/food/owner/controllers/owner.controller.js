import * as ownerService from "../services/owner.service.js";
import { sendResponse, sendError } from "../../../../utils/response.js";

const getOwnerRestaurantId = (req) => {
  // If owner logged in, req.user.restaurantId or req.user.userId
  return req.user?.restaurantId || req.user?.userId;
};

export async function getOwnerSummaryController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const data = await ownerService.getOwnerSummary(restaurantId, req.query);
    return sendResponse(res, 200, "Owner summary retrieved successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function listOutletsController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const data = await ownerService.listOutlets(restaurantId, req.query);
    return sendResponse(res, 200, "Outlets retrieved successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function createOutletController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const data = await ownerService.createOutlet(restaurantId, req.body);
    return sendResponse(res, 201, "Outlet created successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function getOutletByIdController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const outletId = req.params.id;
    const outlet = await ownerService.getOutletById(restaurantId, outletId);
    return sendResponse(res, 200, "Outlet details retrieved", { outlet });
  } catch (err) {
    next(err);
  }
}

export async function updateOutletController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const outletId = req.params.id;
    const outlet = await ownerService.updateOutlet(restaurantId, outletId, req.body);
    return sendResponse(res, 200, "Outlet updated successfully", { outlet });
  } catch (err) {
    next(err);
  }
}

export async function resetOutletCredentialsController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const outletId = req.params.id;
    const data = await ownerService.resetOutletCredentials(restaurantId, outletId, req.body);
    return sendResponse(res, 200, "Outlet credentials reset successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function deleteOutletController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const outletId = req.params.id;
    const result = await ownerService.deleteOutlet(restaurantId, outletId);
    return sendResponse(res, 200, "Outlet deleted successfully", result);
  } catch (err) {
    next(err);
  }
}

export async function listOwnerOrdersController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const data = await ownerService.listOwnerOrders(restaurantId, req.query);
    return sendResponse(res, 200, "Owner orders retrieved successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function getOwnerInventoryController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const data = await ownerService.getOwnerInventory(restaurantId, req.query);
    return sendResponse(res, 200, "Owner inventory retrieved successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function getOwnerFinanceController(req, res, next) {
  try {
    const restaurantId = getOwnerRestaurantId(req);
    const data = await ownerService.getOwnerFinance(restaurantId, req.query);
    return sendResponse(res, 200, "Owner finance metrics retrieved successfully", data);
  } catch (err) {
    next(err);
  }
}
