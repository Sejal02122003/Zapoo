import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog";
import { X, Search } from "lucide-react";
import { adminAPI } from "@food/api";
import { toast } from "sonner";

export default function CreatePromoBannerModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const [formData, setFormData] = useState({
    idSlug: "",
    title: "",
    subtitle: "",
    ctaText: "",
    category: "",
    scope: "global",
    restaurantId: "",
    restaurantName: "",
    isActive: true,
  });

  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // For restaurant search (simple implementation)
  const [restaurants, setRestaurants] = useState([]);
  const [searchResQuery, setSearchResQuery] = useState("");
  const [showResDropdown, setShowResDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData((prev) => ({
        ...prev,
        title: initialData.title || "",
        scope: initialData.scope || "global",
        restaurantId: initialData.restaurantId || "",
        restaurantName: initialData.restaurantName || "",
      }));
      setSearchResQuery(initialData.restaurantName || "");
    } else if (isOpen) {
      // reset
      setFormData({
        idSlug: "",
        title: "",
        subtitle: "",
        ctaText: "",
        category: "",
        scope: "global",
        restaurantId: "",
        restaurantName: "",
        isActive: true,
      });
      setMediaFile(null);
      setSearchResQuery("");
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (searchResQuery.length > 2 && formData.restaurantName !== searchResQuery) {
      const delay = setTimeout(() => {
        searchRestaurants(searchResQuery);
      }, 500);
      return () => clearTimeout(delay);
    }
  }, [searchResQuery]);

  const searchRestaurants = async (query) => {
    try {
      const res = await adminAPI.globalSearch(query);
      if (res.data?.success && res.data?.data?.restaurants) {
        setRestaurants(res.data.data.restaurants.slice(0, 5));
        setShowResDropdown(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectRestaurant = (res) => {
    setFormData({ ...formData, restaurantId: res._id, restaurantName: res.restaurantName });
    setSearchResQuery(res.restaurantName);
    setShowResDropdown(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.idSlug || !formData.title || !mediaFile) {
      toast.error("ID, Title, and Image are required.");
      return;
    }

    if (!formData.restaurantId && initialData?.adRequestId) {
      toast.error("Restaurant selection is required for Ad Request Banners.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      Object.keys(formData).forEach((key) => {
        form.append(key, formData[key]);
      });
      if (initialData?.adRequestId) {
        form.append("adRequestId", initialData.adRequestId);
      }
      form.append("media", mediaFile);

      const res = await adminAPI.createPromoBanner(form);
      if (res.data?.success) {
        toast.success("Promo Banner created successfully!");
        onSuccess && onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create banner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white rounded-xl">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between bg-white">
          <DialogTitle className="text-xl font-semibold text-gray-800">Create Banner</DialogTitle>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            
            {/* ID / Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID (Slug)</label>
              <input
                type="text"
                name="idSlug"
                value={formData.idSlug}
                onChange={handleChange}
                placeholder="e.g. bulk-discount"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
                required
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Winter Sale"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
                required
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleChange}
                placeholder="e.g. Up to 50% off"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
              />
            </div>

            <div className="flex gap-4">
              {/* CTA Text */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                <input
                  type="text"
                  name="ctaText"
                  value={formData.ctaText}
                  onChange={handleChange}
                  placeholder="e.g. Shop Now"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
                />
              </div>

              {/* Category */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all bg-white"
                >
                  <option value="">Select a category</option>
                  <option value="promo">Promo</option>
                  <option value="discount">Discount</option>
                  <option value="event">Event</option>
                </select>
              </div>
            </div>

            {/* Restaurant & Scope */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Link</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchResQuery}
                    onChange={(e) => {
                      setSearchResQuery(e.target.value);
                      if (formData.restaurantName && e.target.value !== formData.restaurantName) {
                        setFormData({ ...formData, restaurantId: "", restaurantName: "" });
                      }
                    }}
                    placeholder="Search restaurant..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
                  />
                </div>
                {showResDropdown && restaurants.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {restaurants.map((res) => (
                      <div
                        key={res._id}
                        onClick={() => handleSelectRestaurant(res)}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                      >
                        {res.restaurantName}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select
                  name="scope"
                  value={formData.scope}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all bg-white"
                >
                  <option value="global">Global</option>
                  <option value="zone">Zone Specific</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 bg-[#e6f8f0] text-[#10b981] text-sm font-medium rounded-md hover:bg-[#dcf3e8] transition-colors"
                >
                  Choose File
                </button>
                <span className="text-sm text-gray-500 truncate">
                  {mediaFile ? mediaFile.name : "No file chosen"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-[#10b981] border-gray-300 rounded focus:ring-[#10b981]"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Make this banner active
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#10b981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              Save Banner
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
