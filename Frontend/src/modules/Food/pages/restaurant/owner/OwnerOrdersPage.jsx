import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { 
  ShoppingBag, 
  Search, 
  Store, 
  Filter, 
  Calendar, 
  ChevronRight, 
  RefreshCw, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Loader2,
  FileSpreadsheet
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"

const STATUS_TABS = [
  { id: "all", label: "All Orders" },
  { id: "created", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "preparing", label: "Preparing" },
  { id: "ready_for_pickup", label: "Ready" },
  { id: "completed", label: "Completed" },
  { id: "cancelled_by_user", label: "Cancelled" },
]

export default function OwnerOrdersPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [outlets, setOutlets] = useState([])
  const [selectedOutletId, setSelectedOutletId] = useState(() => localStorage.getItem("owner_selected_outlet") || null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const fetchOutlets = async () => {
    try {
      const res = await ownerAPI.getOutlets({})
      const data = res?.data?.data || res?.data
      setOutlets(data?.outlets || [])
    } catch (e) {}
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
        outletId: selectedOutletId || undefined,
      }
      const res = await ownerAPI.getOrders(params)
      const data = res?.data?.data || res?.data
      setOrders(data?.orders || [])
      setTotalPages(data?.totalPages || 1)
      setTotalOrders(data?.total || 0)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOutlets()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [page, statusFilter, selectedOutletId, search])

  const handleSelectOutlet = (id) => {
    setSelectedOutletId(id)
    setPage(1)
    if (id) localStorage.setItem("owner_selected_outlet", id)
    else localStorage.removeItem("owner_selected_outlet")
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0c0c0c] text-slate-900 dark:text-white font-['Poppins']">
      <OwnerNav
        selectedOutletId={selectedOutletId}
        onSelectOutlet={handleSelectOutlet}
        outlets={outlets}
        onOpenAddOutlet={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              Multi-Outlet Orders Hub
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Consolidated order streams across all restaurant branches ({totalOrders} orders)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-600 hover:text-[#22A2E3] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Outlet Selector Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => handleSelectOutlet(null)}
            className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all ${
              !selectedOutletId
                ? "bg-[#22A2E3] text-white shadow-md shadow-[#22A2E3]/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#22A2E3]"
            }`}
          >
            All Outlets
          </button>
          {outlets.map((outlet) => {
            const isSelected = String(outlet._id) === String(selectedOutletId)
            return (
              <button
                key={outlet._id}
                onClick={() => handleSelectOutlet(outlet._id)}
                className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-[#22A2E3] text-white shadow-md shadow-[#22A2E3]/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#22A2E3]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${outlet.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{outlet.name}</span>
              </button>
            )
          })}
        </div>

        {/* Search & Status Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order ID, Customer, Phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                    statusFilter === tab.id
                      ? "bg-[#22A2E3] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#22A2E3]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4">
            <ShoppingBag className="w-12 h-12 text-[#22A2E3] mx-auto" />
            <div>
              <h3 className="text-base font-black">No orders found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no orders matching your current filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => {
                const orderId = order.order_id || order.orderId || String(order._id).slice(-6)
                const itemsCount = Array.isArray(order.items) ? order.items.length : 0
                return (
                  <div
                    key={order._id}
                    onClick={() => navigate(`/food/restaurant/orders/${order._id}`, { state: { mongoId: order._id } })}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-[#22A2E3]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer"
                  >
                    {/* Left Info */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                          #{orderId}
                        </span>

                        <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          <span>{order.outletId?.name || "Main Outlet"}</span>
                        </span>

                        <span className="text-xs font-bold text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {order.customer?.name || order.customerName || "Customer"}
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {order.customer?.phone || order.phone || ""} • {itemsCount} {itemsCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>

                    {/* Right Price & Status */}
                    <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left md:text-right">
                        <p className="text-lg font-black text-slate-900 dark:text-white font-['Outfit']">
                          ₹{Number(order.pricing?.total || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] font-bold uppercase text-slate-400">
                          {order.payment?.method || "Online"} • {order.payment?.status || "Paid"}
                        </p>
                      </div>

                      <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl tracking-wider ${
                        order.orderStatus === 'completed' || order.orderStatus === 'delivered'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : order.orderStatus === 'cancelled_by_user' || order.orderStatus === 'cancelled_by_restaurant'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-[#22A2E3]/15 text-[#22A2E3]'
                      }`}>
                        {order.orderStatus?.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <AddOutletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onOutletCreated={() => {
          fetchOutlets()
          fetchOrders()
        }}
      />
    </div>
  )
}
