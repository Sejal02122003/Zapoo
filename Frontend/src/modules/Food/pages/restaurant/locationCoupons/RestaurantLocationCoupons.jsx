import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, TrendingUp, ShoppingBag } from "lucide-react";
import { restaurantAPI } from "@food/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Loader from "@food/components/Loader";

export default function RestaurantLocationCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await restaurantAPI.getLocationCoupons();
      if (res.data?.success) {
        setCoupons(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch your location coupons");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Location Coupons</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
          <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">About Location Coupons</h2>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            These coupons are created by Zapoo Admins specifically for your restaurant based on user location. 
            The discount amount is automatically deducted from your net earnings to attract nearby customers.
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Location Coupons</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              There are currently no active location coupons assigned to your restaurant.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div key={coupon._id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mb-2 uppercase">
                      {coupon.code}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{coupon.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {coupon.discountType === 'percentage' 
                        ? `${coupon.discountValue}% OFF up to ₹${coupon.maximumDiscount}` 
                        : `Flat ₹${coupon.discountValue} OFF`}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    coupon.isActive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Requirements */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 text-xs space-y-1.5 text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Minimum Order Value</span>
                    <span className="font-medium">₹{coupon.minimumOrderAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Items</span>
                    <span className="font-medium">{coupon.minimumItems}</span>
                  </div>
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>Valid For Users Within</span>
                    <span className="font-medium">{coupon.maximumDistance} km radius</span>
                  </div>
                </div>

                {/* Analytics Snapshot */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Orders Used
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {coupon.ordersUsed || 0}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Total Discount
                    </div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      ₹{coupon.totalDiscountGiven || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
