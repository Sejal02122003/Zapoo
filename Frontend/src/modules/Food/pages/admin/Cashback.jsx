import { useState, useEffect } from "react";
import { Search, Plus, RefreshCw, Trash2, Calendar, AlertCircle, Check, DollarSign } from "lucide-react";
import { adminClient } from "../../../../services/api/axios";

export default function Cashback() {
  const [cashbacks, setCashbacks] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [expiryReport, setExpiryReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "Standard Cashback",
    restaurantScope: "ALL",
    restaurantId: "",
    orderType: "BOTH",
    minOrderValue: 99,
    cashbackType: "PERCENTAGE",
    cashbackValue: 5,
    maxCashbackAmount: 30,
    expiryDays: 60,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, restRes, reportRes] = await Promise.allSettled([
        adminClient.get("/food/admin/cashback-rules"),
        adminClient.get("/food/admin/restaurants"),
        adminClient.get("/food/admin/wallet/expiry-report"),
      ]);

      if (rulesRes.status === "fulfilled") {
        setCashbacks(rulesRes.value.data?.data || []);
      }
      if (restRes.status === "fulfilled") {
        const list = restRes.value.data?.data?.restaurants || restRes.value.data?.data || [];
        setRestaurants(Array.isArray(list) ? list : []);
      }
      if (reportRes.status === "fulfilled") {
        setExpiryReport(reportRes.value.data?.data || null);
      }
    } catch (err) {
      console.error("Failed to load cashback data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      await adminClient.post("/food/admin/cashback-rules", formData);
      setSuccessMsg("Cashback rule created successfully!");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create cashback rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this cashback rule?")) return;
    try {
      await adminClient.delete(`/food/admin/cashback-rules/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete rule");
    }
  };

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cashback & Expiry Management</h1>
              <p className="text-sm text-slate-500">Configure global and restaurant-specific cashback rules with automatic 60-day expiry</p>
            </div>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Expiry Overview Cards */}
        {expiryReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Platform Admin Wallet Balance</p>
                <h3 className="text-2xl font-black text-slate-900">₹{expiryReport.adminPlatformBalance}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Total Expired Cashback Transferred</p>
                <h3 className="text-2xl font-black text-slate-900">₹{expiryReport.totalExpiredAmount}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Expired Batches Processed</p>
                <h3 className="text-2xl font-black text-slate-900">{expiryReport.totalExpiredCount}</h3>
              </div>
            </div>
          </div>
        )}

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
          {/* Create Cashback Rule Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-3">Create Cashback Rule</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rule Title</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Restaurant Scope</label>
                <select
                  value={formData.restaurantScope}
                  onChange={(e) => setFormData({ ...formData, restaurantScope: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="ALL">Global (All Restaurants)</option>
                  <option value="SELECTED">Specific Restaurant Override</option>
                </select>
              </div>

              {formData.restaurantScope === "SELECTED" && (
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
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Order Type</label>
                <select
                  value={formData.orderType}
                  onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="BOTH">Delivery & Takeaway</option>
                  <option value="DELIVERY">Delivery Only</option>
                  <option value="TAKEAWAY">Takeaway Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cashback Type</label>
                  <select
                    value={formData.cashbackType}
                    onChange={(e) => setFormData({ ...formData, cashbackType: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Value</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cashbackValue}
                    onChange={(e) => setFormData({ ...formData, cashbackValue: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No max cap"
                    value={formData.maxCashbackAmount}
                    onChange={(e) => setFormData({ ...formData, maxCashbackAmount: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cashback Expiry (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.expiryDays}
                  onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Save Cashback Rule
              </button>
            </form>
          </div>

          {/* Active Rules & Expiry Ledger Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3">Active Cashback Rules ({cashbacks.length})</h2>

              {cashbacks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No active cashback rules found.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cashbacks.map((cb) => (
                    <div key={cb._id} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{cb.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${cb.restaurantScope === "ALL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {cb.restaurantScope === "ALL" ? "Global Platform Rule" : "Restaurant Override"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          Earns <strong className="text-orange-600">{cb.cashbackType === "PERCENTAGE" ? `${cb.cashbackValue}%` : `₹${cb.cashbackValue}`} cashback</strong> on orders above ₹{cb.minOrderValue} (Capped at ₹{cb.maxCashbackAmount || "Unlimited"}, Valid for {cb.expiryDays} days).
                        </p>
                      </div>

                      <button onClick={() => handleDelete(cb._id)} className="p-2 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Expired Batches */}
            {expiryReport?.recentExpiries?.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-900 border-b pb-3">Recent Expired Cashback Transferred to Admin</h2>
                <div className="divide-y divide-slate-100 text-sm">
                  {expiryReport.recentExpiries.map((exp) => (
                    <div key={exp.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{exp.user?.name || exp.user?.email || "User"}</span>
                        <p className="text-xs text-slate-400">{new Date(exp.date).toLocaleString()}</p>
                      </div>
                      <span className="font-bold text-red-600">-₹{exp.amount} (Transferred to Admin)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
