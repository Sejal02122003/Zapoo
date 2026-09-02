import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  Utensils, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  Loader2, 
  Sparkles,
  DollarSign,
  Tag,
  AlignLeft,
  Image as ImageIcon,
  CheckCircle2,
  Layers
} from "lucide-react"
import { toast } from "sonner"
import { restaurantAPI, uploadAPI } from "@food/api"

export default function AddEditDishModal({ 
  isOpen, 
  onClose, 
  onDishSaved, 
  editingDish = null, 
  existingCategories = [] 
}) {
  const fileInputRef = useRef(null)
  const isEditing = Boolean(editingDish?._id || editingDish?.id)

  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [categoryList, setCategoryList] = useState(existingCategories)
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    categoryId: "",
    price: "",
    foodType: "Veg", // "Veg" | "Non-Veg" | "Egg"
    description: "",
    image: "",
    isAvailable: true,
    hasVariants: false,
    variants: [
      { name: "Regular", price: "" }
    ]
  })

  // Load categories if not provided
  useEffect(() => {
    if (isOpen) {
      restaurantAPI.getCategories()
        .then((res) => {
          const cats = res?.data?.data?.categories || res?.data?.categories || res?.data?.data || []
          if (Array.isArray(cats) && cats.length > 0) {
            setCategoryList(cats.map(c => typeof c === "string" ? { _id: c, name: c } : c))
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Populate data when editing
  useEffect(() => {
    if (editingDish && isOpen) {
      const hasVars = Array.isArray(editingDish.variants) && editingDish.variants.length > 0
      setFormData({
        name: editingDish.name || "",
        category: editingDish.category || editingDish.categoryName || "",
        categoryId: editingDish.categoryId?._id || editingDish.categoryId || "",
        price: editingDish.price != null ? String(editingDish.price) : "",
        foodType: editingDish.foodType || (editingDish.isVeg ? "Veg" : "Non-Veg"),
        description: editingDish.description || "",
        image: editingDish.image || "",
        isAvailable: editingDish.isAvailable !== false,
        hasVariants: hasVars,
        variants: hasVars ? editingDish.variants.map(v => ({ name: v.name || "", price: String(v.price || "") })) : [{ name: "Half", price: "" }, { name: "Full", price: "" }]
      })
      setIsCustomCategory(false)
      setCustomCategoryName("")
    } else if (!editingDish && isOpen) {
      // Reset form
      setFormData({
        name: "",
        category: categoryList[0]?.name || categoryList[0]?._id || "",
        categoryId: categoryList[0]?._id || "",
        price: "",
        foodType: "Veg",
        description: "",
        image: "",
        isAvailable: true,
        hasVariants: false,
        variants: [
          { name: "Half", price: "" },
          { name: "Full", price: "" }
        ]
      })
      setIsCustomCategory(false)
      setCustomCategoryName("")
    }
  }, [editingDish, isOpen, categoryList])

  if (!isOpen) return null

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    setUploadingImage(true)
    try {
      const res = await uploadAPI.uploadMedia(file, { folder: "zapoo/foods" })
      const uploadedUrl = res?.data?.data?.url || res?.data?.url || res?.url
      if (uploadedUrl) {
        setFormData(prev => ({ ...prev, image: uploadedUrl }))
        toast.success("Image uploaded successfully")
      } else {
        throw new Error("No URL returned")
      }
    } catch (err) {
      // Fallback: create object URL preview if offline or dev
      const localUrl = URL.createObjectURL(file)
      setFormData(prev => ({ ...prev, image: localUrl }))
      toast.info("Image set for preview")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAddVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { name: "", price: "" }]
    }))
  }

  const handleRemoveVariant = (index) => {
    if (formData.variants.length <= 1) {
      toast.error("At least one variant is required")
      return
    }
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }))
  }

  const handleVariantChange = (index, field, value) => {
    setFormData(prev => {
      const nextVars = [...prev.variants]
      nextVars[index] = { ...nextVars[index], [field]: value }
      return { ...prev, variants: nextVars }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const name = formData.name.trim()
    if (!name) {
      toast.error("Dish name is required")
      return
    }

    let finalCategory = isCustomCategory ? customCategoryName.trim() : formData.category
    if (!finalCategory && categoryList.length > 0) {
      finalCategory = categoryList[0].name || categoryList[0]._id
    }
    if (!finalCategory) {
      finalCategory = "Main Course"
    }

    let payload = {
      name,
      category: finalCategory,
      categoryName: finalCategory,
      foodType: formData.foodType,
      isVeg: formData.foodType === "Veg",
      description: formData.description.trim(),
      image: formData.image,
      isAvailable: formData.isAvailable
    }

    if (formData.hasVariants) {
      const validVariants = formData.variants.filter(v => v.name.trim() && Number(v.price) > 0)
      if (validVariants.length === 0) {
        toast.error("Please add at least one variant with a valid price")
        return
      }
      payload.variants = validVariants.map(v => ({
        name: v.name.trim(),
        price: Number(v.price)
      }))
      payload.price = Math.min(...validVariants.map(v => Number(v.price)))
    } else {
      const basePrice = Number(formData.price)
      if (isNaN(basePrice) || basePrice < 0) {
        toast.error("Please enter a valid price")
        return
      }
      payload.price = basePrice
    }

    setLoading(true)
    try {
      const dishId = editingDish?._id || editingDish?.id
      if (isEditing && dishId) {
        await restaurantAPI.updateFood(dishId, payload)
        toast.success(`"${name}" updated successfully!`)
      } else {
        await restaurantAPI.createFood(payload)
        toast.success(`"${name}" added to menu catalog!`)
      }

      onDishSaved?.()
      onClose?.()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save dish"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#22A2E3]/15 flex items-center justify-center text-[#22A2E3]">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">
                  {isEditing ? "Edit Menu Dish" : "Add New Menu Dish"}
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  {isEditing ? "Update dish details, prices or stock" : "Add item to your central brand menu catalog"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* Dish Name & Food Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#22A2E3]" />
                  Dish / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Butter Chicken, Paneer Tikka..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Food Type *
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {["Veg", "Non-Veg", "Egg"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, foodType: type }))}
                      className={`py-1.5 rounded-xl text-[11px] font-black transition-all ${
                        formData.foodType === type
                          ? type === "Veg"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : type === "Non-Veg"
                            ? "bg-rose-500 text-white shadow-sm"
                            : "bg-amber-500 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#22A2E3]" />
                  Menu Category *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[11px] font-black text-[#22A2E3] hover:underline"
                >
                  {isCustomCategory ? "Choose from existing" : "+ Create new category"}
                </button>
              </div>

              {isCustomCategory ? (
                <input
                  type="text"
                  placeholder="Enter new category name (e.g. Starters, Desserts, Beverages)..."
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-[#22A2E3] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                >
                  <option value="">Select a Category</option>
                  {categoryList.map((cat, idx) => {
                    const name = typeof cat === "string" ? cat : cat.name || cat.title || "Category"
                    return <option key={idx} value={name}>{name}</option>
                  })}
                  {categoryList.length === 0 && (
                    <>
                      <option value="Main Course">Main Course</option>
                      <option value="Starters">Starters</option>
                      <option value="Fast Food">Fast Food</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Desserts">Desserts</option>
                    </>
                  )}
                </select>
              )}
            </div>

            {/* Pricing & Variants */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                    Pricing & Portions
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Set base price or multiple size portions (Small/Large)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hasVariants: !prev.hasVariants }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    formData.hasVariants
                      ? "bg-[#22A2E3] text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{formData.hasVariants ? "Multiple Sizes Enabled" : "Add Multiple Sizes"}</span>
                </button>
              </div>

              {!formData.hasVariants ? (
                <div className="space-y-1.5 max-w-xs">
                  <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                    Price (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required={!formData.hasVariants}
                      placeholder="e.g. 199"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {formData.variants.map((v, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Portion name (e.g. Half, Full, 500ml)"
                          value={v.name}
                          onChange={(e) => handleVariantChange(i, "name", e.target.value)}
                          className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                        />
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) => handleVariantChange(i, "price", e.target.value)}
                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(i)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs font-black text-[#22A2E3] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Portion / Size</span>
                  </button>
                </div>
              )}
            </div>

            {/* Description & Image Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-[#22A2E3]" />
                  Description / Ingredients (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Short description of the dish, spicy level, or key ingredients..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#22A2E3]" />
                  Dish Photo (Optional)
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#22A2E3] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/50 transition-colors h-[108px] overflow-hidden relative group"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-[#22A2E3]" />
                      <span className="text-[10px] font-bold">Uploading...</span>
                    </div>
                  ) : formData.image ? (
                    <>
                      <img 
                        src={formData.image} 
                        alt="Preview" 
                        className="w-full h-full object-cover absolute inset-0 group-hover:opacity-40 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <span className="text-white text-xs font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Upload className="w-3 h-3" /> Change Photo
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Upload className="w-5 h-5 text-[#22A2E3]" />
                      <span className="text-xs font-black text-slate-600 dark:text-slate-300">Click to upload photo</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* In-Stock Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-5 h-5 ${formData.isAvailable ? "text-emerald-500" : "text-slate-400"}`} />
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">Live Stock Availability</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {formData.isAvailable ? "Item will be immediately available for customers to order" : "Item will be marked Out of Stock"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  formData.isAvailable ? "bg-emerald-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                }`}
              >
                <motion.div
                  layout
                  className="w-4 h-4 rounded-full bg-white shadow-md"
                />
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="px-6 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/25 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Dish...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEditing ? "Update Dish" : "Save & Add to Menu"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
