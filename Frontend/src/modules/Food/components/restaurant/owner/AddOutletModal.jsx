import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  Store, 
  MapPin, 
  Key, 
  ShieldCheck, 
  Clock, 
  Check, 
  Copy, 
  Loader2, 
  Sparkles,
  Info,
  User
} from "lucide-react"
import { toast } from "sonner"
import { ownerAPI } from "@food/api"

const AVAILABLE_PERMISSIONS = [
  { id: "VIEW_ORDERS", label: "View Orders", desc: "Allow outlet staff to view incoming & past orders", default: true },
  { id: "ACCEPT_ORDERS", label: "Accept Orders", desc: "Allow accepting new customer orders", default: true },
  { id: "REJECT_ORDERS", label: "Reject Orders", desc: "Allow rejecting unavailable orders", default: true },
  { id: "UPDATE_ORDER_STATUS", label: "Update Order Status", desc: "Update orders to Preparing / Ready / Picked Up", default: true },
  { id: "MANAGE_MENU", label: "Manage Menu", desc: "Add/edit items, pricing, and active status", default: true },
  { id: "MANAGE_INVENTORY", label: "Manage Inventory", desc: "Toggle item stock availability & quantity", default: true },
  { id: "VIEW_PAYMENTS", label: "View Payments", desc: "See transaction details & payment modes", default: true },
  { id: "VIEW_REVENUE", label: "View Revenue", desc: "Show sales figures & revenue stats on dashboard", default: false },
  { id: "VIEW_PROFIT", label: "View Profit", desc: "Show profit margins and earnings breakdown", default: false },
  { id: "MANAGE_STAFF", label: "Manage Staff", desc: "Manage outlet staff and shift timers", default: false },
]

export default function AddOutletModal({ isOpen, onClose, onOutletCreated }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [createdResult, setCreatedResult] = useState(null)

  const [formData, setFormData] = useState({
    name: "",
    outletCode: "",
    phone: "",
    email: "",
    managerName: "",
    managerPhone: "",
    addressLine1: "",
    area: "",
    city: "",
    pincode: "",
    username: "",
    password: "",
    pureVeg: false,
    isAcceptingOrders: true,
    isTakeawayEnabled: true,
    openTime: "09:00",
    closeTime: "23:00",
    permissions: AVAILABLE_PERMISSIONS.filter(p => p.default).map(p => p.id),
  })

  if (!isOpen) return null

  const handleNameChange = (e) => {
    const val = e.target.value
    const autoCode = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8) + "01"
    const autoUsername = (val.toLowerCase().replace(/[^a-z0-9]/g, "") || "outlet") + "@zapoo.com"
    const autoPassword = "Zapoo@" + Math.floor(1000 + Math.random() * 9000)

    setFormData(prev => ({
      ...prev,
      name: val,
      outletCode: prev.outletCode || autoCode,
      username: prev.username || autoUsername,
      password: prev.password || autoPassword
    }))
  }

  const togglePermission = (permId) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permId)
      return {
        ...prev,
        permissions: exists 
          ? prev.permissions.filter(id => id !== permId)
          : [...prev.permissions, permId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return toast.error("Outlet Name is required")
    if (!formData.phone.trim()) return toast.error("Outlet Phone is required")
    if (!formData.city.trim()) return toast.error("City is required")

    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        outletCode: formData.outletCode.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || formData.username.trim(),
        managerName: formData.managerName.trim(),
        managerPhone: formData.managerPhone.trim() || formData.phone.trim(),
        address: {
          addressLine1: formData.addressLine1.trim(),
          area: formData.area.trim(),
          city: formData.city.trim(),
          pincode: formData.pincode.trim(),
          formattedAddress: `${formData.addressLine1}, ${formData.area}, ${formData.city} - ${formData.pincode}`,
        },
        username: formData.username.trim(),
        password: formData.password.trim(),
        permissions: formData.permissions,
        pureVeg: formData.pureVeg,
        isAcceptingOrders: formData.isAcceptingOrders !== false,
        isTakeawayEnabled: formData.isTakeawayEnabled !== false,
        timings: {
          openTime: formData.openTime,
          closeTime: formData.closeTime,
          openDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        }
      }

      const res = await ownerAPI.createOutlet(payload)
      const data = res?.data?.data || res?.data
      setCreatedResult({
        outlet: data.outlet,
        credentials: data.generatedCredentials || {
          username: formData.username,
          password: formData.password
        }
      })
      toast.success("Outlet created successfully with login credentials!")
      onOutletCreated?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create outlet")
    } finally {
      setLoading(false)
    }
  }

  const copyCredentials = () => {
    if (!createdResult?.credentials) return
    const text = `Zapoo Outlet Login Credentials:\nUsername: ${createdResult.credentials.username}\nPassword: ${createdResult.credentials.password}\nLogin URL: ${window.location.origin}/food/restaurant/login`
    navigator.clipboard.writeText(text)
    toast.success("Credentials copied to clipboard!")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#22A2E3]/15 via-blue-500/10 to-transparent border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#22A2E3] text-white flex items-center justify-center shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {createdResult ? "Outlet Created Successfully!" : "Add New Branch / Outlet"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {createdResult ? "Share these credentials with the branch manager" : "Configure branch info, credentials, and access permissions"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {createdResult ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {createdResult.outlet?.name}
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Outlet Code: {createdResult.outlet?.outletCode}
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-left space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#22A2E3] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Outlet Login Credentials
                </span>
                <button
                  onClick={copyCredentials}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#22A2E3] flex items-center gap-1 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Username / Email</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 select-all">
                    {createdResult.credentials.username}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Password</p>
                  <p className="text-sm font-black text-[#22A2E3] font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 select-all">
                    {createdResult.credentials.password}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Branch staff can log in using these credentials or via registered phone OTP at the same Restaurant Login screen.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={copyCredentials}
                className="px-6 py-3 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 transition-all flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy & Share Details
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Step Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    step === 1 ? "bg-[#22A2E3] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  1. Outlet Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    step === 2 ? "bg-[#22A2E3] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  2. Login & Credentials
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    step === 3 ? "bg-[#22A2E3] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  3. Access Permissions ({formData.permissions.length})
                </button>
              </div>
            </div>

            {/* Step 1: Outlet Details */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Outlet / Branch Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zapoo Indore - Vijay Nagar"
                      value={formData.name}
                      onChange={handleNameChange}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Outlet Code</label>
                    <input
                      type="text"
                      placeholder="e.g. INDORE001"
                      value={formData.outletCode}
                      onChange={(e) => setFormData({ ...formData, outletCode: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Branch Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Branch Email</label>
                    <input
                      type="email"
                      placeholder="e.g. indore@zapoo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Vijay Nagar"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Indore"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 452010"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Address Line</label>
                  <input
                    type="text"
                    placeholder="e.g. Shop 12, Scheme 54, PU4 Commercial"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                  />
                </div>

                {/* Default Channel Controls */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Initial Channels:</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAcceptingOrders}
                        onChange={(e) => setFormData({ ...formData, isAcceptingOrders: e.target.checked })}
                        className="w-4 h-4 rounded text-[#22A2E3] focus:ring-[#22A2E3]"
                      />
                      <span>Delivery</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isTakeawayEnabled}
                        onChange={(e) => setFormData({ ...formData, isTakeawayEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-[#22A2E3] focus:ring-[#22A2E3]"
                      />
                      <span>Takeaway</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all"
                  >
                    Next: Credentials →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Login Credentials */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                  <Key className="w-5 h-5 text-[#22A2E3] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-blue-900 dark:text-blue-300">Auto-Generated Outlet Login</p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400">
                      The branch staff will use this username and password to log in directly into their outlet dashboard.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Outlet Login Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Outlet Password *</label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-[#22A2E3] font-mono focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Manager Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.managerName}
                      onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400">Manager Mobile</label>
                    <input
                      type="tel"
                      placeholder="Manager phone"
                      value={formData.managerPhone}
                      onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#22A2E3]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all"
                  >
                    Next: Permissions →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Permissions Matrix */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">Select which features this outlet staff can access:</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.permissions.length === AVAILABLE_PERMISSIONS.length) {
                        setFormData({ ...formData, permissions: [] })
                      } else {
                        setFormData({ ...formData, permissions: AVAILABLE_PERMISSIONS.map(p => p.id) })
                      }
                    }}
                    className="text-[11px] font-black text-[#22A2E3] hover:underline"
                  >
                    {formData.permissions.length === AVAILABLE_PERMISSIONS.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = formData.permissions.includes(perm.id)
                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isChecked 
                            ? "bg-blue-50/60 dark:bg-blue-950/20 border-[#22A2E3]/60 dark:border-[#22A2E3]/40 shadow-sm" 
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 rounded text-[#22A2E3] focus:ring-[#22A2E3] cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                            {perm.label}
                          </p>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                            {perm.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/20 transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Create Outlet & Generate Login</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </motion.div>
    </div>
  )
}
