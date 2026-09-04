import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Building2, 
  ShoppingBag, 
  Store, 
  Layers, 
  TrendingUp, 
  Wallet, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  DollarSign, 
  Star, 
  Users, 
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  FileSpreadsheet,
  MapPin
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"
import { getOutletTimingDetails } from "./OwnerOutletsPage"

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [selectedOutletId, setSelectedOutletId] = useState(() => localStorage.getItem("owner_selected_outlet") || null)
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false)
  const [data, setData] = useState({
    summary: {
      totalRevenue: 0,
      totalProfit: 0,
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      totalOutlets: 0,
      activeOutlets: 0,
    },
    outletBreakdown: [],
    recentOrders: [],
  })

  const handleSelectOutlet = (id) => {
    setSelectedOutletId(id)
    if (id) {
      localStorage.setItem("owner_selected_outlet", id)
    } else {
      localStorage.removeItem("owner_selected_outlet")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedOutletId) params.outletId = selectedOutletId
      const res = await ownerAPI.getSummary(params)
      const resData = res?.data?.data || res?.data
      if (resData) {
        setData(resData)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load dashboard metrics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedOutletId])

  const { summary, outletBreakdown, recentOrders, restaurant } = data
  const selectedOutlet = outletBreakdown.find(o => String(o._id) === String(selectedOutletId))

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0c0c0c] text-slate-900 dark:text-white font-['Poppins']">
      <OwnerNav
        selectedOutletId={selectedOutletId}
        onSelectOutlet={handleSelectOutlet}
        outlets={outletBreakdown}
        restaurantData={restaurant}
        onOpenAddOutlet={() => setIsAddOutletOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 space-y-8">
        {/* Top Welcome & Quick Filter Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#22A2E3]/15 via-blue-500/5 to-transparent p-6 rounded-3xl border border-[#22A2E3]/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-wider text-[#22A2E3] dark:text-[#22A2E3]">
                Central Management Dashboard
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              {selectedOutlet ? `${selectedOutlet.name} Overview` : "Brand Multi-Outlet Overview"}
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedOutlet 
                ? `Showing statistics for ${selectedOutlet.outletCode} • ${selectedOutlet.city}`
                : `Consolidated performance across all ${summary.totalOutlets || outletBreakdown.length} active branches`}
            </p>

            {/* Main HQ Operational Timings Indicator */}
            {(() => {
              const hqTimings = selectedOutlet ? selectedOutlet.timings : (restaurant?.timings || outletBreakdown[0]?.timings)
              const hqOutletTimings = selectedOutlet ? selectedOutlet.outletTimings : (restaurant?.outletTimings || outletBreakdown[0]?.outletTimings)
              const tInfo = getOutletTimingDetails(hqTimings, hqOutletTimings)
              const outletDisplayName = selectedOutlet ? selectedOutlet.name : (restaurant?.name || "Main Outlet (HQ)")
              return (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#22A2E3] shrink-0" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {outletDisplayName} Timings:
                    </span>
                    <span className="font-black text-[#22A2E3]">
                      {tInfo.formattedTiming}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      ({tInfo.openDaysText})
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      tInfo.isOpenNow
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tInfo.isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span>{tInfo.isOpenNow ? "Open Now" : "Closed"}</span>
                    </span>
                  </div>

                  <Link
                    to={selectedOutlet ? `/food/restaurant/outlet-timings?outletId=${selectedOutlet._id}` : "/food/restaurant/outlet-timings"}
                    className="text-[11px] font-black text-[#22A2E3] hover:underline flex items-center gap-1 px-2.5 py-1 bg-[#22A2E3]/10 hover:bg-[#22A2E3]/20 rounded-xl transition-colors"
                    title="Configure Weekly Schedule & Timings"
                  >
                    <span>Edit Timings</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )
            })()}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {selectedOutletId && (
              <button
                onClick={() => handleSelectOutlet(null)}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition-colors"
              >
                Reset to All Outlets
              </button>
            )}

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#22A2E3] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setIsAddOutletOpen(true)}
              className="px-4 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Outlet</span>
            </button>
          </div>
        </div>

        {/* Quick Outlet Selector Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => handleSelectOutlet(null)}
            className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all ${
              !selectedOutletId
                ? "bg-[#22A2E3] text-white shadow-md shadow-[#22A2E3]/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#22A2E3]"
            }`}
          >
            All Outlets ({summary.totalOutlets || outletBreakdown.length})
          </button>
          {outletBreakdown.map((outlet) => {
            const isSelected = String(outlet._id) === String(selectedOutletId)
            const tInfo = getOutletTimingDetails(outlet.timings, outlet.outletTimings)
            return (
              <button
                key={outlet._id}
                onClick={() => handleSelectOutlet(outlet._id)}
                className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-[#22A2E3] text-white shadow-md shadow-[#22A2E3]/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#22A2E3]"
                }`}
                title={`${outlet.name}: ${tInfo.formattedTiming} (${tInfo.isOpenNow ? "Open Now" : "Closed"})`}
              >
                {outlet.isMainRestaurant && (
                  <span className="text-[9px] font-black uppercase px-1 py-0.5 bg-[#22A2E3]/20 text-[#22A2E3] rounded mr-0.5">HQ</span>
                )}
                <span className={`w-2 h-2 rounded-full ${tInfo.isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{outlet.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-blue-700 text-blue-100" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  {tInfo.formattedTiming}
                </span>
              </button>
            )
          })}
        </div>

        {/* 4 Main KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Revenue */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-[#22A2E3]/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Gross Sales</span>
              <div className="w-10 h-10 rounded-2xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] tracking-tight">
              ₹{Number(summary.totalRevenue || 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-2">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Consolidated across branches</span>
            </div>
          </div>

          {/* Card 2: Estimated Net Profit */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Net Profit (Est.)</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] tracking-tight text-emerald-600 dark:text-emerald-400">
              ₹{Number(summary.totalProfit || 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-2">
              <span>Approx. 25% Brand Margin</span>
            </div>
          </div>

          {/* Card 3: Total Orders */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Orders</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-[#22A2E3] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] tracking-tight">
              {Number(summary.totalOrders || 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-2 text-xs font-bold mt-2">
              <span className="text-emerald-600 font-bold">{summary.completedOrders || 0} Delivered</span>
              <span className="text-slate-300">•</span>
              <span className="text-[#22A2E3] font-bold">{summary.pendingOrders || 0} Active</span>
            </div>
          </div>

          {/* Card 4: Outlets Count */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Live Outlets</span>
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] tracking-tight">
              {summary.activeOutlets || 0} <span className="text-lg font-bold text-slate-400">/ {summary.totalOutlets || outletBreakdown.length}</span>
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 mt-2">
              <span>All branches online & operational</span>
            </div>
          </div>
        </div>

        {/* Quick Action: Zone Setup Banner */}
        <div className="bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent p-5 rounded-3xl border border-red-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-200">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Outlet Zone Setup & GPS Map Pin</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 uppercase">
                  Service Area
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pin your exact restaurant entrance and connect your outlets to active delivery service zones.
              </p>
            </div>
          </div>
          <Link
            to="/food/restaurant/zone-setup"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-200 flex items-center gap-2 transition-all self-start sm:self-auto active:scale-95 shrink-0"
          >
            <MapPin className="w-4 h-4" />
            <span>Open Zone & Pin Setup →</span>
          </Link>
        </div>

        {/* Section: Outlets Performance Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black font-['Outfit'] tracking-tight">
                Outlet Branches Leaderboard
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Track revenue, orders, and operational status for every branch
              </p>
            </div>
            <Link
              to="/food/restaurant/owner/outlets"
              className="text-xs font-black text-[#22A2E3] hover:underline flex items-center gap-1"
            >
              <span>Manage All Outlets</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {outletBreakdown.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
              <Store className="w-12 h-12 text-[#22A2E3] mx-auto" />
              <div>
                <h3 className="text-base font-black">No outlets created yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Start by adding your first restaurant branch. You can generate login credentials and manage access permissions.
                </p>
              </div>
              <button
                onClick={() => setIsAddOutletOpen(true)}
                className="px-6 py-3 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Your First Outlet</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {outletBreakdown.map((outlet, idx) => (
                <div
                  key={outlet._id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border transition-all space-y-4 relative ${
                    String(outlet._id) === String(selectedOutletId)
                      ? "border-[#22A2E3] shadow-md ring-2 ring-[#22A2E3]/20"
                      : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                          {outlet.outletCode}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${outlet.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        {outlet.name}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">
                        {outlet.city} {outlet.area ? `• ${outlet.area}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-[#22A2E3]/10 text-[#22A2E3] px-2 py-1 rounded-xl text-xs font-black">
                      <Star className="w-3.5 h-3.5 fill-[#22A2E3] text-[#22A2E3]" />
                      <span>{outlet.rating || 4.5}</span>
                    </div>
                  </div>

                  {/* Operational Timings Strip */}
                  {(() => {
                    const timingInfo = getOutletTimingDetails(outlet.timings, outlet.outletTimings)
                    return (
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-[#22A2E3] shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {timingInfo.formattedTiming}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">{timingInfo.openDaysText}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                          timingInfo.isOpenNow
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${timingInfo.isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span>{timingInfo.isOpenNow ? "Open Now" : "Closed"}</span>
                        </span>
                      </div>
                    )
                  })()}

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Orders</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{outlet.totalOrders || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Revenue</p>
                      <p className="text-sm font-black text-[#22A2E3]">₹{Number(outlet.totalRevenue || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Profit</p>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{Number(outlet.totalProfit || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleSelectOutlet(outlet._id)}
                      className="text-xs font-black text-[#22A2E3] hover:underline flex items-center gap-1"
                    >
                      <span>Filter Dashboard</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      to={`/food/restaurant/owner/outlets?edit=${outlet._id}`}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Manage & Login →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Live / Recent Multi-Outlet Orders Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black font-['Outfit'] tracking-tight">
                Live & Recent Orders Stream
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Latest orders received across branches
              </p>
            </div>
            <Link
              to="/food/restaurant/owner/orders"
              className="text-xs font-black text-[#22A2E3] hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                No orders found for the selected view.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.map((order) => (
                  <div key={order._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black font-mono text-slate-900 dark:text-white">
                            #{order.order_id}
                          </p>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#22A2E3]/15 text-[#22A2E3]">
                            {order.outletName || "Branch"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          {order.customerName} • {order.itemsCount} items • {order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          ₹{Number(order.total || 0).toLocaleString()}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl tracking-wider ${
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
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Outlet Modal */}
      <AddOutletModal
        isOpen={isAddOutletOpen}
        onClose={() => setIsAddOutletOpen(false)}
        onOutletCreated={() => {
          fetchData()
        }}
      />
    </div>
  )
}
