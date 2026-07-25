import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, RefreshCw, Tag, AlertCircle } from "lucide-react";
import { adminClient } from "../../../../services/api/axios";

export default function ItemDiscounts() {
  const [rules, setRules] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    restaurantId: "",
    scope: "RESTAURANT_WIDE",
    targetName: "",
    orderType: "ALL",
    discountType: "PERCENTAGE",
    discountValue: 20,
    maxDiscountAmount: "",
    stackable: true,
    isActive: true,
  });

  const fetchRestaurants = async () => {
    try {
      const res = await adminClient.get("/food/admin/restaurants");
      const list = res.data?.data?.restaurants || res.data?.data || [];
      setRestaurants(Array.isArray(list) ? list : []);
      if (list.length > 0 && !formData.restaurantId) {
        setFormData((prev) => ({ ...prev, restaurantId: list[0]._id || list[0].id }));
      }
    } catch (err) {
      console.error("Failed to fetch restaurants:", err);
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get("/food/admin/item-discounts", {
        params: formData.restaurantId ? { restaurantId: formData.restaurantId } : {},
      });
      setRules(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    fetchRules();
  }, [formData.restaurantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      await adminClient.post("/food/admin/item-discounts", formData);
      setSuccessMsg("Item discount rule created successfully!");
      fetchRules();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create item discount rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    try {
      await adminClient.delete(`/food/admin/item-discounts/${id}`);
      fetchRules();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete rule");
    }
  };

  // Compute Live Preview (e.g. ₹100 -> ₹80)
  const sampleBasePrice = 100;
  let previewDiscount = 0;
  if (formData.discountType === "PERCENTAGE") {
    const raw = sampleBasePrice * (Number(formData.discountValue || 0) / 100);
    previewDiscount = formData.maxDiscountAmount ? Math.min(raw, Number(formData.maxDiscountAmount)) : raw;
  } else {
    previewDiscount = Number(formData.discountValue || 0);
  }
  const previewFinalPrice = Math.max(0, sampleBasePrice - previewDiscount);

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Item-Level Discounts</h1>
              <p className="text-sm text-slate-500">Configure item, category, or menu-wide pricing discount rules (₹100 ➔ ₹80 format)</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Rule Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-3">Create New Rule</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Restaurant</label>
                <select
                  value={formData.restaurantId}
                  onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">-- Select Restaurant --</option>
                  {restaurants.map((r) => (
                    <option key={r._id || r.id} value={r._id || r.id}>
                      {r.restaurantName || r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discount Scope</label>
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="RESTAURANT_WIDE">Restaurant Wide (All Items)</option>
                  <option value="CATEGORY">Category</option>
                  <option value="MENU_ITEM">Specific Menu Item</option>
                </select>
              </div>

              {formData.scope !== "RESTAURANT_WIDE" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {formData.scope === "CATEGORY" ? "Category Name" : "Item Name"}
                  </label>
                  <input
                    type="text"
                    placeholder={formData.scope === "CATEGORY" ? "e.g. Pizza, Beverages" : "e.g. Cheese Pizza"}
                    value={formData.targetName}
                    onChange={(e) => setFormData({ ...formData, targetName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Order Type</label>
                <select
                  value={formData.orderType}
                  onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="ALL">Delivery & Takeaway (All)</option>
                  <option value="DELIVERY">Delivery Only</option>
                  <option value="TAKEAWAY">Takeaway Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Value</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              {formData.discountType === "PERCENTAGE" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Discount Cap (₹) (Optional)</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              )}

              {/* Live Preview Box */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1">
                <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Live Customer View Preview</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 line-through text-lg">₹{sampleBasePrice}</span>
                  <span className="text-2xl font-black text-orange-600">₹{previewFinalPrice}</span>
                  <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {formData.discountType === "PERCENTAGE" ? `${formData.discountValue}% OFF` : `₹${formData.discountValue} OFF`}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Create Discount Rule
              </button>
            </form>
          </div>

          {/* Active Rules List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Active Rules ({rules.length})</h2>
              <button onClick={fetchRules} className="p-2 text-slate-500 hover:text-slate-900">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No active item discount rules for this restaurant.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <div key={rule._id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {rule.scope === "RESTAURANT_WIDE" ? "Entire Menu" : rule.targetName || rule.scope}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase font-semibold">
                          {rule.orderType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Discount: <strong className="text-orange-600">{rule.discountType === "PERCENTAGE" ? `${rule.discountValue}%` : `₹${rule.discountValue}`} OFF</strong>
                        {rule.maxDiscountAmount ? ` (Max ₹${rule.maxDiscountAmount})` : ""}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(rule._id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
