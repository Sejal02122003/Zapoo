import { useState, useEffect } from "react"
import { motion } from "framer-motion"
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
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"

export default function OwnerInventoryPage() {
  const [loading, setLoading] = useState(true)
  const [selectedOutletId, setSelectedOutletId] = useState(() => localStorage.getItem("owner_selected_outlet") || null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

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
        onOpenAddOutlet={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              Multi-Outlet Stock & Inventory
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Live menu items and stock availability monitoring across branches
            </p>
          </div>

          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-600 hover:text-[#22A2E3] self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase text-slate-400">Total Menu Items</span>
              <Utensils className="w-5 h-5 text-[#22A2E3]" />
            </div>
            <h3 className="text-3xl font-black font-['Outfit']">{summary.totalItems || items.length}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">Shared brand catalog</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase text-slate-400">In-Stock Dishes</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400">{summary.inStockItems || items.length}</h3>
            <p className="text-xs font-bold text-emerald-600 mt-1">Ready for ordering</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase text-slate-400">Out of Stock</span>
              <XCircle className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] text-rose-600 dark:text-rose-400">{summary.outOfStockItems || 0}</h3>
            <p className="text-xs font-bold text-rose-500 mt-1">Paused in branches</p>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize shrink-0 transition-all ${
                    categoryFilter === cat
                      ? "bg-[#22A2E3] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Items Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#22A2E3]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-2">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-black">No items found</h3>
            <p className="text-xs text-slate-400">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Dish Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 dark:text-white text-sm">{item.name}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {item.category}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          item.isVeg ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {item.isVeg ? "Veg" : "Non-Veg"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                        ₹{item.price}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl ${
                          item.isAvailable
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        }`}>
                          {item.isAvailable ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <AddOutletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onOutletCreated={fetchInventory}
      />
    </div>
  )
}
