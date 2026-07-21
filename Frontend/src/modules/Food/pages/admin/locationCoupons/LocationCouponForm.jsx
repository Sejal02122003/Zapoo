import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { adminAPI } from "@food/api";
import { toast } from "sonner";

export default function LocationCouponForm({ initialData, onBack }) {
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    restaurantName: "",
    minimumOrderAmount: 0,
    minimumItems: 1,
    discountType: "percentage",
    discountValue: 0,
    maximumDiscount: 0,
    maximumDistance: 0,
    isActive: true,
    startDate: "",
    endDate: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        restaurantName: initialData.restaurantId?.restaurantName || "",
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : "",
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : ""
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        minimumOrderAmount: Number(formData.minimumOrderAmount),
        minimumItems: Number(formData.minimumItems),
        discountValue: Number(formData.discountValue),
        maximumDiscount: Number(formData.maximumDiscount),
        maximumDistance: Number(formData.maximumDistance) };

      if (!payload.startDate) delete payload.startDate;
      if (!payload.endDate) delete payload.endDate;

      if (initialData) {
        await adminAPI.updateLocationCoupon(initialData._id, payload);
        toast.success("Coupon updated successfully");
      } else {
        await adminAPI.createLocationCoupon(payload);
        toast.success("Coupon created successfully");
      }
      onBack();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {initialData ? "Edit Location Coupon" : "Create Location Coupon"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Coupon Code</label>
            <input
              type="text"
              name="code"
              required
              value={formData.code}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"
              placeholder="e.g. NEARBY50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g. 50% OFF Nearby"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Restaurant Name</label>
            <input
              type="text"
              name="restaurantName"
              required
              value={formData.restaurantName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter Restaurant Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Discount Type</label>
            <select
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Discount Value</label>
            <input
              type="number"
              name="discountValue"
              required
              min="0"
              value={formData.discountValue}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {formData.discountType === 'percentage' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Discount (₹)</label>
              <input
                type="number"
                name="maximumDiscount"
                min="0"
                value={formData.maximumDiscount}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Distance (km) <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="maximumDistance"
              required
              min="0"
              step="0.1"
              value={formData.maximumDistance}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ring-2 ring-blue-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Order Amount (₹)</label>
            <input
              type="number"
              name="minimumOrderAmount"
              min="0"
              value={formData.minimumOrderAmount}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Items</label>
            <input
              type="number"
              name="minimumItems"
              min="1"
              value={formData.minimumItems}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Coupon is Active</span>
            </label>
          </div>

        </div>

        <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Coupon"}
          </button>
        </div>
      </form>
    </div>
  );
}
