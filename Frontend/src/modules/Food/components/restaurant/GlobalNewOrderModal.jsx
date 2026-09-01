import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  X, 
  Check, 
  ShoppingBag, 
  MapPin, 
  IndianRupee, 
  Phone, 
  Store, 
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRestaurantNotifications } from "@food/hooks/useRestaurantNotifications";
import { restaurantAPI } from "@food/api";

const REJECT_REASONS = [
  "Restaurant is too busy",
  "Item out of stock",
  "Kitchen closing soon",
  "Outside delivery area",
  "Technical issue",
  "Other reason",
];

export default function GlobalNewOrderModal() {
  const navigate = useNavigate();
  const { newOrder, orderQueue, clearNewOrder } = useRestaurantNotifications();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectOptions, setShowRejectOptions] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  if (!newOrder) return null;

  const orderId = String(newOrder.orderId || newOrder.order_id || newOrder.orderMongoId || newOrder._id || "").trim();
  const targetId = String(newOrder.orderMongoId || newOrder._id || newOrder.orderId || orderId).trim();
  const items = Array.isArray(newOrder.items) ? newOrder.items : [];
  const total = Number(newOrder.total ?? newOrder.pricing?.total ?? 0);
  const customerName = newOrder.customer?.name || newOrder.customerName || newOrder.address?.fullName || "Customer";
  const customerPhone = newOrder.customer?.phone || newOrder.phone || newOrder.address?.phone || "";
  const address = newOrder.customerAddress || newOrder.deliveryAddress || newOrder.address;
  const addressStr = address?.formattedAddress || address?.street || address?.address || "";
  const isTakeaway = String(newOrder.orderType || "").toLowerCase() === "takeaway";
  const outletName = newOrder.outlet?.name || newOrder.outletName || newOrder.outletId?.name || null;
  const queueCount = Array.isArray(orderQueue) ? orderQueue.length : 1;

  const handleAccept = async () => {
    if (!targetId || isAccepting) return;
    setIsAccepting(true);
    try {
      await restaurantAPI.acceptOrder(targetId);
      toast.success(`Order #${orderId} Accepted! 🎉`, {
        description: "Order moved to preparing state.",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("restaurantOrderStatusUpdate", { detail: { ...newOrder, orderStatus: "preparing" } }));
      }
      clearNewOrder();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to accept order");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!targetId || isRejecting) return;
    setIsRejecting(true);
    const reasonToSend = selectedReason === "Other reason" && customReason.trim() ? customReason.trim() : selectedReason;
    try {
      await restaurantAPI.rejectOrder(targetId, reasonToSend);
      toast.error(`Order #${orderId} Rejected`, {
        description: `Reason: ${reasonToSend}`,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("restaurantOrderStatusUpdate", { detail: { ...newOrder, orderStatus: "cancelled_by_restaurant" } }));
      }
      setShowRejectOptions(false);
      clearNewOrder();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject order");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleViewOrder = () => {
    clearNewOrder();
    navigate(`/food/restaurant/orders/${targetId}`, { state: { mongoId: targetId } });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="w-full max-w-lg bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border-2 border-emerald-500 overflow-hidden font-['Poppins'] my-auto"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white px-5 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md animate-bounce">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black font-['Outfit'] tracking-tight">NEW ORDER RECEIVED!</h2>
                  {queueCount > 1 && (
                    <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      +{queueCount - 1} in queue
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-emerald-100 flex items-center gap-1.5 mt-0.5">
                  <span>Order #{orderId}</span>
                  <span>•</span>
                  <span className="uppercase font-black">{isTakeaway ? "Takeaway" : "Delivery"}</span>
                </p>
              </div>
            </div>

            <button
              onClick={clearNewOrder}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Dismiss Popup"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Price & Summary Card */}
            <div className="flex items-center justify-between p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900">
              <div>
                <span className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                  Grand Total
                </span>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-['Outfit'] mt-0.5">
                  ₹{total.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl tracking-wider ${
                  newOrder.payment?.status === "paid" || newOrder.paymentMethod === "razorpay"
                    ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                    : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                }`}>
                  {newOrder.payment?.method || newOrder.paymentMethod || "Online"} • {newOrder.payment?.status || "Pending"}
                </span>
                {outletName && (
                  <p className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-end gap-1">
                    <Store className="w-3 h-3 text-[#22A2E3]" />
                    <span>{outletName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Customer & Delivery Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {customerName}
                </p>
                {customerPhone && (
                  <a
                    href={`tel:${customerPhone}`}
                    className="text-[#22A2E3] font-bold flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {customerPhone}
                  </a>
                )}
              </div>

              {!isTakeaway && addressStr && (
                <p className="text-slate-500 font-semibold flex items-start gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{addressStr}</span>
                </p>
              )}

              {newOrder.note && (
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 text-[11px] font-bold">
                  📝 Cooking Note: {newOrder.note}
                </div>
              )}
            </div>

            {/* Ordered Dishes List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Ordered Items ({items.length})
                </span>
                <span className="text-[11px] font-bold text-slate-400">Qty × Price</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        item.isVeg || item.foodType === "Veg" ? "bg-emerald-500" : "bg-rose-500"
                      }`} />
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        {item.variantName && (
                          <span className="text-[10px] font-bold text-slate-400">
                            Size: {item.variantName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-600 dark:text-slate-400">
                        {item.quantity} × ₹{item.price}
                      </span>
                      <p className="font-black text-slate-900 dark:text-white">
                        ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reject Reason Selector (if reject clicked) */}
            {showRejectOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-3"
              >
                <p className="text-xs font-black text-rose-800 dark:text-rose-300">
                  Select Reason for Rejecting Order:
                </p>
                <div className="space-y-1.5">
                  {REJECT_REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="rejectReason"
                        value={r}
                        checked={selectedReason === r}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                {selectedReason === "Other reason" && (
                  <input
                    type="text"
                    placeholder="Enter custom rejection reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowRejectOptions(false)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Confirm Reject
                  </button>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            {!showRejectOptions && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRejectOptions(true)}
                    disabled={isAccepting || isRejecting}
                    className="flex-1 py-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-black text-sm rounded-2xl border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <X className="w-4 h-4" />
                    Reject Order
                  </button>

                  <button
                    onClick={handleAccept}
                    disabled={isAccepting || isRejecting}
                    className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isAccepting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5 stroke-[3]" />
                        <span>Accept Order</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={handleViewOrder}
                    className="text-[#22A2E3] font-black flex items-center gap-1 hover:underline"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    View Full Order Details
                  </button>

                  <button
                    onClick={clearNewOrder}
                    className="text-slate-400 font-bold hover:text-slate-600"
                  >
                    Dismiss / Later
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
