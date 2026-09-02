import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Layers, 
  Search, 
  Store, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Utensils,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  Image as ImageIcon,
  FileSpreadsheet,
  Upload
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { ownerAPI, restaurantAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"
import AddEditDishModal from "@food/components/restaurant/owner/AddEditDishModal"
import BulkMenuUploadModal from "@food/components/restaurant/owner/BulkMenuUploadModal"

export default function OwnerInventoryPage() {
  const [loading, setLoading] = useState(true)
  const [selectedOutletId, setSelectedOutletId] = useState(() => localStorage.getItem("owner_selected_outlet") || null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all") // "all" | "in-stock" | "out-of-stock" | "veg" | "non-veg"
  const [inventoryData, setInventoryData] = useState({
    summary: {
      totalItems: 0,
      inStockItems: 0,
      outOfStockItems: 0,
      totalOutlets: 0,
    },
    outlets: [],
    items: [],
  })

  // Modal states
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false)
  const [isDishModalOpen, setIsDishModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingDish, setEditingDish] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedOutletId) params.outletId = selectedOutletId
      const res = await ownerAPI.getInventory(params)
      const data = res?.data?.data || res?.data
      if (data) {
        setInventoryData(data)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load inventory data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [selectedOutletId])

  const { summary, outlets, items } = inventoryData

  const categories = ["all", ...new Set(items.map(i => i.category).filter(Boolean))]

  const filteredItems = items.filter(item => {
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter

    let matchesStatus = true
    if (statusFilter === "in-stock") matchesStatus = item.isAvailable !== false
    else if (statusFilter === "out-of-stock") matchesStatus = item.isAvailable === false
    else if (statusFilter === "veg") matchesStatus = item.isVeg === true || item.foodType === "Veg"
    else if (statusFilter === "non-veg") matchesStatus = item.isVeg === false || item.foodType === "Non-Veg"

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Toggle Live Stock
  const handleToggleStock = async (item) => {
    const nextStatus = item.isAvailable === false
    const itemId = item._id || item.id

    // Optimistic update
    setInventoryData(prev => ({
      ...prev,
      items: prev.items.map(i => (i._id === item._id || i.id === item.id) ? { ...i, isAvailable: nextStatus } : i),
      summary: {
        ...prev.summary,
        inStockItems: nextStatus ? (prev.summary.inStockItems + 1) : Math.max(0, prev.summary.inStockItems - 1),
        outOfStockItems: nextStatus ? Math.max(0, prev.summary.outOfStockItems - 1) : (prev.summary.outOfStockItems + 1)
      }
    }))

    setTogglingId(itemId)
    try {
      await restaurantAPI.updateFood(itemId, { isAvailable: nextStatus })
      toast.success(`"${item.name}" marked ${nextStatus ? "In Stock" : "Out of Stock"}`)
    } catch (err) {
      toast.error("Failed to update item status")
      fetchInventory() // Revert
    } finally {
      setTogglingId(null)
    }
  }

  // Delete Dish
  const handleDeleteDish = async (item) => {
    const itemId = item._id || item.id
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from your catalog?`)) {
      return
    }

    setDeletingId(itemId)
    try {
      await restaurantAPI.deleteFood(itemId)
      toast.success(`"${item.name}" removed successfully`)
      fetchInventory()
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete item")
    } finally {
      setDeletingId(null)
    }
  }

  // Edit Dish
  const handleEditDish = (item) => {
    setEditingDish(item)
    setIsDishModalOpen(true)
  }

  // Create Dish
  const handleCreateDish = () => {
    setEditingDish(null)
    setIsDishModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0c0c0c] text-slate-900 dark:text-white font-['Poppins']">
      <OwnerNav
        selectedOutletId={selectedOutletId}
        onSelectOutlet={(id) => {
          setSelectedOutletId(id)
          if (id) localStorage.setItem("owner_selected_outlet", id)
          else localStorage.removeItem("owner_selected_outlet")
        }}
        outlets={outlets}
        onOpenAddOutlet={() => setIsAddOutletOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 space-y-8">
        {/* Header & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              Multi-Outlet Stock & Inventory
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Live menu items and stock availability monitoring across branches
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Primary Add Dish Button */}
            <button
              onClick={handleCreateDish}
              className="px-4 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/25 flex items-center gap-2 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Menu Item</span>
            </button>

            {/* Bulk Upload Button */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm flex items-center gap-1.5 transition-colors shrink-0"
              title="Import dishes in bulk using Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Bulk Upload</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchInventory}
              disabled={loading}
              title="Refresh live catalog"
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-600 hover:text-[#22A2E3] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase text-slate-400">Total Menu Items</span>
              <Utensils className="w-5 h-5 text-[#22A2E3]" />
            </div>
            <h3 className="text-3xl font-black font-['Outfit']">{summary.totalItems || items.length}</h3>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs font-bold text-slate-400">Shared brand catalog</p>
              <button 
                onClick={handleCreateDish}
                className="text-xs font-black text-[#22A2E3] hover:underline"
              >
                + Add Dish
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase text-slate-400">In-Stock Dishes</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400">
              {summary.inStockItems || items.filter(i => i.isAvailable !== false).length}
            </h3>
            <p className="text-xs font-bold text-emerald-600 mt-1">Ready for ordering</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase text-slate-400">Out of Stock</span>
              <XCircle className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] text-rose-600 dark:text-rose-400">
              {summary.outOfStockItems || items.filter(i => i.isAvailable === false).length}
            </h3>
            <p className="text-xs font-bold text-rose-500 mt-1">Paused in branches</p>
          </div>
        </div>

        {/* Search, Status & Category Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {[
                { id: "all", label: "All Items" },
                { id: "in-stock", label: "In Stock" },
                { id: "out-of-stock", label: "Out of Stock" },
                { id: "veg", label: "Veg Only" },
                { id: "non-veg", label: "Non-Veg Only" }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                    statusFilter === s.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips Bar */}
          {categories.length > 1 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1">Categories:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize shrink-0 transition-all ${
                    categoryFilter === cat
                      ? "bg-[#22A2E3] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table / Empty State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#22A2E3]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center justify-center mx-auto">
              <Utensils className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black font-['Outfit']">No menu items found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {items.length === 0 
                  ? "Your restaurant catalog is currently empty. Add your first dish to start receiving orders!"
                  : "No dishes match your current filter or search criteria."}
              </p>
            </div>
            {items.length === 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleCreateDish}
                  className="px-6 py-3 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/25 inline-flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Your First Menu Item</span>
                </button>

                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl text-xs font-black inline-flex items-center gap-2 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Bulk Upload via Excel</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Dish</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-center">Live Stock</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {filteredItems.map((item) => {
                    const isAvail = item.isAvailable !== false
                    const isToggling = togglingId === (item._id || item.id)
                    const isDeleting = deletingId === (item._id || item.id)
                    const hasVariants = Array.isArray(item.variants) && item.variants.length > 0

                    return (
                      <tr key={item._id || item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Dish name & photo */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              ) : (
                                <Utensils className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 dark:text-white text-sm truncate max-w-[200px] sm:max-w-[260px]">
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="text-[10px] text-slate-400 font-normal truncate max-w-[200px] sm:max-w-[260px]">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-bold">
                            {item.category || "General"}
                          </span>
                        </td>

                        {/* Food Type */}
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            item.isVeg || item.foodType === "Veg"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : item.foodType === "Egg"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}>
                            {item.foodType || (item.isVeg ? "Veg" : "Non-Veg")}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                          ₹{item.price}
                          {hasVariants && (
                            <span className="block text-[10px] font-semibold text-[#22A2E3]">
                              {item.variants.length} portions
                            </span>
                          )}
                        </td>

                        {/* Live Stock Toggle Switch */}
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStock(item)}
                              disabled={isToggling}
                              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                                isAvail
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isAvail ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-rose-600" />
                              )}
                              <span>{isAvail ? "In Stock" : "Out of Stock"}</span>
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditDish(item)}
                              className="p-2 text-slate-600 dark:text-slate-300 hover:text-[#22A2E3] hover:bg-[#22A2E3]/10 rounded-xl transition-colors"
                              title="Edit item details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDish(item)}
                              disabled={isDeleting}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                              title="Delete dish"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Dish Modal */}
      <AddEditDishModal
        isOpen={isDishModalOpen}
        onClose={() => setIsDishModalOpen(false)}
        onDishSaved={fetchInventory}
        editingDish={editingDish}
        existingCategories={categories.filter(c => c !== "all")}
      />

      {/* Bulk Menu Upload Modal */}
      <BulkMenuUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onUploadSuccess={fetchInventory}
      />

      {/* Add Outlet Modal */}
      <AddOutletModal
        isOpen={isAddOutletOpen}
        onClose={() => setIsAddOutletOpen(false)}
        onOutletCreated={fetchInventory}
      />
    </div>
  )
}
