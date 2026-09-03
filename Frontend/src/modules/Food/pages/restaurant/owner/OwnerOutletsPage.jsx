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
  ExternalLink
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

export default function OwnerOutletsPage() {
  const [loading, setLoading] = useState(true)
  const [outlets, setOutlets] = useState([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Modals for individual outlet actions
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
      await ownerAPI.updateOutlet(selectedOutletForEdit._id, editFormData)
      toast.success("Outlet details updated successfully!")
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
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
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
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${outlet.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{outlet.status}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleAccepting(outlet)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-all ${
                        outlet.isAcceptingOrders
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-500 border border-slate-200 dark:border-slate-700"
                      }`}
                      title="Toggle Accepting Orders"
                    >
                      {outlet.isAcceptingOrders ? "Taking Orders" : "Paused"}
                    </button>
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
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setSelectedOutletForCredentials(outlet)}
                      className="py-2 px-2 bg-[#22A2E3]/10 dark:bg-[#22A2E3]/10 hover:bg-[#22A2E3]/20 text-[#22A2E3] rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 truncate"
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
                      className="py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 truncate"
                      title="Manage Permissions"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Perms</span>
                    </button>

                    <Link
                      to="/food/restaurant/zone-setup"
                      className="py-2 px-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1 border border-red-200/60 dark:border-red-900/40 truncate"
                      title="Pin Outlet on Map & Setup Zone"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span className="truncate">Map Pin</span>
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
                          status: outlet.status,
                          isAcceptingOrders: outlet.isAcceptingOrders,
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
    </div>
  )
}
