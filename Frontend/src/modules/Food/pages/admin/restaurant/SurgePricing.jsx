import { useState, useEffect, useMemo } from "react"
import { 
  Flame, RefreshCw, Zap, TrendingUp, Users, ShoppingBag, 
  Settings, Sliders, ShieldCheck, CheckCircle2, AlertTriangle, 
  Building2, Search, Plus, Edit, Info
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

export default function SurgePricing() {
  const [activeTab, setActiveTab] = useState("snapshots") // 'snapshots' | 'configs'
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snapshots, setSnapshots] = useState([])
  const [configs, setConfigs] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [searchQuery, setSearchQuery] = useState("")

  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [formData, setFormData] = useState({
    restaurantId: null,
    enabled: true,
    lowThresholdRatio: "1.2",
    highThresholdRatio: "3.0",
    baseSurgeAmount: "10",
    maxSurgeAmount: "50",
    smoothingAlpha: "0.3",
    riderSurgeSharePercent: "80",
    radiusKm: "10"
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [snapRes, cfgRes, restRes] = await Promise.allSettled([
        adminAPI.getActiveSurgeSnapshots(),
        adminAPI.getSurgeConfigs(),
        adminAPI.getApprovedRestaurants()
      ])

      if (snapRes.status === "fulfilled" && snapRes.value?.data?.success) {
        setSnapshots(snapRes.value.data.data || [])
      }
      if (cfgRes.status === "fulfilled" && cfgRes.value?.data?.success) {
        setConfigs(cfgRes.value.data.data || [])
      }
      if (restRes.status === "fulfilled" && restRes.value?.data?.success) {
        setRestaurants(restRes.value.data.data?.restaurants || restRes.value.data.data || [])
      }
    } catch (error) {
      toast.error("Failed to load surge pricing data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRecalculate = async () => {
    try {
      setRecalculating(true)
      await adminAPI.triggerSurgeRecalculation()
      toast.success("Surge recalculation triggered for all active restaurants!")
      await fetchData()
    } catch (error) {
      toast.error("Failed to recalculate surge pricing")
    } finally {
      setRecalculating(false)
    }
  }

  const globalConfig = useMemo(() => {
    return configs.find(c => !c.restaurantId) || {
      enabled: true,
      lowThresholdRatio: 1.2,
      highThresholdRatio: 3.0,
      baseSurgeAmount: 10,
      maxSurgeAmount: 50,
      smoothingAlpha: 0.3,
      riderSurgeSharePercent: 80,
      radiusKm: 10
    }
  }, [configs])

  const openGlobalConfigModal = () => {
    setSelectedRestaurant(null)
    setFormData({
      restaurantId: null,
      enabled: globalConfig.enabled !== false,
      lowThresholdRatio: String(globalConfig.lowThresholdRatio ?? 1.2),
      highThresholdRatio: String(globalConfig.highThresholdRatio ?? 3.0),
      baseSurgeAmount: String(globalConfig.baseSurgeAmount ?? 10),
      maxSurgeAmount: String(globalConfig.maxSurgeAmount ?? 50),
      smoothingAlpha: String(globalConfig.smoothingAlpha ?? 0.3),
      riderSurgeSharePercent: String(globalConfig.riderSurgeSharePercent ?? 80),
      radiusKm: String(globalConfig.radiusKm ?? 10)
    })
    setIsConfigOpen(true)
  }

  const openRestaurantConfigModal = (restaurant) => {
    const existing = configs.find(c => String(c.restaurantId?._id || c.restaurantId) === String(restaurant._id))
    setSelectedRestaurant(restaurant)
    setFormData({
      restaurantId: restaurant._id,
      enabled: existing ? existing.enabled !== false : true,
      lowThresholdRatio: String(existing?.lowThresholdRatio ?? globalConfig.lowThresholdRatio ?? 1.2),
      highThresholdRatio: String(existing?.highThresholdRatio ?? globalConfig.highThresholdRatio ?? 3.0),
      baseSurgeAmount: String(existing?.baseSurgeAmount ?? globalConfig.baseSurgeAmount ?? 10),
      maxSurgeAmount: String(existing?.maxSurgeAmount ?? globalConfig.maxSurgeAmount ?? 50),
      smoothingAlpha: String(existing?.smoothingAlpha ?? globalConfig.smoothingAlpha ?? 0.3),
      riderSurgeSharePercent: String(existing?.riderSurgeSharePercent ?? globalConfig.riderSurgeSharePercent ?? 80),
      radiusKm: String(existing?.radiusKm ?? globalConfig.radiusKm ?? 10)
    })
    setIsConfigOpen(true)
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)
      const payload = {
        restaurantId: formData.restaurantId,
        enabled: Boolean(formData.enabled),
        lowThresholdRatio: parseFloat(formData.lowThresholdRatio),
        highThresholdRatio: parseFloat(formData.highThresholdRatio),
        baseSurgeAmount: parseFloat(formData.baseSurgeAmount),
        maxSurgeAmount: parseFloat(formData.maxSurgeAmount),
        smoothingAlpha: parseFloat(formData.smoothingAlpha),
        riderSurgeSharePercent: parseFloat(formData.riderSurgeSharePercent),
        radiusKm: parseFloat(formData.radiusKm)
      }

      await adminAPI.upsertSurgeConfig(payload)
      toast.success(selectedRestaurant ? `Surge config saved for ${selectedRestaurant.name}` : "Global surge config saved")
      setIsConfigOpen(false)
      await fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save surge config")
    } finally {
      setSaving(false)
    }
  }

  const filteredSnapshots = useMemo(() => {
    if (!searchQuery.trim()) return snapshots
    const q = searchQuery.toLowerCase().trim()
    return snapshots.filter(s => 
      s.restaurantId?.restaurantName?.toLowerCase().includes(q) ||
      s.restaurantId?.ownerName?.toLowerCase().includes(q)
    )
  }, [snapshots, searchQuery])

  const surgingCount = snapshots.filter(s => s.surgeAmount > 0).length
  const maxSurge = snapshots.reduce((max, s) => Math.max(max, s.surgeAmount || 0), 0)
  const avgRatio = snapshots.length 
    ? (snapshots.reduce((sum, s) => sum + (s.demandSupplyRatio || 0), 0) / snapshots.length).toFixed(1)
    : "0.0"

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shadow-orange-500/20">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Dynamic Surge Pricing</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Auto 5-Min Cron Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Demand vs Supply algorithm • Auto-adds surge to customer delivery fee & passes rider bonus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openGlobalConfigModal}
              className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              Global Settings
            </button>
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md shadow-orange-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${recalculating ? "animate-spin" : ""}`} />
              Recalculate Now
            </button>
          </div>
        </div>

        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Surging Outlets</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{surgingCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Out of {snapshots.length} active snapshots</p>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Active Surge</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{maxSurge}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Max surge applied to delivery fee</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Demand / Supply Ratio</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgRatio}x</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Pending Orders / Online Riders</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 pt-4 flex items-center gap-6">
            <button
              onClick={() => setActiveTab("snapshots")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "snapshots"
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Flame className="w-4 h-4" />
              Live Heatmap & Snapshots ({snapshots.length})
            </button>
            <button
              onClick={() => setActiveTab("configs")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "configs"
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Restaurant Thresholds & Configs ({restaurants.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search restaurant by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Tab 1: Live Snapshots Table */}
          {activeTab === "snapshots" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-3.5">Restaurant</th>
                    <th className="px-6 py-3.5">Demand (Orders)</th>
                    <th className="px-6 py-3.5">Supply (Riders)</th>
                    <th className="px-6 py-3.5">Demand/Supply Ratio</th>
                    <th className="px-6 py-3.5">Raw Surge</th>
                    <th className="px-6 py-3.5">Smoothed Surge Fee</th>
                    <th className="px-6 py-3.5 text-right">Valid Until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredSnapshots.map((item) => {
                    const isSurging = item.surgeAmount > 0
                    return (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>{item.restaurantId?.restaurantName || "Unknown Outlet"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {item.pendingOrdersCount} pending
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                            <Users className="w-3.5 h-3.5" />
                            {item.availableRidersCount} online
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.demandSupplyRatio >= 3.0 ? "bg-red-100 text-red-700" :
                            item.demandSupplyRatio >= 1.2 ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {item.demandSupplyRatio}x ratio
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                          ₹{item.rawSurgeAmount}
                        </td>
                        <td className="px-6 py-4">
                          {isSurging ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                              <Zap className="w-3.5 h-3.5 text-orange-600" />
                              +₹{item.surgeAmount}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">₹0 (Normal)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">
                          {item.validUntil ? new Date(item.validUntil).toLocaleTimeString() : "-"}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredSnapshots.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                        No active surge snapshots available. Click "Recalculate Now" to generate snapshot values.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Restaurant Config List */}
          {activeTab === "configs" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-3.5">Restaurant</th>
                    <th className="px-6 py-3.5">Threshold Ratios</th>
                    <th className="px-6 py-3.5">Surge Amounts (Min - Max)</th>
                    <th className="px-6 py-3.5">Rider Share</th>
                    <th className="px-6 py-3.5">Smoothing (Alpha)</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {restaurants
                    .filter(r => !searchQuery.trim() || r.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((restaurant) => {
                      const cfg = configs.find(c => String(c.restaurantId?._id || c.restaurantId) === String(restaurant._id))
                      const isCustom = !!cfg
                      const activeConfig = cfg || globalConfig

                      return (
                        <tr key={restaurant._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            <div>
                              <p className="font-semibold text-slate-900">{restaurant.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block ${
                                isCustom ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                              }`}>
                                {isCustom ? "Custom Rule" : "Global Default"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-700">
                            {activeConfig.lowThresholdRatio}x to {activeConfig.highThresholdRatio}x
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            ₹{activeConfig.baseSurgeAmount} – ₹{activeConfig.maxSurgeAmount}
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium">
                            {activeConfig.riderSurgeSharePercent}%
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                            {activeConfig.smoothingAlpha}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              activeConfig.enabled !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {activeConfig.enabled !== false ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openRestaurantConfigModal(restaurant)}
                              className="px-3 py-1 rounded-md text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
                            >
                              Configure
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Config Dialog Modal */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-orange-600" />
              {selectedRestaurant ? `Surge Config — ${selectedRestaurant.name}` : "Global Surge Configuration"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p>
                Surge is calculated automatically backend-side based on demand vs supply. The fee is combined into deliveryFee without showing a separate surge label to customers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Low Ratio Threshold (Demand/Supply)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.lowThresholdRatio}
                  onChange={(e) => setFormData(prev => ({ ...prev, lowThresholdRatio: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. 1.2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">High Ratio Threshold (Max Surge)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.highThresholdRatio}
                  onChange={(e) => setFormData(prev => ({ ...prev, highThresholdRatio: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. 3.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Surge Amount (₹)</label>
                <input
                  type="number"
                  value={formData.baseSurgeAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseSurgeAmount: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. 10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Surge Amount (₹)</label>
                <input
                  type="number"
                  value={formData.maxSurgeAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxSurgeAmount: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rider Surge Bonus Share (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.riderSurgeSharePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, riderSurgeSharePercent: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. 80"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supply Radius (km)</label>
                <input
                  type="number"
                  value={formData.radiusKm}
                  onChange={(e) => setFormData(prev => ({ ...prev, radiusKm: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Smoothing Factor Alpha (0.1 - 1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="1.0"
                value={formData.smoothingAlpha}
                onChange={(e) => setFormData(prev => ({ ...prev, smoothingAlpha: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. 0.3"
              />
              <p className="text-[11px] text-slate-400 mt-1">Lower values mean smoother transitions and less sudden jumps.</p>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setIsConfigOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
