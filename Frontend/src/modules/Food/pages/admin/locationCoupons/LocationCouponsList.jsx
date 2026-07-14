import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";
import { adminAPI } from "@food/api";
import { toast } from "sonner";
import Loader from "@food/components/Loader";
import LocationCouponForm from "./LocationCouponForm";

export default function LocationCouponsList() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getLocationCoupons();
      if (res.data?.success) {
        setCoupons(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch location coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const filteredCoupons = coupons.filter(coupon => {
    if (!searchTerm) return true;
    const name = coupon.restaurantId?.restaurantName || coupon.restaurantId?.name || String(coupon.restaurantId?._id || coupon.restaurantId || '');
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await adminAPI.deleteLocationCoupon(id);
      toast.success("Coupon deleted successfully");
      fetchCoupons();
    } catch (error) {
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await adminAPI.updateLocationCoupon(coupon._id, { isActive: !coupon.isActive });
      toast.success(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (showForm) {
    return (
      <LocationCouponForm 
        initialData={editingCoupon}
        onBack={() => {
          setShowForm(false);
          setEditingCoupon(null);
          fetchCoupons();
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Location Coupons</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage restaurant-funded location-based coupons</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Coupon
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <input 
          type="text"
          placeholder="Filter by Restaurant Name..."
          className="px-4 py-2 border rounded-lg flex-1 max-w-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4">Code / Title</th>
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Constraints</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <Loader className="w-8 h-8 mx-auto" />
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No location coupons found.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/25">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white uppercase">{coupon.code}</div>
                      <div className="text-xs text-gray-500">{coupon.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      {coupon.restaurantId?.restaurantName || coupon.restaurantId?.name || String(coupon.restaurantId?._id || coupon.restaurantId || 'Unknown')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-green-600 dark:text-green-400">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                      </div>
                      {coupon.maximumDiscount > 0 && <div className="text-xs text-gray-500">Max ₹{coupon.maximumDiscount}</div>}
                    </td>
                    <td className="px-6 py-4 space-y-1 text-xs">
                      <div><span className="font-medium">Min Order:</span> ₹{coupon.minimumOrderAmount}</div>
                      <div><span className="font-medium">Min Items:</span> {coupon.minimumItems}</div>
                      <div><span className="font-medium text-blue-600">Max Dist:</span> {coupon.maximumDistance} km</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          coupon.isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon._id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
