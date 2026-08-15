import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Tag, Gift, Percent, Calendar, Layers, Users, Clock, Zap, CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react";
import { adminClient } from "../../../../services/api/axios";

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    rewardType: "INSTANT_DISCOUNT", // 'INSTANT_DISCOUNT' | 'CASHBACK' | 'BOTH'
    discountType: "PERCENTAGE",     // 'PERCENTAGE' | 'FLAT'
    discountValue: 10,
    maxDiscountCap: 50,
    cashbackType: "PERCENTAGE",
    cashbackValue: 5,
    maxCashbackCap: 50,
    minOrderValue: 99,
    perUserUsageLimit: 1,
    totalUsageLimit: 100,
    restaurantScope: "ALL",        // 'ALL' | 'SPECIFIC'
    restaurantIds: [],
    orderTypeScope: "BOTH",
    userSegment: "ALL",
    firstOrderOnlyForRestaurant: false,
    stackableWithCashback: true,    // Default true so discount + cashback work together easily
    stackableWithOtherCoupons: false,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    activeDaysOfWeek: [],
    startHour: "",
    endHour: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [couponsRes, restRes] = await Promise.allSettled([
        adminClient.get("/food/admin/coupons"),
        adminClient.get("/food/admin/restaurants")
      ]);

      if (couponsRes.status === "fulfilled") {
        setCoupons(couponsRes.value.data?.data || []);
      }
      if (restRes.status === "fulfilled") {
        const list = restRes.value.data?.data?.restaurants || restRes.value.data?.data || [];
        setRestaurants(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        discountValue: Number(formData.discountValue),
        maxDiscountCap: formData.maxDiscountCap ? Number(formData.maxDiscountCap) : null,
        cashbackValue: Number(formData.cashbackValue),
        maxCashbackCap: formData.maxCashbackCap ? Number(formData.maxCashbackCap) : null,
        minOrderValue: Number(formData.minOrderValue || 0),
        perUserUsageLimit: Number(formData.perUserUsageLimit || 1),
        totalUsageLimit: formData.totalUsageLimit ? Number(formData.totalUsageLimit) : null,
        activeTimeWindow: (formData.startHour !== "" && formData.endHour !== "")
          ? { startHour: Number(formData.startHour), endHour: Number(formData.endHour) }
          : null
      };

      await adminClient.post("/food/admin/coupons", payload);
      setSuccessMsg("Coupon created successfully!");
      fetchData();
      setFormData(prev => ({ ...prev, code: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    setError("");
    setSuccessMsg("");
    try {
      await adminClient.delete(`/food/admin/coupons/${id}`);
      setSuccessMsg("Coupon deleted successfully!");
      setCoupons(prev => prev.filter(c => c._id !== id));
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete coupon");
    }
  };

  const filteredCoupons = coupons.filter(c =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Coupons & Rewards Setup</h1>
              <p className="text-sm text-slate-500">Create instant discount coupons, cashback reward coupons, or combo offers.</p>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search coupon code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Coupon Sectioned Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-600" /> Create New Coupon
              </span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-bold">
                Easy Setup
              </span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Visual Reward Type Selector Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Step 1: Select Coupon Reward Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, rewardType: "INSTANT_DISCOUNT" })}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.rewardType === "INSTANT_DISCOUNT"
                        ? "border-orange-500 bg-orange-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className={`w-4 h-4 ${formData.rewardType === "INSTANT_DISCOUNT" ? "text-orange-600" : "text-slate-400"}`} />
                      <span className="font-bold text-[11px] text-slate-900 leading-none">Instant Discount</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug mt-1.5">
                      Reduces bill amount directly at checkout.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, rewardType: "CASHBACK" })}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.rewardType === "CASHBACK"
                        ? "border-purple-500 bg-purple-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className={`w-4 h-4 ${formData.rewardType === "CASHBACK" ? "text-purple-600" : "text-slate-400"}`} />
                      <span className="font-bold text-[11px] text-slate-900 leading-none">Cashback Reward</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug mt-1.5">
                      Credits wallet balance after delivery.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, rewardType: "BOTH" })}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.rewardType === "BOTH"
                        ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className={`w-4 h-4 ${formData.rewardType === "BOTH" ? "text-emerald-600" : "text-slate-400"}`} />
                      <span className="font-bold text-[11px] text-slate-900 leading-none">Combo Offer</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug mt-1.5">
                      Gives BOTH Discount & Cashback together.
                    </p>
                  </div>
                </div>
              </div>

              {/* Coupon Code & Amount */}
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ZAPOO50"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm font-black tracking-wider uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Instant Discount Settings */}
                {(formData.rewardType === 'INSTANT_DISCOUNT' || formData.rewardType === 'BOTH') && (
                  <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 space-y-3 mt-3">
                    <label className="block text-xs font-black text-orange-600 uppercase">Discount Configuration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Calculation</label>
                        <select
                          value={formData.discountType}
                          onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          <option value="PERCENTAGE">Percentage (%)</option>
                          <option value="FLAT">Flat Rupee (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Value</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.discountValue}
                          onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Discount Cap (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Unlimited"
                        value={formData.maxDiscountCap}
                        onChange={e => setFormData({ ...formData, maxDiscountCap: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Cashback Settings */}
                {(formData.rewardType === 'CASHBACK' || formData.rewardType === 'BOTH') && (
                  <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-3 mt-3">
                    <label className="block text-xs font-black text-purple-600 uppercase">Cashback Configuration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Calculation</label>
                        <select
                          value={formData.cashbackType}
                          onChange={e => setFormData({ ...formData, cashbackType: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          <option value="PERCENTAGE">Percentage (%)</option>
                          <option value="FLAT">Flat Rupee (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Value</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.cashbackValue}
                          onChange={e => setFormData({ ...formData, cashbackValue: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Cashback Cap (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Unlimited"
                        value={formData.maxCashbackCap}
                        onChange={e => setFormData({ ...formData, maxCashbackCap: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Scope & Restaurant Picker */}
              <div className="space-y-3 pt-3 border-t">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Step 2: Target Scope
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Which Restaurants?</label>
                  <select
                    value={formData.restaurantScope}
                    onChange={e => setFormData({ ...formData, restaurantScope: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="ALL">All Restaurants (Platform-wide)</option>
                    <option value="SPECIFIC">Specific Restaurants Only</option>
                  </select>
                </div>

                {formData.restaurantScope === "SPECIFIC" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Outlets</label>
                    <select
                      multiple
                      value={formData.restaurantIds}
                      onChange={e => {
                        const opts = Array.from(e.target.selectedOptions, option => option.value);
                        setFormData({ ...formData, restaurantIds: opts });
                      }}
                      className="w-full p-2 border border-slate-300 rounded-xl text-sm bg-white h-24"
                    >
                      {restaurants.map(r => (
                        <option key={r._id || r.id} value={r._id || r.id}>
                          {r.restaurantName || r.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple outlets.</p>
                  </div>
                )}
              </div>

              {/* Stacking & Combination Controls */}
              <div className="space-y-3 pt-3 border-t">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Step 3: Stacking & Combination Rules</span>
                  <Info className="w-4 h-4 text-orange-500" />
                </label>

                <div className="bg-orange-50/70 p-3.5 rounded-xl border border-orange-200 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.stackableWithCashback}
                      onChange={e => setFormData({ ...formData, stackableWithCashback: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Allow Combining with Automatic Cashback</span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        If checked, customers can get <strong>both</strong> this coupon AND automatic cashback on their order.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.stackableWithOtherCoupons}
                      onChange={e => setFormData({ ...formData, stackableWithOtherCoupons: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Allow Combining with Other Coupon Codes</span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        If checked, customers can enter multiple coupon codes on a single checkout.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Customer App Live Preview */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Customer App Live Preview
                </div>
                <div className="bg-white/10 p-3 rounded-lg border border-white/10 flex flex-col justify-between">
                  <div>
                    <span className="font-black text-amber-300 text-sm tracking-wider uppercase">
                      {formData.code || "COUPON"}
                    </span>
                    <div className="mt-1 space-y-1">
                      {(formData.rewardType === "INSTANT_DISCOUNT" || formData.rewardType === "BOTH") && (
                        <p className="text-xs text-emerald-400 font-bold">
                          • Get {formData.discountType === "PERCENTAGE" ? `${formData.discountValue}%` : `₹${formData.discountValue}`} OFF instantly at checkout
                        </p>
                      )}
                      {(formData.rewardType === "CASHBACK" || formData.rewardType === "BOTH") && (
                        <p className="text-xs text-purple-400 font-bold">
                          • Get {formData.cashbackType === "PERCENTAGE" ? `${formData.cashbackValue}%` : `₹${formData.cashbackValue}`} cashback credited after delivery
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? "Saving..." : "Create & Activate Coupon"}
              </button>
            </form>
          </div>

          {/* Active Coupons List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-4 flex items-center justify-between">
                <span>Active & Configured Coupons ({filteredCoupons.length})</span>
              </h2>

              {filteredCoupons.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Tag className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No coupons found. Create your first coupon using the form.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCoupons.map(c => (
                    <div key={c._id} className="py-4 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 uppercase tracking-wider text-sm">
                            {c.code}
                          </span>
                          
                          {c.rewardType === 'BOTH' ? (
                             <span className="text-xs px-2.5 py-1 rounded-full font-extrabold bg-emerald-100 text-emerald-700">
                               🎁 Combo Offer
                             </span>
                          ) : c.rewardType === 'CASHBACK' ? (
                             <span className="text-xs px-2.5 py-1 rounded-full font-extrabold bg-purple-100 text-purple-700">
                               ⚡ Cashback Reward
                             </span>
                          ) : (
                             <span className="text-xs px-2.5 py-1 rounded-full font-extrabold bg-orange-100 text-orange-700">
                               🏷️ Instant Discount
                             </span>
                          )}

                          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                            {c.restaurantScope === 'ALL' ? 'Global' : 'Specific Outlets'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDelete(c._id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50"
                          title="Deactivate Coupon"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                        <div className="font-semibold text-slate-900 space-y-1">
                          {(c.rewardType === 'INSTANT_DISCOUNT' || c.rewardType === 'BOTH') && (
                             <p>Gives <strong className="text-emerald-600">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`} OFF</strong> directly at checkout {c.maxDiscountCap && `(Max: ₹${c.maxDiscountCap})`}</p>
                          )}
                          {(c.rewardType === 'CASHBACK' || c.rewardType === 'BOTH') && (
                             <p>Earns <strong className="text-purple-600">{c.cashbackType === 'PERCENTAGE' ? `${c.cashbackValue}%` : `₹${c.cashbackValue}`} cashback</strong> in wallet after delivery {c.maxCashbackCap && `(Max: ₹${c.maxCashbackCap})`}</p>
                          )}
                        </div>
                        {c.minOrderValue > 0 && <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 mt-2">Min Order: ₹{c.minOrderValue}</p>}
                        
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                          <span>Allowed with Automatic Cashback: <strong className={c.stackableWithCashback ? "text-emerald-600" : "text-slate-400"}>{c.stackableWithCashback ? "Yes" : "No"}</strong></span>
                          <span>•</span>
                          <span>Allowed with Other Coupons: <strong className={c.stackableWithOtherCoupons ? "text-emerald-600" : "text-slate-400"}>{c.stackableWithOtherCoupons ? "Yes" : "No"}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
