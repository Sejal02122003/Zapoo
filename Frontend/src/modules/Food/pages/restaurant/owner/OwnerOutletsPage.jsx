import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Building2, 
  Store, 
  Search, 
  Plus, 
  Key, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  Power, 
  SlidersHorizontal,
  X,
  Loader2,
  ExternalLink,
  Info,
  ShoppingBag,
  Calendar,
  Sparkles,
  Award,
  Globe,
  CheckCircle2,
  AlertCircle,
  Utensils
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI } from "@food/api"
import OwnerNav from "@food/components/restaurant/owner/OwnerNav"
import AddOutletModal from "@food/components/restaurant/owner/AddOutletModal"

const ALL_PERMISSIONS = [
  { id: "VIEW_ORDERS", label: "View Orders", desc: "Allow viewing incoming and past orders" },
  { id: "ACCEPT_ORDERS", label: "Accept Orders", desc: "Allow accepting new orders" },
  { id: "REJECT_ORDERS", label: "Reject Orders", desc: "Allow rejecting orders" },
  { id: "UPDATE_ORDER_STATUS", label: "Update Order Status", desc: "Update status to Preparing / Ready" },
  { id: "MANAGE_MENU", label: "Manage Menu", desc: "Add/edit items, pricing & categories" },
  { id: "MANAGE_INVENTORY", label: "Manage Inventory", desc: "Toggle stock availability & stock count" },
  { id: "VIEW_PAYMENTS", label: "View Payments", desc: "View transaction details & modes" },
  { id: "VIEW_REVENUE", label: "View Revenue", desc: "Show sales figures & revenue stats" },
  { id: "VIEW_PROFIT", label: "View Profit", desc: "Show profit margins and earnings" },
  { id: "MANAGE_STAFF", label: "Manage Staff", desc: "Manage staff & shift schedules" },
]

export const formatTime12Hour = (time24) => {
  if (!time24) return "09:00 AM"
  const [hours, minutes] = String(time24).split(':').map(Number)
  if (isNaN(hours)) return time24
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  const minutesStr = (minutes || 0).toString().padStart(2, '0')
  return `${hours12}:${minutesStr} ${period}`
}

export const getOutletTimingDetails = (timings) => {
  const openTime = timings?.openTime || "09:00"
  const closeTime = timings?.closeTime || "23:00"
  const openDays = Array.isArray(timings?.openDays) && timings.openDays.length > 0 
    ? timings.openDays 
    : ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  const formattedTiming = `${formatTime12Hour(openTime)} - ${formatTime12Hour(closeTime)}`
  
  // Calculate if currently open
  const now = new Date()
  const currentDayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
  const isDayOpen = openDays.map(d => String(d).toLowerCase()).includes(currentDayName)

  let isOpenNow = false
  if (isDayOpen) {
    const parseMins = (t) => {
      if (!t) return 0
      const [h, m] = String(t).split(":").map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    const openMins = parseMins(openTime)
    const closeMins = parseMins(closeTime)
    const currentMins = now.getHours() * 60 + now.getMinutes()

    if (closeMins > openMins) {
      isOpenNow = currentMins >= openMins && currentMins <= closeMins
    } else {
      isOpenNow = currentMins >= openMins || currentMins <= closeMins
    }
  }

  const openDaysText = openDays.length === 7 
    ? "All 7 Days" 
    : openDays.length === 6 
      ? "6 Days / Week" 
      : `${openDays.length} Days Open`

  return {
    openTime,
    closeTime,
    openDays,
    formattedTiming,
    isOpenNow,
    isDayOpen,
    openDaysText
  }
}

export default function OwnerOutletsPage() {
  const [loading, setLoading] = useState(true)
  const [outlets, setOutlets] = useState([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Modals for individual outlet actions
  const [selectedOutletForInfo, setSelectedOutletForInfo] = useState(null)
  const [selectedOutletForCredentials, setSelectedOutletForCredentials] = useState(null)
  const [selectedOutletForPermissions, setSelectedOutletForPermissions] = useState(null)
  const [selectedOutletForEdit, setSelectedOutletForEdit] = useState(null)

  // Reset Credentials state
  const [newPassword, setNewPassword] = useState("")
  const [credentialLoading, setCredentialLoading] = useState(false)

  // Edit Permissions state
  const [tempPermissions, setTempPermissions] = useState([])
  const [permissionLoading, setPermissionLoading] = useState(false)

  // Edit details state
  const [editFormData, setEditFormData] = useState({})
  const [editLoading, setEditLoading] = useState(false)

  const fetchOutlets = async () => {
    setLoading(true)
    try {
      const res = await ownerAPI.getOutlets({ search, status: statusFilter === "all" ? undefined : statusFilter })
      const data = res?.data?.data || res?.data
      setOutlets(data?.outlets || [])
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load outlets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOutlets()
  }, [search, statusFilter])

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async (outlet) => {
    const newStatus = outlet.status === "active" ? "inactive" : "active"
    try {
      await ownerAPI.updateOutlet(outlet._id, { status: newStatus })
      toast.success(`Outlet is now ${newStatus}`)
      fetchOutlets()
    } catch (err) {
      toast.error("Failed to update status")
    }
  }

  // Handle Toggle Accepting Orders
  const handleToggleAccepting = async (outlet) => {
    const val = !outlet.isAcceptingOrders
    try {
      await ownerAPI.updateOutlet(outlet._id, { isAcceptingOrders: val })
      toast.success(val ? "Branch is now accepting orders" : "Branch is paused from taking orders")
      fetchOutlets()
    } catch (err) {
      toast.error("Failed to update accepting status")
    }
  }

  // Handle Toggle Takeaway Orders
  const handleToggleTakeaway = async (outlet) => {
    const val = outlet.isTakeawayEnabled !== false ? false : true
    try {
      await ownerAPI.updateOutlet(outlet._id, { isTakeawayEnabled: val })
      toast.success(val ? "Takeaway enabled for branch" : "Takeaway disabled for branch")
      fetchOutlets()
    } catch (err) {
      toast.error("Failed to update takeaway status")
    }
  }

  // Reset Credentials submit
  const handleResetCredentials = async (e) => {
    e.preventDefault()
    if (!selectedOutletForCredentials) return
    setCredentialLoading(true)
    try {
      const res = await ownerAPI.resetOutletCredentials(selectedOutletForCredentials._id, {
        password: newPassword.trim() || undefined
      })
      const resData = res?.data?.data || res?.data
      toast.success("Credentials updated successfully!")
      setSelectedOutletForCredentials(prev => ({
        ...prev,
        credentials: {
          ...prev.credentials,
          rawPasswordDisplay: resData.password || newPassword,
          username: resData.username || prev.credentials?.username
        }
      }))
      setNewPassword("")
      fetchOutlets()
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reset credentials")
    } finally {
      setCredentialLoading(false)
    }
  }

  // Save Permissions submit
  const handleSavePermissions = async () => {
    if (!selectedOutletForPermissions) return
    setPermissionLoading(true)
    try {
      await ownerAPI.updateOutlet(selectedOutletForPermissions._id, {
        permissions: tempPermissions
      })
      toast.success("Permissions updated successfully!")
      setSelectedOutletForPermissions(null)
      fetchOutlets()
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save permissions")
    } finally {
      setPermissionLoading(false)
    }
  }

  // Save Edit details submit
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!selectedOutletForEdit) return
    setEditLoading(true)
    try {
      const payload = {
        name: editFormData.name,
        phone: editFormData.phone,
        email: editFormData.email,
        managerName: editFormData.managerName,
        managerPhone: editFormData.managerPhone,
        address: editFormData.address,
        status: editFormData.status,
        isAcceptingOrders: editFormData.isAcceptingOrders !== false,
        isTakeawayEnabled: editFormData.isTakeawayEnabled !== false,
        timings: {
          openTime: editFormData.openTime || "09:00",
          closeTime: editFormData.closeTime || "23:00",
          openDays: editFormData.openDays || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        }
      }
      await ownerAPI.updateOutlet(selectedOutletForEdit._id, payload)
      toast.success("Outlet details & timings updated successfully!")
      setSelectedOutletForEdit(null)
      fetchOutlets()
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save details")
    } finally {
      setEditLoading(false)
    }
  }

  // Delete outlet
  const handleDeleteOutlet = async (outletId) => {
    if (!window.confirm("Are you sure you want to delete this outlet branch?")) return
    try {
      await ownerAPI.deleteOutlet(outletId)
      toast.success("Outlet deleted successfully")
      fetchOutlets()
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete outlet")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0c0c0c] text-slate-900 dark:text-white font-['Poppins']">
      <OwnerNav outlets={outlets} onOpenAddOutlet={() => setIsAddModalOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 space-y-8">
        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              Manage Restaurant Outlets
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Add branches, manage credentials, and configure fine-grained permissions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-3 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Outlet</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by branch name, code, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {["all", "active", "inactive"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black capitalize transition-all ${
                  statusFilter === status
                    ? "bg-[#22A2E3] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#22A2E3]" />
          </div>
        ) : outlets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4">
            <Store className="w-12 h-12 text-[#22A2E3] mx-auto" />
            <div>
              <h3 className="text-base font-black">No outlets found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {search ? "No branches matched your search query." : "Click below to create your first branch."}
              </p>
            </div>
            {!search && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-[#22A2E3] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20"
              >
                + Add Outlet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outlets.map((outlet) => (
              <div
                key={outlet._id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-[#22A2E3]/40 transition-all flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {outlet.outletCode}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(outlet)}
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                          outlet.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        }`}
                        title="Toggle Branch Active/Inactive"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${outlet.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{outlet.status}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Delivery Status Button */}
                      <button
                        onClick={() => handleToggleAccepting(outlet)}
                        className={`text-[10px] font-black px-2 py-1 rounded-xl transition-all ${
                          outlet.isAcceptingOrders
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-500 border border-slate-200 dark:border-slate-700"
                        }`}
                        title="Toggle Delivery Ordering"
                      >
                        {outlet.isAcceptingOrders ? "Delivery ON" : "Delivery OFF"}
                      </button>

                      {/* Takeaway Status Button */}
                      <button
                        onClick={() => handleToggleTakeaway(outlet)}
                        className={`text-[10px] font-black px-2 py-1 rounded-xl transition-all ${
                          outlet.isTakeawayEnabled !== false
                            ? "bg-blue-50 text-blue-700 border border-blue-300 dark:border-blue-800"
                            : "bg-slate-100 text-slate-500 border border-slate-200 dark:border-slate-700"
                        }`}
                        title="Toggle Takeaway Pickup Ordering"
                      >
                        {outlet.isTakeawayEnabled !== false ? "Takeaway ON" : "Takeaway OFF"}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {outlet.name}
                  </h3>

                  <div className="space-y-1.5 mt-3 text-xs text-slate-500 font-semibold">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#22A2E3] shrink-0" />
                      <span className="truncate">
                        {outlet.address?.city || outlet.city || "Indore"} 
                        {outlet.address?.area ? `, ${outlet.address.area}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#22A2E3] shrink-0" />
                      <span>{outlet.phone}</span>
                    </div>

                    {outlet.managerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#22A2E3] shrink-0" />
                        <span>Mgr: {outlet.managerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Operational Timings Banner */}
                  <div className="mt-3.5">
                    {(() => {
                      const timingInfo = getOutletTimingDetails(outlet.timings)
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
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => setSelectedOutletForInfo(outlet)}
                      className="py-2 px-1 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-[#22A2E3] rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 truncate border border-sky-200/60 dark:border-sky-800/40"
                      title="View Full Outlet Info & Timings"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Info</span>
                    </button>

                    <button
                      onClick={() => setSelectedOutletForCredentials(outlet)}
                      className="py-2 px-1 bg-[#22A2E3]/10 dark:bg-[#22A2E3]/10 hover:bg-[#22A2E3]/20 text-[#22A2E3] rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 truncate"
                      title="View Login Credentials"
                    >
                      <Key className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Login</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedOutletForPermissions(outlet)
                        setTempPermissions(outlet.permissions || [])
                      }}
                      className="py-2 px-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 truncate"
                      title="Manage Permissions"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Perms</span>
                    </button>

                    <Link
                      to={`/food/restaurant/zone-setup?outletId=${outlet._id}`}
                      className="py-2 px-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 border border-red-200/60 dark:border-red-900/40 truncate"
                      title="Pin Outlet on Map & Setup Zone"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span className="truncate">Pin</span>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        setSelectedOutletForEdit(outlet)
                        setEditFormData({
                          name: outlet.name,
                          phone: outlet.phone,
                          email: outlet.email,
                          managerName: outlet.managerName,
                          managerPhone: outlet.managerPhone,
                          address: outlet.address || {},
                          status: outlet.status || "active",
                          isAcceptingOrders: outlet.isAcceptingOrders !== false,
                          isTakeawayEnabled: outlet.isTakeawayEnabled !== false,
                          openTime: outlet.timings?.openTime || "09:00",
                          closeTime: outlet.timings?.closeTime || "23:00",
                          openDays: outlet.timings?.openDays || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                        })
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Info</span>
                    </button>

                    <button
                      onClick={() => handleDeleteOutlet(outlet._id)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AddOutletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onOutletCreated={fetchOutlets}
      />

      {selectedOutletForCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#22A2E3]" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedOutletForCredentials.name} Credentials
                </h3>
              </div>
              <button
                onClick={() => setSelectedOutletForCredentials(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Username / Identifier</p>
                <p className="text-xs font-mono font-black text-slate-900 dark:text-white select-all">
                  {selectedOutletForCredentials.credentials?.username || selectedOutletForCredentials.email || selectedOutletForCredentials.phone}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Current Password Display</p>
                <p className="text-xs font-mono font-black text-[#22A2E3] select-all">
                  {selectedOutletForCredentials.credentials?.rawPasswordDisplay || "•••••••• (Encrypted)"}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Registered Phone for OTP</p>
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {selectedOutletForCredentials.phone}
                </p>
              </div>
            </div>

            <form onSubmit={handleResetCredentials} className="space-y-3 pt-2">
              <label className="text-[11px] font-black uppercase text-slate-500">Reset To New Password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-[#22A2E3]"
                />
                <button
                  type="submit"
                  disabled={credentialLoading || !newPassword.trim()}
                  className="px-4 py-2 bg-[#22A2E3] hover:bg-[#1a85bb] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all"
                >
                  {credentialLoading ? "Saving..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOutletForPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#22A2E3]" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Permissions: {selectedOutletForPermissions.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOutletForPermissions(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {ALL_PERMISSIONS.map((perm) => {
                const isChecked = tempPermissions.includes(perm.id)
                return (
                  <div
                    key={perm.id}
                    onClick={() => {
                      setTempPermissions(prev =>
                        prev.includes(perm.id) ? prev.filter(i => i !== perm.id) : [...prev, perm.id]
                      )
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                      isChecked
                        ? "bg-[#22A2E3]/10 dark:bg-[#22A2E3]/10 border-[#22A2E3]/60 dark:border-[#22A2E3]/40"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded text-[#22A2E3]"
                    />
                    <div>
                      <p className="text-xs font-black leading-tight">{perm.label}</p>
                      <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{perm.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOutletForPermissions(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permissionLoading}
                className="px-5 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2"
              >
                {permissionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOutletForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Edit Branch Info
              </h3>
              <button
                onClick={() => setSelectedOutletForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500">Branch Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#22A2E3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500">Branch Phone</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#22A2E3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500">Manager Name</label>
                  <input
                    type="text"
                    value={editFormData.managerName || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, managerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#22A2E3]"
                  />
                </div>
              </div>

              {/* Timings & Working Hours */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#22A2E3]" />
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Operating Timings & Working Hours</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Opening Time</label>
                    <input
                      type="time"
                      value={editFormData.openTime || "09:00"}
                      onChange={(e) => setEditFormData({ ...editFormData, openTime: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Closing Time</label>
                    <input
                      type="time"
                      value={editFormData.closeTime || "23:00"}
                      onChange={(e) => setEditFormData({ ...editFormData, closeTime: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                </div>
              </div>

              {/* Service & Availability Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ordering & Service Controls</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editFormData.isAcceptingOrders !== false}
                      onChange={(e) => setEditFormData({ ...editFormData, isAcceptingOrders: e.target.checked })}
                      className="w-4 h-4 rounded text-[#22A2E3] focus:ring-[#22A2E3]"
                    />
                    <span>Accept Delivery Orders</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editFormData.isTakeawayEnabled !== false}
                      onChange={(e) => setEditFormData({ ...editFormData, isTakeawayEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-[#22A2E3] focus:ring-[#22A2E3]"
                    />
                    <span>Accept Takeaway Pickups</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Branch Status</span>
                  <select
                    value={editFormData.status || "active"}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                  >
                    <option value="active">Active (Open)</option>
                    <option value="inactive">Inactive (Closed)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedOutletForEdit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black transition-all"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Outlet Info Modal */}
      {selectedOutletForInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Banner */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#22A2E3]/15 via-blue-500/10 to-transparent border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#22A2E3] text-white flex items-center justify-center shadow-md">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {selectedOutletForInfo.name}
                    </h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#22A2E3]/15 text-[#22A2E3] font-mono border border-[#22A2E3]/30">
                      {selectedOutletForInfo.outletCode}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Complete Branch Profile & Operational Status
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOutletForInfo(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Ribbon */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5 ${
                  selectedOutletForInfo.status === "active"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedOutletForInfo.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>Branch: {selectedOutletForInfo.status}</span>
                </span>

                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5 ${
                  selectedOutletForInfo.isAcceptingOrders !== false
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-500 border border-slate-200 dark:border-slate-700"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedOutletForInfo.isAcceptingOrders !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>Delivery: {selectedOutletForInfo.isAcceptingOrders !== false ? "ON" : "OFF"}</span>
                </span>

                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5 ${
                  selectedOutletForInfo.isTakeawayEnabled !== false
                    ? "bg-blue-50 text-blue-700 border border-blue-300 dark:border-blue-800"
                    : "bg-slate-100 text-slate-500 border border-slate-200 dark:border-slate-700"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedOutletForInfo.isTakeawayEnabled !== false ? 'bg-[#22A2E3]' : 'bg-slate-400'}`} />
                  <span>Takeaway: {selectedOutletForInfo.isTakeawayEnabled !== false ? "ON" : "OFF"}</span>
                </span>
              </div>

              {(() => {
                const tInfo = getOutletTimingDetails(selectedOutletForInfo.timings)
                return (
                  <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5 ${
                    tInfo.isOpenNow
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-amber-500 text-white shadow-sm"
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{tInfo.isOpenNow ? "Open Right Now" : "Currently Closed"}</span>
                  </span>
                )
              })()}
            </div>

            {/* Modal Body Info Cards */}
            <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
              {/* Section 1: Operating Timings & Schedule */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#22A2E3]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Operating Hours & Weekly Schedule
                    </h4>
                  </div>
                  {(() => {
                    const tInfo = getOutletTimingDetails(selectedOutletForInfo.timings)
                    return (
                      <span className="text-xs font-black text-[#22A2E3]">
                        {tInfo.formattedTiming}
                      </span>
                    )
                  })()}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Opening Time</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {formatTime12Hour(selectedOutletForInfo.timings?.openTime || "09:00")}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">({selectedOutletForInfo.timings?.openTime || "09:00"})</span>
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Closing Time</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {formatTime12Hour(selectedOutletForInfo.timings?.closeTime || "23:00")}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">({selectedOutletForInfo.timings?.closeTime || "23:00"})</span>
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Working Days</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {(() => {
                        const days = selectedOutletForInfo.timings?.openDays || []
                        return days.length === 7 || days.length === 0 ? "7 Days Open" : `${days.length} Days Open`
                      })()}
                    </p>
                  </div>
                </div>

                {/* Open Days Pill Matrix */}
                <div className="pt-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Open Days Schedule:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                      const openDays = selectedOutletForInfo.timings?.openDays || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                      const isOpenOnDay = openDays.map(d => d.toLowerCase()).includes(day.toLowerCase())
                      return (
                        <span
                          key={day}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize flex items-center gap-1 ${
                            isOpenOnDay
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-500"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpenOnDay ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          {day}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Branch Management */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#22A2E3]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Contact & Management Personnel
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Branch Manager</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedOutletForInfo.managerName || "Not Assigned"}
                    </p>
                    {selectedOutletForInfo.managerPhone && (
                      <a 
                        href={`tel:${selectedOutletForInfo.managerPhone}`}
                        className="text-[11px] font-bold text-[#22A2E3] hover:underline flex items-center gap-1 mt-1"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedOutletForInfo.managerPhone}
                      </a>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Branch Official Phone & Email</p>
                    <a 
                      href={`tel:${selectedOutletForInfo.phone}`}
                      className="text-xs font-black text-slate-900 dark:text-white hover:text-[#22A2E3] flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3 h-3 text-[#22A2E3]" />
                      {selectedOutletForInfo.phone}
                    </a>
                    {selectedOutletForInfo.email && (
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedOutletForInfo.email}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Location, Address & Service Zone */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Location & Geo Pinning
                    </h4>
                  </div>
                  <Link
                    to={`/food/restaurant/zone-setup?outletId=${selectedOutletForInfo._id}`}
                    className="text-[11px] font-black text-red-600 hover:underline flex items-center gap-1"
                  >
                    <span>Edit Map Pin</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Address</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedOutletForInfo.address?.formattedAddress || 
                       [selectedOutletForInfo.address?.addressLine1, selectedOutletForInfo.address?.area, selectedOutletForInfo.address?.city, selectedOutletForInfo.address?.pincode].filter(Boolean).join(", ") || 
                       "Indore"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Area</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{selectedOutletForInfo.address?.area || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">City</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{selectedOutletForInfo.address?.city || selectedOutletForInfo.city || "Indore"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pincode</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{selectedOutletForInfo.address?.pincode || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Coordinates</span>
                      <span className="font-mono font-bold text-[#22A2E3] text-[10px]">
                        {selectedOutletForInfo.location?.coordinates 
                          ? `${selectedOutletForInfo.location.coordinates[1]?.toFixed(4)}, ${selectedOutletForInfo.location.coordinates[0]?.toFixed(4)}`
                          : "Pinned in Zone"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Login Credentials & Access Control */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#22A2E3]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Login Credentials & Permissions
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      const temp = selectedOutletForInfo
                      setSelectedOutletForInfo(null)
                      setSelectedOutletForCredentials(temp)
                    }}
                    className="text-[11px] font-black text-[#22A2E3] hover:underline"
                  >
                    Reset Password
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Username / Login ID</p>
                      <p className="text-xs font-mono font-black text-slate-900 dark:text-white mt-0.5 select-all">
                        {selectedOutletForInfo.credentials?.username || selectedOutletForInfo.email || selectedOutletForInfo.phone}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const val = selectedOutletForInfo.credentials?.username || selectedOutletForInfo.email || selectedOutletForInfo.phone
                        navigator.clipboard.writeText(val)
                        toast.success("Username copied!")
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                      title="Copy Username"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Password</p>
                      <p className="text-xs font-mono font-black text-[#22A2E3] mt-0.5 select-all">
                        {selectedOutletForInfo.credentials?.rawPasswordDisplay || "•••••••• (Encrypted)"}
                      </p>
                    </div>
                    {selectedOutletForInfo.credentials?.rawPasswordDisplay && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOutletForInfo.credentials.rawPasswordDisplay)
                          toast.success("Password copied!")
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Assigned Permissions Summary */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      Assigned Permissions ({selectedOutletForInfo.permissions?.length || 0} / {ALL_PERMISSIONS.length}):
                    </p>
                    <button
                      onClick={() => {
                        const temp = selectedOutletForInfo
                        setSelectedOutletForInfo(null)
                        setSelectedOutletForPermissions(temp)
                        setTempPermissions(temp.permissions || [])
                      }}
                      className="text-[10px] font-black text-[#22A2E3] hover:underline"
                    >
                      Configure Perms
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_PERMISSIONS.map((perm) => {
                      const isGranted = (selectedOutletForInfo.permissions || []).includes(perm.id)
                      return (
                        <span
                          key={perm.id}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                            isGranted
                              ? "bg-[#22A2E3]/10 text-[#22A2E3] border border-[#22A2E3]/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-60 line-through"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {perm.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedOutletForInfo(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const temp = selectedOutletForInfo
                    setSelectedOutletForInfo(null)
                    setSelectedOutletForEdit(temp)
                    setEditFormData({
                      name: temp.name,
                      phone: temp.phone,
                      email: temp.email,
                      managerName: temp.managerName,
                      managerPhone: temp.managerPhone,
                      address: temp.address || {},
                      status: temp.status || "active",
                      isAcceptingOrders: temp.isAcceptingOrders !== false,
                      isTakeawayEnabled: temp.isTakeawayEnabled !== false,
                      openTime: temp.timings?.openTime || "09:00",
                      closeTime: temp.timings?.closeTime || "23:00",
                      openDays: temp.timings?.openDays || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                    })
                  }}
                  className="px-5 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Branch Info</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
