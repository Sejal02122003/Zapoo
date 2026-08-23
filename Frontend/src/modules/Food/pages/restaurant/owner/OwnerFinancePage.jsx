import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Building2, 
  Store, 
  ArrowUpRight, 
  RefreshCw, 
  FileSpreadsheet, 
  Layers, 
  Calendar,
  Percent,
  CheckCircle2,
  Loader2,
  CreditCard
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"

export default function OwnerFinancePage() {
  const [loading, setLoading] = useState(true)
  const [selectedOutletId, setSelectedOutletId] = useState(() => localStorage.getItem("owner_selected_outlet") || null)
  const [outlets, setOutlets] = useState([])
  const [financeData, setFinanceData] = useState({
    financeSummary: {
      grossSales: 0,
      netProfit: 0,
      platformFeeDeductions: 0,
      taxCollected: 0,
      totalPayoutsReady: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    },
    outletBreakdown: [],
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const fetchFinance = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedOutletId) params.outletId = selectedOutletId
      const res = await ownerAPI.getFinance(params)
      const data = res?.data?.data || res?.data
      if (data) {
        setFinanceData(data)
        setOutlets(data.outletBreakdown || [])
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load financial metrics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinance()
  }, [selectedOutletId])

  const { financeSummary, outletBreakdown } = financeData

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
              Brand Revenue & Profit Hub
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Consolidated financial reports and outlet-wise revenue breakdown
            </p>
          </div>

          <button
            onClick={fetchFinance}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-600 hover:text-[#22A2E3] self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 4 Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase text-slate-400">Total Gross Sales</span>
              <div className="w-10 h-10 rounded-2xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit']">
              ₹{Number(financeSummary.grossSales || 0).toLocaleString()}
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-2">
              From {financeSummary.totalOrders || 0} customer orders
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase text-slate-400">Estimated Net Profit</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400">
              ₹{Number(financeSummary.netProfit || 0).toLocaleString()}
            </h3>
            <p className="text-xs font-bold text-emerald-600 mt-2">
              Approx. 25% Brand Margin
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase text-slate-400">Payout Balance</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-[#22A2E3] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit']">
              ₹{Number(financeSummary.totalPayoutsReady || 0).toLocaleString()}
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-2">
              Settled & available
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase text-slate-400">Platform Fees & Tax</span>
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black font-['Outfit']">
              ₹{Number(financeSummary.totalCommission || 0).toLocaleString()}
            </h3>
            <p className="text-xs font-bold text-purple-600 mt-2">
              Commission + GST deduction
            </p>
          </div>
        </div>

        {/* Outlets Financial Breakdown Table */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black font-['Outfit'] tracking-tight">
              Outlet-Wise Financial Breakdown
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Compare sales volume and earnings per branch
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Outlet Name & Code</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Orders</th>
                    <th className="px-6 py-4 text-right">Gross Sales</th>
                    <th className="px-6 py-4 text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(outletBreakdown || []).map((outlet) => (
                    <tr key={outlet._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-sm">{outlet.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{outlet.outletCode}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {outlet.city} {outlet.area ? `• ${outlet.area}` : ""}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          outlet.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {outlet.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-900 dark:text-white font-black text-sm">
                        {outlet.totalOrders || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-[#22A2E3] text-sm">
                        ₹{Number(outlet.totalRevenue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{Number(outlet.totalProfit || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <AddOutletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onOutletCreated={fetchFinance}
      />
    </div>
  )
}
