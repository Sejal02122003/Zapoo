import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Ticket, 
  Clock, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  Copy, 
  Check, 
  Headphones,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { loadBusinessSettings } from "@food/utils/businessSettings"

export default function ContactSupportModal({ 
  isOpen, 
  onClose, 
  order = null 
}) {
  const navigate = useNavigate()
  const [copiedField, setCopiedField] = useState(null)
  const [contacts, setContacts] = useState({
    supportEmail: "support@zapoo.in",
    supportPhone: "+91 98765 43210",
    whatsappPhone: "+91 98765 43210",
    supportHours: "24/7 Available (Mon - Sun)",
    companyName: "Zapoo"
  })

  useEffect(() => {
    let isMounted = true
    loadBusinessSettings()
      .then((settings) => {
        if (!isMounted || !settings) return
        setContacts({
          supportEmail: settings.supportEmail?.trim() || settings.email?.trim() || "support@zapoo.in",
          supportPhone: settings.supportPhone?.trim() || settings.phone?.trim() || "+91 98765 43210",
          whatsappPhone: settings.whatsappNumber?.trim() || settings.supportPhone?.trim() || settings.phone?.trim() || "+91 98765 43210",
          supportHours: settings.supportHours || "24/7 Available (Mon - Sun)",
          companyName: settings.companyName || "Zapoo"
        })
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  if (!isOpen) return null

  const orderId = order?.order_id || order?.orderId || order?._id || ""
  const restaurantName = order?.restaurant?.restaurantName || order?.restaurantName || ""
  const orderAmount = order?.pricing?.total ?? order?.total ?? ""

  // Prepare mailto link with context
  const mailSubject = encodeURIComponent(
    orderId 
      ? `[Support Request] Issue with Order #${orderId} - ${contacts.companyName}`
      : `[Support Request] Inquiry / Help Needed - ${contacts.companyName}`
  )

  const mailBody = encodeURIComponent(
    orderId
      ? `Hello ${contacts.companyName} Support Team,\n\nI need assistance with my order.\n\n` +
        `• Order ID: #${orderId}\n` +
        (restaurantName ? `• Restaurant: ${restaurantName}\n` : "") +
        (orderAmount ? `• Amount: ₹${orderAmount}\n` : "") +
        `\nIssue Details:\n[Please describe your issue here]\n\nThank you.`
      : `Hello ${contacts.companyName} Support Team,\n\nI need assistance regarding:\n[Please describe your issue here]\n\nThank you.`
  )

  const mailtoUrl = `mailto:${contacts.supportEmail}?subject=${mailSubject}&body=${mailBody}`

  // Prepare WhatsApp link
  const rawWhatsappNum = contacts.whatsappPhone.replace(/[^0-9]/g, "")
  const whatsappUrl = `https://wa.me/${rawWhatsappNum}?text=${mailSubject}%0A${mailBody}`

  // Prepare phone call link
  const cleanPhone = contacts.supportPhone.replace(/[^0-9+]/g, "")
  const telUrl = `tel:${cleanPhone}`

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    toast.success(`${fieldName} copied to clipboard!`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleCreateTicket = () => {
    onClose()
    navigate("/user/profile/support")
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        {/* Backdrop click */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100 dark:border-zinc-800 my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header Banner */}
          <div className="relative p-5 pb-5 bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-white shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
                <Headphones className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white tracking-tight leading-tight">
                  Official Support & Help
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Connect with our executive officials directly
                </p>
              </div>
            </div>

            {/* SLA Badge */}
            <div className="mt-3.5 flex items-center justify-between bg-black/15 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 text-xs">
              <span className="flex items-center gap-1.5 text-white/95 font-medium">
                <Clock className="w-3.5 h-3.5 text-green-300" />
                {contacts.supportHours}
              </span>
              <span className="flex items-center gap-1 text-green-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Fast Resolution
              </span>
            </div>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {/* Order Context Card if present */}
            {orderId && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                      Order #{orderId}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      {restaurantName || "Order Query"} {orderAmount ? `• ₹${orderAmount}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0 ml-2">
                  Attached
                </span>
              </div>
            )}

            {/* 1. Phone Call */}
            <div className="group border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                      Call Support Helpline
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                      {contacts.supportPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(contacts.supportPhone, "Phone")}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
                    title="Copy phone"
                  >
                    {copiedField === "Phone" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={telUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Email Support */}
            <div className="group border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                      Email Official Desk
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium break-all mt-0.5 line-clamp-1">
                      {contacts.supportEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(contacts.supportEmail, "Email")}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
                    title="Copy email"
                  >
                    {copiedField === "Email" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={mailtoUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Mail
                  </a>
                </div>
              </div>
            </div>

            {/* 3. WhatsApp Chat */}
            <div className="group border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                      WhatsApp Support
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                      Direct WhatsApp chat with officials
                    </p>
                  </div>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Chat
                </a>
              </div>
            </div>

            {/* 4. Raise In-App Ticket */}
            <button
              type="button"
              onClick={handleCreateTicket}
              className="w-full border border-dashed border-primary/40 rounded-2xl p-3 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-primary leading-tight">
                    Raise an In-App Ticket
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    Track status & complaints in real-time
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary shrink-0 ml-2" />
            </button>
          </div>

          {/* Footer note */}
          <div className="p-3.5 text-center bg-slate-50/80 dark:bg-zinc-900/80 border-t border-slate-100 dark:border-zinc-800 shrink-0">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              ⚡ Typical response time: <span className="font-semibold text-slate-700 dark:text-zinc-300">Under 10 minutes</span>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
