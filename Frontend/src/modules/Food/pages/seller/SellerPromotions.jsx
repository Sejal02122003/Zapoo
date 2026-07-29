import { useState, useEffect } from "react";
import { Tag, RefreshCw, Gift, Layers, ShieldCheck } from "lucide-react";
import { restaurantClient } from "../../../../services/api/axios";

export default function SellerPromotions() {
  const [promotions, setPromotions] = useState({ coupons: [], cashbackRules: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPromotions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await restaurantClient.get("/food/restaurant/active-promotions");
      if (res.data?.success) {
        setPromotions(res.data.data || { coupons: [], cashbackRules: [] });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load active promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Active Restaurant Promotions</h1>
              <p className="text-sm text-slate-500">Read-only view of admin-configured coupons and cashback rules currently running on your outlet</p>
            </div>
          </div>
          <button onClick={fetchPromotions} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Coupons Read-Only Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-600" /> Active Coupons ({promotions.coupons?.length || 0})
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Managed by Admin
              </span>
            </div>

            {promotions.coupons?.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No active coupons running on your outlet.</p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-3 pt-1">
                {promotions.coupons?.map(c => (
                  <div key={c._id} className="pt-3 first:pt-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 uppercase">
                        {c.code}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${c.rewardType === 'CASHBACK' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {c.rewardType === 'CASHBACK' ? 'Cashback Coupon' : 'Instant Discount'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {c.rewardType === 'CASHBACK' ? (
                        <>Earns <strong>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`} cashback</strong> after delivery</>
                      ) : (
                        <>Gets <strong>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`} OFF</strong> at checkout</>
                      )}
                      {c.minOrderValue > 0 && ` on min order ₹${c.minOrderValue}`}.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Expires: {new Date(c.validUntil).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Cashback Rules Read-Only Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" /> Active Cashback Offers ({promotions.cashbackRules?.length || 0})
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Managed by Admin
              </span>
            </div>

            {promotions.cashbackRules?.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No active cashback rules running on your outlet.</p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-3 pt-1">
                {promotions.cashbackRules?.map(cb => (
                  <div key={cb._id} className="pt-3 first:pt-0">
                    <span className="font-bold text-slate-800 text-sm">{cb.name}</span>
                    <p className="text-xs text-slate-600 mt-1">
                      Earns <strong className="text-orange-600">{cb.cashbackType === 'PERCENTAGE' ? `${cb.cashbackValue}%` : `₹${cb.cashbackValue}`} cashback</strong> on min order ₹{cb.minOrderValue} (Valid {cb.expiryDays} days).
                    </p>
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
