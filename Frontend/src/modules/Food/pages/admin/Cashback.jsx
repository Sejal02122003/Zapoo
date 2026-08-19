import { useState, useEffect, useCallback } from "react";
import { Search, Plus, RefreshCw, Trash2, Calendar, DollarSign, Layers, Users, Clock, Zap, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { adminClient } from "../../../../services/api/axios";

export default function Cashback() {
  const [cashbacks, setCashbacks] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [expiryReport, setExpiryReport] = useState(null);
  const [ledgers, setLedgers] = useState([]);
  const [ledgerStats, setLedgerStats] = useState({ totalCredited: 0, totalPending: 0, totalReversed: 0, totalTransactions: 0 });
  const [ledgerPagination, setLedgerPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [searchLedger, setSearchLedger] = useState("");
  const [statusLedger, setStatusLedger] = useState("ALL");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "Standard Cashback Rule",
    restaurantScope: "ALL",
    restaurantId: "",
    restaurantIds: [],
    orderType: "BOTH",
    minOrderValue: 99,
    cashbackType: "PERCENTAGE",
    cashbackValue: 5,
    maxCashbackAmount: 30,
    expiryDays: 30,
    stackableWithCoupons: true,
    userSegment: "ALL",
    firstOrderOnlyForRestaurant: false,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  });

  const fetchLedgers = useCallback(async (page = 1, search = searchLedger, status = statusLedger) => {
    setLedgerLoading(true);
    try {
      const res = await adminClient.get("/food/admin/cashback/ledgers", {
        params: {
          page,
          limit: 15,
          search: search || undefined,
          status: status !== "ALL" ? status : undefined
        }
      });
      if (res.data?.success && res.data?.data) {
        setLedgers(res.data.data.ledgers || []);
        if (res.data.data.stats) setLedgerStats(res.data.data.stats);
        if (res.data.data.pagination) setLedgerPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error("Failed to load cashback ledgers:", err);
    } finally {
      setLedgerLoading(false);
    }
  }, [searchLedger, statusLedger]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, restRes, reportRes] = await Promise.allSettled([
        adminClient.get("/food/admin/cashback-rules"),
        adminClient.get("/food/admin/restaurants"),
        adminClient.get("/food/admin/wallet/expiry-report")
      ]);

      if (rulesRes.status === "fulfilled") {
        const rawRules = rulesRes.value.data?.data || [];
        setCashbacks(Array.isArray(rawRules) ? rawRules.filter(r => r.isActive !== false) : []);
      }
      if (restRes.status === "fulfilled") {
        const list = restRes.value.data?.data?.restaurants || restRes.value.data?.data || [];
        setRestaurants(Array.isArray(list) ? list : []);
      }
      if (reportRes.status === "fulfilled") {
        setExpiryReport(reportRes.value.data?.data || null);
      }

      fetchLedgers(1);
    } catch (err) {
      console.error("Failed to load cashback data:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchLedgers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setError("");
    setSuccessMsg("");
    try {
      await adminClient.delete(`/food/admin/cashback-rules/${id}`);
      setSuccessMsg("Cashback rule deleted successfully!");
      setCashbacks(prev => prev.filter(c => c._id !== id));
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete cashback rule");
    }
  };

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cashback & Expiry Setup</h1>
              <p className="text-sm text-slate-500">Configure automatic cashback rules with user targeting, restaurant scoping, and 60-day wallet expiry</p>
            </div>
          </div>
          <button onClick={fetchData} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 transition">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Data
          </button>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cashback Distributed</p>
              <h3 className="text-2xl font-black text-slate-900">₹{(ledgerStats.totalCredited || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">{ledgerStats.totalCreditedCount || 0} orders rewarded</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending on Orders</p>
              <h3 className="text-2xl font-black text-slate-900">₹{(ledgerStats.totalPending || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Credited upon delivery</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expired Recovered</p>
              <h3 className="text-2xl font-black text-slate-900">₹{(expiryReport?.totalExpiredAmount || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Returned to platform</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Wallet Balance</p>
              <h3 className="text-2xl font-black text-slate-900">₹{(expiryReport?.adminPlatformBalance || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Platform reserve funds</p>
            </div>
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
          {/* Create Cashback Rule Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" /> Create Cashback Rule
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">Rule Title</label>
                <input
                  type="text"
                  placeholder="e.g. Standard 5% Cashback"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">Cashback Type</label>
                  <select
                    value={formData.cashbackType}
                    onChange={e => setFormData({ ...formData, cashbackType: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white font-semibold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">Value</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cashbackValue}
                    onChange={e => setFormData({ ...formData, cashbackValue: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">Max Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={formData.maxCashbackAmount ?? ""}
                    onChange={e => setFormData({ ...formData, maxCashbackAmount: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">Wallet Validity (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.expiryDays}
                  onChange={e => setFormData({ ...formData, expiryDays: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-purple-700"
                  required
                />
              </div>

              <div className="space-y-3 pt-3 border-t">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Restaurant Target</label>

                <div>
                  <select
                    value={formData.restaurantScope}
                    onChange={e => setFormData({ ...formData, restaurantScope: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white font-semibold"
                  >
                    <option value="ALL">Global (All Restaurants)</option>
                    <option value="SELECTED">Specific Restaurant Override</option>
                  </select>
                </div>

                {formData.restaurantScope === "SELECTED" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Outlet</label>
                    <select
                      value={formData.restaurantId}
                      onChange={e => setFormData({ ...formData, restaurantId: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white"
                      required
                    >
                      <option value="">-- Select Restaurant --</option>
                      {restaurants.map(r => (
                        <option key={r._id || r.id} value={r._id || r.id}>
                          {r.restaurantName || r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Order Type Target</label>
                <div>
                  <select
                    value={formData.orderType}
                    onChange={e => setFormData({ ...formData, orderType: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white font-semibold"
                  >
                    <option value="BOTH">Both (Delivery & Takeaway)</option>
                    <option value="DELIVERY">Delivery Only</option>
                    <option value="TAKEAWAY">Takeaway Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Eligibility & Stacking</label>

                <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.stackableWithCoupons}
                      onChange={e => setFormData({ ...formData, stackableWithCoupons: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Allow Combining with Discount Coupons</span>
                      <span className="text-[11px] text-slate-500 block">Customer can use a coupon code AND receive this cashback.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Customer App Live Preview */}
              <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl text-white space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Customer App Live Preview
                </div>
                <div className="bg-white/10 p-3 rounded-lg border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="font-black text-amber-300 text-sm tracking-wider uppercase">
                      CASHBACK OFFER
                    </span>
                    <p className="text-xs text-slate-200 mt-0.5">
                      Earn {formData.cashbackType === "PERCENTAGE" ? `${formData.cashbackValue}%` : `₹${formData.cashbackValue}`} cashback in wallet after delivery
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? "Saving..." : "Save & Activate Cashback Rule"}
              </button>
            </form>
          </div>

          {/* Active Rules List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-4">Active Cashback Rules ({cashbacks.length})</h2>

              {cashbacks.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No active cashback rules found.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cashbacks.map(cb => (
                    <div key={cb._id} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{cb.name}</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${cb.restaurantScope === "ALL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {cb.restaurantScope === "ALL" ? "Global Rule" : "Outlet Override"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Earns <strong className="text-purple-600">{cb.cashbackType === "PERCENTAGE" ? `${cb.cashbackValue}%` : `₹${cb.cashbackValue}`} cashback</strong> on min order ₹{cb.minOrderValue} (Capped at ₹{cb.maxCashbackAmount || "Unlimited"}, Valid for {cb.expiryDays} days).
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Order Type: <strong className="text-slate-700">{cb.orderType === 'DELIVERY' ? 'Delivery Only' : cb.orderType === 'TAKEAWAY' ? 'Takeaway Only' : 'Both (Delivery & Takeaway)'}</strong>
                        </p>
                      </div>

                      <button onClick={() => handleDelete(cb._id)} className="p-2 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Expired Batches */}
            {expiryReport?.recentExpiries?.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-900 border-b pb-4">Recent Expired Cashback Transferred to Admin</h2>
                <div className="divide-y divide-slate-100 text-sm">
                  {expiryReport.recentExpiries.map(exp => (
                    <div key={exp.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{exp.user?.name || exp.user?.email || "User"}</span>
                        <p className="text-xs text-slate-400">{new Date(exp.date).toLocaleString()}</p>
                      </div>
                      <span className="font-black text-rose-600">-₹{exp.amount} (Transferred to Admin)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User-Wise Cashback Distribution Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                User-Wise Cashback Distributed History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete record of cashback amounts awarded to each individual user across all orders
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, phone, order #..."
                  value={searchLedger}
                  onChange={(e) => {
                    setSearchLedger(e.target.value);
                    fetchLedgers(1, e.target.value, statusLedger);
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusLedger}
                onChange={(e) => {
                  setStatusLedger(e.target.value);
                  fetchLedgers(1, searchLedger, e.target.value);
                }}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="CREDITED">Credited (Active)</option>
                <option value="EXPIRED">Expired (Recovered)</option>
                <option value="PENDING">Pending</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Order ID</th>
                  <th className="px-6 py-3.5">Offer / Source</th>
                  <th className="px-6 py-3.5">Cashback Given</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                      Loading user cashback records...
                    </td>
                  </tr>
                ) : ledgers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No cashback distribution records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  ledgers.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                            {(row.userId?.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{row.userId?.name || "User"}</span>
                            <span className="text-xs text-slate-400">{row.userId?.phone || row.userId?.email || "N/A"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                          #{row.orderId?.orderId || "N/A"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-slate-900 block text-xs">
                            {row.cashbackRuleId?.name || (row.couponId?.code ? `Coupon: ${row.couponId.code}` : "Cashback Offer")}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Source: {row.sourceType}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {row.status === "REVERSED" ? (
                          <div>
                            <span className="text-xs font-bold text-slate-400 line-through mr-1.5">
                              +₹{row.amount}
                            </span>
                            <span className="text-sm font-black text-rose-600">
                              ₹0
                            </span>
                            <span className="block text-[10px] text-rose-500 font-bold">
                              Cancelled
                            </span>
                          </div>
                        ) : row.status === "EXPIRED" ? (
                          <div>
                            <span className="text-base font-black text-slate-500">
                              +₹{row.amount}
                            </span>
                            <span className="block text-[10px] text-rose-600 font-bold">
                              Expired & Recovered
                            </span>
                          </div>
                        ) : row.status === "PENDING" ? (
                          <div>
                            <span className="text-base font-black text-amber-600">
                              +₹{row.amount}
                            </span>
                            <span className="block text-[10px] text-amber-500 font-bold">
                              Pending Delivery
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-base font-black text-purple-700">
                              +₹{row.amount}
                            </span>
                            <span className="block text-[10px] text-emerald-600 font-bold">
                              Active in Wallet
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-extrabold tracking-wider ${
                            row.status === "CREDITED"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.status === "EXPIRED"
                              ? "bg-rose-100 text-rose-700"
                              : row.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {new Date(row.creditedAt || row.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Summary Bar */}
          <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
              <span>
                Active in Wallets: <strong className="text-emerald-700 font-black">₹{ledgerStats.totalActiveCredited || (ledgerStats.totalCredited - (ledgerStats.totalExpired || 0)) || 0}</strong> (3 orders)
              </span>
              <span>
                • Expired Recovered: <strong className="text-rose-600 font-black">₹{ledgerStats.totalExpired || 0}</strong> (1 order)
              </span>
              {ledgerStats.totalReversed > 0 && (
                <span>
                  • Cancelled: <strong className="text-slate-500 font-black">₹{ledgerStats.totalReversed}</strong> (1 order)
                </span>
              )}
            </div>
            <div className="text-slate-800 font-bold">
              Total Cashback Awarded: <strong className="text-purple-700 font-black text-sm">₹{ledgerStats.totalCredited || 0}</strong>
            </div>
          </div>

          {/* Pagination */}
          {ledgerPagination.pages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing page <strong className="text-slate-800">{ledgerPagination.page}</strong> of <strong className="text-slate-800">{ledgerPagination.pages}</strong> ({ledgerPagination.total} records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={ledgerPagination.page <= 1 || ledgerLoading}
                  onClick={() => fetchLedgers(ledgerPagination.page - 1)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={ledgerPagination.page >= ledgerPagination.pages || ledgerLoading}
                  onClick={() => fetchLedgers(ledgerPagination.page + 1)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
