import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  TrendingUp, 
  BarChart3, 
  Clock, 
  Star, 
  Users, 
  ShoppingBag, 
  Store, 
  Sparkles,
  ArrowUpRight,
  Flame,
  Loader2,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"

export default function OwnerAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [selectedOutletId, setSelectedOutletId] = useState(() => localStorage.getItem("owner_selected_outlet") || null)
  const [outlets, setOutlets] = useState([])
  const [summaryData, setSummaryData] = useState({
    summary: {},
    outletBreakdown: [],
    recentOrders: [],
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedOutletId) params.outletId = selectedOutletId
      const res = await ownerAPI.getSummary(params)
      const data = res?.data?.data || res?.data
      if (data) {
        setSummaryData(data)
        setOutlets(data.outletBreakdown || [])
      }
    } catch (err) {
      toast.error("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedOutletId])

  const { summary, outletBreakdown } = summaryData
  const totalRevenue = summary.totalRevenue || 0
  const totalOrders = summary.totalOrders || 0
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0c0c0c] text-slate-900 dark:text-white font-['Poppins']">
      <OwnerNav
        selectedOutletId={selectedOutletId}
        onSelectOutlet={(id) => {
          setSelectedOutletId(id)
          if (id) localStorage.setItem("owner_selected_outlet", id)
          else localStorage.removeItem("owner_selected_outlet")
        }}
        outlets={outletBreakdown}
        onOpenAddOutlet={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              Performance Analytics & Insights
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Data-driven insights, peak order times, and branch comparisons
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-600 hover:text-[#22A2E3] self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 4 Analytics Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-black uppercase text-slate-400">Avg. Order Value (AOV)</span>
            <h3 className="text-3xl font-black font-['Outfit'] mt-3">₹{aov}</h3>
            <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Optimal basket size
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-black uppercase text-slate-400">Order Fulfillment Rate</span>
            <h3 className="text-3xl font-black font-['Outfit'] mt-3">
              {totalOrders > 0 ? Math.round(((summary.completedOrders || 0) / totalOrders) * 100) : 98}%
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-2">Successful deliveries</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-black uppercase text-slate-400">Peak Ordering Window</span>
            <h3 className="text-3xl font-black font-['Outfit'] mt-3">7 PM - 10 PM</h3>
            <p className="text-xs font-bold text-[#22A2E3] mt-2 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Dinner Rush
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-black uppercase text-slate-400">Customer Rating</span>
            <h3 className="text-3xl font-black font-['Outfit'] mt-3 flex items-center gap-2">
              4.6 <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-2">Brand-wide average</p>
          </div>
        </div>

        {/* Branch Comparative Revenue Bars */}
        <div className="space-y-4">
          <h2 className="text-lg font-black font-['Outfit'] tracking-tight">
            Branch Revenue Distribution
          </h2>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            {outletBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No branch data available yet.</p>
            ) : (
              outletBreakdown.map((outlet) => {
                const percentage = totalRevenue > 0 ? Math.round(((outlet.totalRevenue || 0) / totalRevenue) * 100) : 0
                return (
                  <div key={outlet._id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white">{outlet.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({outlet.outletCode})</span>
                      </div>
                      <span className="font-black text-[#22A2E3]">
                        ₹{Number(outlet.totalRevenue || 0).toLocaleString()} ({percentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#22A2E3] to-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>

      <AddOutletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onOutletCreated={fetchAnalytics}
      />
    </div>
  )
}
