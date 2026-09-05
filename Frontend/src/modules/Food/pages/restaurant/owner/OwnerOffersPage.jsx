import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Tag, 
  Ticket, 
  Percent, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Store, 
  ChevronRight, 
  ExternalLink, 
  Sparkles, 
  MapPin, 
  Users, 
  ArrowUpRight,
  Info,
  X,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI, restaurantAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"

export default function OwnerOffersPage() {
  const [loading, setLoading] = useState(true)
  const [selectedOutletId, setSelectedOutletId] = useState(() => localStorage.getItem("owner_selected_outlet") || null)
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Data states
  const [promocodes, setPromocodes] = useState([])
  const [locationCoupons, setLocationCoupons] = useState([])
  const [outlets, setOutlets] = useState([])
  const [restaurantData, setRestaurantData] = useState(null)

  // Filters & search
  const [activeTab, setActiveTab] = useState("promos") // "promos" | "location"
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // "all" | "active" | "inactive" | "expired"
  const [typeFilter, setTypeFilter] = useState("all") // "all" | "PERCENTAGE" | "FLAT"
  const [copiedCode, setCopiedCode] = useState(null)

  // New Promocode Form
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    expiryDate: "",
    usageLimit: "",
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
      const [outletsRes, promosRes, locCouponsRes, currentRestRes] = await Promise.allSettled([
        ownerAPI.getOutlets(),
        restaurantAPI.getPromocodes(),
        restaurantAPI.getLocationCoupons(),
        restaurantAPI.getCurrentRestaurant(),
      ])

      if (outletsRes.status === "fulfilled") {
        const list = outletsRes.value?.data?.data?.outlets || outletsRes.value?.data?.outlets || []
        setOutlets(list)
      }

      if (promosRes.status === "fulfilled") {
        const list = promosRes.value?.data?.data?.promocodeList || promosRes.value?.data?.promocodeList || []
        setPromocodes(list)
      }

      if (locCouponsRes.status === "fulfilled") {
        const list = locCouponsRes.value?.data?.data || locCouponsRes.value?.data || []
        setLocationCoupons(Array.isArray(list) ? list : [])
      }

      if (currentRestRes.status === "fulfilled") {
        const rest = currentRestRes.value?.data?.data?.restaurant || currentRestRes.value?.data?.restaurant
        if (rest) setRestaurantData(rest)
      }
    } catch (err) {
      console.error("Error loading offers data:", err)
      toast.error("Failed to load offers and promocodes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedOutletId])

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Coupon code "${code}" copied to clipboard!`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await restaurantAPI.togglePromocodeStatus(id, !currentStatus)
      toast.success(currentStatus ? "Offer paused" : "Offer activated")
      // Update locally
      setPromocodes(prev => prev.map(p => p._id === id ? { ...p, isActive: !currentStatus } : p))
    } catch (err) {
      toast.error("Failed to update offer status")
    }
  }

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete promo code "${code}"?`)) return
    try {
      await restaurantAPI.deletePromocode(id)
      toast.success(`Promo code "${code}" deleted successfully`)
      setPromocodes(prev => prev.filter(p => p._id !== id))
    } catch (err) {
      toast.error("Failed to delete promo code")
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!formData.code || !formData.description || !formData.discountValue || !formData.expiryDate) {
      toast.error("Please fill in all mandatory fields")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        expiryDate: new Date(formData.expiryDate).toISOString(),
      }

      if (formData.discountType === "PERCENTAGE" && formData.maxDiscountAmount) {
        payload.maxDiscountAmount = Number(formData.maxDiscountAmount)
      }

      if (formData.usageLimit) {
        payload.usageLimit = Number(formData.usageLimit)
      }

      const res = await restaurantAPI.createPromocode(payload)
      const newPromo = res?.data?.data?.promocode || res?.data?.promocode
      if (newPromo) {
        setPromocodes(prev => [newPromo, ...prev])
      } else {
        await fetchData()
      }

      toast.success(`Offer code "${payload.code}" created successfully!`)
      setIsCreateModalOpen(false)
      setFormData({
        code: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        minOrderAmount: "",
        maxDiscountAmount: "",
        expiryDate: "",
        usageLimit: "",
      })
    } catch (err) {
      console.error("Create promo error:", err)
      toast.error(err?.response?.data?.message || "Failed to create promo code")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered promocodes
  const filteredPromocodes = useMemo(() => {
    const now = new Date().getTime()
    return promocodes.filter(promo => {
      const matchesSearch = 
        promo.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const isExpired = new Date(promo.expiryDate).getTime() < now
      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "active" ? (promo.isActive && !isExpired) :
        statusFilter === "inactive" ? (!promo.isActive && !isExpired) :
        statusFilter === "expired" ? isExpired : true

      const matchesType = typeFilter === "all" || promo.discountType === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [promocodes, searchQuery, statusFilter, typeFilter])

  // Filtered location coupons
  const filteredLocationCoupons = useMemo(() => {
    return locationCoupons.filter(c => {
      return (
        c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [locationCoupons, searchQuery])

  // KPI Calculations
  const activePromosCount = promocodes.filter(p => p.isActive && new Date(p.expiryDate).getTime() >= Date.now()).length
  const maxDiscountValue = promocodes
    .filter(p => p.isActive && p.discountType === "PERCENTAGE")
    .reduce((max, p) => Math.max(max, p.discountValue || 0), 0)
  const totalRedemptions = promocodes.reduce((sum, p) => sum + (p.usageCount || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0c0c0c] text-slate-900 dark:text-white font-['Poppins']">
      <OwnerNav
        selectedOutletId={selectedOutletId}
        onSelectOutlet={handleSelectOutlet}
        outlets={outlets}
        restaurantData={restaurantData}
        onOpenAddOutlet={() => setIsAddOutletOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#22A2E3]/15 via-blue-500/5 to-transparent p-6 rounded-3xl border border-[#22A2E3]/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-wider text-[#22A2E3]">
                Marketing & Promotions Control
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              Offers & Discount Management
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Create and manage customer discount promo codes and monitor geo-targeted location coupons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/food/restaurant"
              className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#22A2E3] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Return to Restaurant POS / Live Orders"
            >
              <Store className="w-4 h-4 text-[#22A2E3]" />
              <span className="hidden sm:inline">Outlet POS</span>
            </Link>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#22A2E3] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
              title="Refresh Offers"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Promo Code</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-[#22A2E3]/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Active Offers</span>
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-[#22A2E3] flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black font-['Outfit'] tracking-tight">
              {activePromosCount} <span className="text-xs font-bold text-slate-400">/ {promocodes.length} Total</span>
            </h3>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span>● Live & redeemable right now</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Max Active Discount</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black font-['Outfit'] tracking-tight">
              {maxDiscountValue > 0 ? `${maxDiscountValue}% OFF` : "None"}
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Synced to restaurant customer profile
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Location Coupons</span>
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black font-['Outfit'] tracking-tight">
              {locationCoupons.length}
            </h3>
            <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
              Admin geo-targeted discount zones
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Uses</span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black font-['Outfit'] tracking-tight">
              {totalRedemptions}
            </h3>
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
              Customer redemptions recorded
            </p>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("promos")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "promos"
                  ? "bg-[#22A2E3] text-white shadow-md shadow-[#22A2E3]/20"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Promo Codes ({promocodes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("location")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "location"
                  ? "bg-[#22A2E3] text-white shadow-md shadow-[#22A2E3]/20"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Location Coupons ({locationCoupons.length})</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code or description..."
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {activeTab === "promos" && (
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Disabled</option>
                  <option value="expired">Expired</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat (₹)</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: PROMO CODES */}
        {activeTab === "promos" && (
          <div>
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#22A2E3] mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Loading promo codes...</p>
              </div>
            ) : filteredPromocodes.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto text-[#22A2E3]">
                  <Ticket className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                      ? "No matching promo codes found"
                      : "No promo codes created yet"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                      ? "Try adjusting your search keywords or filter criteria."
                      : "Create custom discount codes for customers to apply at checkout."}
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Your First Promo Code</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPromocodes.map((promo) => {
                  const isExpired = new Date(promo.expiryDate).getTime() < Date.now()
                  const isLive = promo.isActive && !isExpired
                  const expiryFormatted = new Date(promo.expiryDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })

                  return (
                    <div
                      key={promo._id}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-[#22A2E3]/40 transition-all flex flex-col justify-between relative overflow-hidden group"
                    >
                      {/* Top Bar Strip */}
                      <div className={`h-1.5 absolute top-0 left-0 right-0 ${isLive ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : isExpired ? 'bg-slate-300 dark:bg-slate-700' : 'bg-amber-400'}`} />

                      <div>
                        {/* Header Badge & Code */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm sm:text-base font-black px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl tracking-wider text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                {promo.code}
                                <button
                                  type="button"
                                  onClick={() => handleCopy(promo.code)}
                                  className="text-slate-400 hover:text-[#22A2E3] transition-colors"
                                  title="Copy Code"
                                >
                                  {copiedCode === promo.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {promo.description}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              isLive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : isExpired
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : isExpired ? 'bg-rose-500' : 'bg-amber-500'}`} />
                              <span>{isLive ? "Active" : isExpired ? "Expired" : "Paused"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Discount Banner Strip */}
                        <div className="my-3 p-3 bg-gradient-to-r from-blue-50/80 to-sky-50/50 dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-[#22A2E3]">Customer Benefit</span>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">
                              {promo.discountType === "PERCENTAGE" ? `${promo.discountValue}% OFF` : `₹${promo.discountValue} FLAT OFF`}
                            </h4>
                          </div>
                          {promo.maxDiscountAmount && promo.discountType === "PERCENTAGE" && (
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Max Cap</span>
                              <p className="text-xs font-black text-slate-700 dark:text-slate-300">Up to ₹{promo.maxDiscountAmount}</p>
                            </div>
                          )}
                        </div>

                        {/* Conditions List */}
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Min Order Amount:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {promo.minOrderAmount > 0 ? `₹${promo.minOrderAmount}` : "No Minimum"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Usage Recorded:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {promo.usageCount || 0} {promo.usageLimit ? `/ ${promo.usageLimit} uses` : "uses (Unlimited)"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Valid Until:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#22A2E3]" />
                              {expiryFormatted}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(promo._id, promo.isActive)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              promo.isActive
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {promo.isActive ? "Pause Offer" : "Activate"}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(promo._id, promo.code)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                          title="Delete Offer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOCATION COUPONS */}
        {activeTab === "location" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent p-5 rounded-3xl border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-200">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Geo-Targeted Location Coupons
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-2xl">
                    These discounts are configured by Zapoo Platform Admins specifically for your restaurant based on delivery zones to attract nearby customers. The discount is automatically applied for customers ordering within the designated zone.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Loading location coupons...</p>
              </div>
            ) : filteredLocationCoupons.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center mx-auto text-purple-600">
                  <MapPin className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black">No Location Coupons Assigned</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  There are currently no active location coupons assigned to your restaurant by Zapoo Administrators.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredLocationCoupons.map((coupon) => (
                  <div
                    key={coupon._id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-black px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-xl uppercase tracking-wider">
                          {coupon.code}
                        </span>
                        <h4 className="text-base font-black mt-2 text-slate-900 dark:text-white">
                          {coupon.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {coupon.description || "Location-based discount offer"}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        coupon.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {coupon.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100/60 dark:border-purple-900/30">
                      <span className="text-[10px] font-black uppercase text-purple-600">Offer Value</span>
                      <p className="text-base font-black text-slate-900 dark:text-white">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}% OFF up to ₹${coupon.maximumDiscount || 0}`
                          : `Flat ₹${coupon.discountValue} OFF`}
                      </p>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Min Order Value:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{coupon.minimumOrderValue || 0}
                        </span>
                      </div>
                      {coupon.validUntil && (
                        <div className="flex justify-between">
                          <span>Valid Until:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {new Date(coupon.validUntil).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE PROMO CODE MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center justify-center">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black font-['Outfit']">Create New Promo Code</h2>
                    <p className="text-xs text-slate-400">Set discount percentage or flat amount for customers</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Promo Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ZAPOO50 or FEAST20"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-black text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Get 20% off on your favourite dishes"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                  />
                </div>

                {/* Discount Type Toggle */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, discountType: "PERCENTAGE" }))}
                      className={`py-2.5 px-4 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                        formData.discountType === "PERCENTAGE"
                          ? "bg-[#22A2E3] text-white border-[#22A2E3] shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>Percentage (%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, discountType: "FLAT" }))}
                      className={`py-2.5 px-4 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                        formData.discountType === "FLAT"
                          ? "bg-[#22A2E3] text-white border-[#22A2E3] shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span>₹ Flat Off</span>
                    </button>
                  </div>
                </div>

                {/* Discount Value & Max Cap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      {formData.discountType === "PERCENTAGE" ? "Discount %" : "Flat Discount (₹)"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={formData.discountType === "PERCENTAGE" ? "100" : "10000"}
                      placeholder={formData.discountType === "PERCENTAGE" ? "20" : "50"}
                      value={formData.discountValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                    />
                  </div>

                  {formData.discountType === "PERCENTAGE" && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                        Max Discount Cap (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 150"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                      />
                    </div>
                  )}
                </div>

                {/* Min Order Value & Usage Limit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Min Order Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 (No minimum)"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, minOrderAmount: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Leave blank for unlimited"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                    />
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Expiry Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Offer...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Publish Promo Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD OUTLET MODAL */}
      <AddOutletModal
        isOpen={isAddOutletOpen}
        onClose={() => setIsAddOutletOpen(false)}
        onOutletCreated={() => {
          fetchData()
          setIsAddOutletOpen(false)
        }}
      />
    </div>
  )
}
