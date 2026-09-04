import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  Calendar,
  Sun,
  Hand,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
  Loader2,
  Timer,
  Utensils
} from "lucide-react"

export default function StockTimingModal({
  isOpen,
  onClose,
  item,
  outletProfile = null,
  onApply,
  onTurnInStock,
  isProcessing = false
}) {
  if (!isOpen || !item) return null

  // Derive initial values from item's existing stockRule / outOfStockUntil
  const existingRule = item.stockRule || null
  const existingResumeAt = item.outOfStockUntil || existingRule?.resumeAt || null
  const initialMode = item.stockTimingMode || existingRule?.mode || "specific-time"

  const [selectedOption, setSelectedOption] = useState(
    initialMode === "none" ? "specific-time" : initialMode
  )
  const [durationHours, setDurationHours] = useState(() => {
    if (existingRule?.durationHours) return Number(existingRule.durationHours)
    if (existingResumeAt) {
      const diffHrs = Math.round((new Date(existingResumeAt).getTime() - Date.now()) / (1000 * 60 * 60))
      return Math.max(1, diffHrs)
    }
    return 3
  })

  // Date & Time state for custom picker
  const [customDate, setCustomDate] = useState(() => {
    if (existingResumeAt) {
      const d = new Date(existingResumeAt)
      return d.toISOString().split("T")[0]
    }
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  })

  const [customTime, setCustomTime] = useState(() => {
    if (existingResumeAt) {
      const d = new Date(existingResumeAt)
      let hrs = d.getHours()
      const mins = d.getMinutes().toString().padStart(2, "0")
      const period = hrs >= 12 ? "pm" : "am"
      if (hrs > 12) hrs -= 12
      if (hrs === 0) hrs = 12
      return { hour: String(hrs), minute: mins, period }
    }
    return { hour: "9", minute: "00", period: "am" }
  })

  // Reset state when opening or item changes
  useEffect(() => {
    if (isOpen && item) {
      const mode = item.stockTimingMode || item.stockRule?.mode || "specific-time"
      setSelectedOption(mode === "none" ? "specific-time" : mode)
      
      const resume = item.outOfStockUntil || item.stockRule?.resumeAt
      if (resume) {
        const d = new Date(resume)
        if (!isNaN(d.getTime())) {
          const diffHrs = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60))
          setDurationHours(Math.max(1, diffHrs))
          setCustomDate(d.toISOString().split("T")[0])
          let hrs = d.getHours()
          const mins = d.getMinutes().toString().padStart(2, "0")
          const period = hrs >= 12 ? "pm" : "am"
          if (hrs > 12) hrs -= 12
          if (hrs === 0) hrs = 12
          setCustomTime({ hour: String(hrs), minute: mins, period })
        }
      } else {
        setDurationHours(3)
      }
    }
  }, [isOpen, item])

  // Preset buttons
  const DURATION_PRESETS = [
    { label: "1 hr", hours: 1 },
    { label: "2 hrs", hours: 2 },
    { label: "4 hrs", hours: 4 },
    { label: "6 hrs", hours: 6 },
    { label: "12 hrs", hours: 12 },
    { label: "24 hrs (1 Day)", hours: 24 },
    { label: "48 hrs (2 Days)", hours: 48 },
  ]

  // Calculate projected resumeAt date based on current selection
  const calculatedResumeAt = useMemo(() => {
    const now = new Date()

    if (selectedOption === "manual") {
      return null
    }

    if (selectedOption === "specific-time") {
      const d = new Date(now.getTime() + durationHours * 60 * 60 * 1000)
      return d
    }

    if (selectedOption === "next-business-day") {
      const openTimeStr = outletProfile?.openingTime || outletProfile?.timings?.openTime || "09:00"
      const [hStr, mStr] = openTimeStr.split(":")
      const targetH = parseInt(hStr, 10) || 9
      const targetM = parseInt(mStr, 10) || 0

      const candidate = new Date(now)
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(targetH, targetM, 0, 0)
      return candidate
    }

    if (selectedOption === "custom-date-time") {
      if (!customDate) return null
      const d = new Date(customDate)
      if (isNaN(d.getTime())) return null

      let hrs = parseInt(customTime.hour, 10) || 12
      const mins = parseInt(customTime.minute, 10) || 0
      const period = String(customTime.period || "am").toLowerCase()

      if (period === "pm" && hrs !== 12) hrs += 12
      if (period === "am" && hrs === 12) hrs = 0

      d.setHours(hrs, mins, 0, 0)
      return d
    }

    return null
  }, [selectedOption, durationHours, customDate, customTime, outletProfile])

  // Formatted display helper
  const formattedCalculatedTime = useMemo(() => {
    if (selectedOption === "manual") {
      return "Item will stay OUT OF STOCK until you manually turn it back on."
    }
    if (!calculatedResumeAt || isNaN(calculatedResumeAt.getTime())) {
      return "Please select a valid date and time."
    }

    const now = Date.now()
    const diffMs = calculatedResumeAt.getTime() - now
    let remainingStr = ""
    if (diffMs > 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      if (diffHours > 0) {
        remainingStr = ` (in ~${diffHours}h ${diffMins}m)`
      } else {
        remainingStr = ` (in ~${diffMins} mins)`
      }
    }

    const dateFormatted = calculatedResumeAt.toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })

    return `${dateFormatted}${remainingStr}`
  }, [selectedOption, calculatedResumeAt])

  const handleApply = () => {
    const payload = {
      isAvailable: false,
      stockTimingMode: selectedOption,
      outOfStockUntil: calculatedResumeAt ? calculatedResumeAt.toISOString() : null,
      stockTimingConfig: {
        mode: selectedOption,
        durationHours: selectedOption === "specific-time" ? durationHours : undefined,
        customDate: selectedOption === "custom-date-time" ? customDate : undefined,
        customTime: selectedOption === "custom-date-time" ? customTime : undefined,
        calculatedResumeAt: calculatedResumeAt ? calculatedResumeAt.toISOString() : null
      }
    }

    if (onApply) {
      onApply(payload)
    }
  }

  const isCurrentlyOutOfStock = item.isAvailable === false

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Timer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-['Outfit'] text-slate-900 dark:text-white">
                    Stock & Availability Timing
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Set auto-restock timer for this item
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

            {/* Target Item Card */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Utensils className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {item.category || "Main Menu"} • ₹{item.price}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                  isCurrentlyOutOfStock
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                }`}
              >
                {isCurrentlyOutOfStock ? "Out of Stock" : "In Stock"}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Timing Modes Selection Grid */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                Select Out of Stock Duration
              </label>

              {/* Option 1: Specific Duration (Hours) */}
              <div
                onClick={() => setSelectedOption("specific-time")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedOption === "specific-time"
                    ? "bg-[#22A2E3]/5 border-[#22A2E3] ring-2 ring-[#22A2E3]/20 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        selectedOption === "specific-time"
                          ? "bg-[#22A2E3] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Specific Duration (Hours)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Turn back in stock automatically after set hours
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedOption === "specific-time"
                        ? "border-[#22A2E3] bg-[#22A2E3] text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {selectedOption === "specific-time" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Duration Presets & Stepper */}
                {selectedOption === "specific-time" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3"
                  >
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {DURATION_PRESETS.map((p) => (
                        <button
                          key={p.hours}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDurationHours(p.hours)
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            durationHours === p.hours
                              ? "bg-[#22A2E3] text-white shadow-md shadow-[#22A2E3]/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-between bg-slate-100/80 dark:bg-slate-800/60 p-2.5 rounded-2xl">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Custom Duration:
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDurationHours((h) => Math.max(1, h - 1))
                          }}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-50 active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-black text-slate-900 dark:text-white min-w-[50px] text-center">
                          {durationHours} {durationHours === 1 ? "Hour" : "Hours"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDurationHours((h) => h + 1)
                          }}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-50 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Option 2: Next Business Day */}
              <div
                onClick={() => setSelectedOption("next-business-day")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedOption === "next-business-day"
                    ? "bg-[#22A2E3]/5 border-[#22A2E3] ring-2 ring-[#22A2E3]/20 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        selectedOption === "next-business-day"
                          ? "bg-[#22A2E3] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Next Business Day
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Turn back in stock tomorrow at opening time (
                        {outletProfile?.openingTime || outletProfile?.timings?.openTime || "09:00 AM"}
                        )
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedOption === "next-business-day"
                        ? "border-[#22A2E3] bg-[#22A2E3] text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {selectedOption === "next-business-day" && (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option 3: Custom Date & Time */}
              <div
                onClick={() => setSelectedOption("custom-date-time")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedOption === "custom-date-time"
                    ? "bg-[#22A2E3]/5 border-[#22A2E3] ring-2 ring-[#22A2E3]/20 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        selectedOption === "custom-date-time"
                          ? "bg-[#22A2E3] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Custom Date & Time
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Select a specific calendar date and exact time
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedOption === "custom-date-time"
                        ? "border-[#22A2E3] bg-[#22A2E3] text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {selectedOption === "custom-date-time" && (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                  </div>
                </div>

                {selectedOption === "custom-date-time" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">
                          Resume Date
                        </label>
                        <input
                          type="date"
                          value={customDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">
                          Resume Time
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={customTime.hour}
                            onChange={(e) =>
                              setCustomTime((prev) => ({ ...prev, hour: e.target.value }))
                            }
                            className="w-14 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                            placeholder="HH"
                          />
                          <span className="font-bold">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={customTime.minute}
                            onChange={(e) =>
                              setCustomTime((prev) => ({
                                ...prev,
                                minute: e.target.value.padStart(2, "0")
                              }))
                            }
                            className="w-14 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                            placeholder="MM"
                          />
                          <select
                            value={customTime.period}
                            onChange={(e) =>
                              setCustomTime((prev) => ({ ...prev, period: e.target.value }))
                            }
                            className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22A2E3]"
                          >
                            <option value="am">AM</option>
                            <option value="pm">PM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Option 4: Manual (Until turned back on) */}
              <div
                onClick={() => setSelectedOption("manual")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedOption === "manual"
                    ? "bg-[#22A2E3]/5 border-[#22A2E3] ring-2 ring-[#22A2E3]/20 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        selectedOption === "manual"
                          ? "bg-[#22A2E3] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Hand className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Manual (Until turned back on)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Keep item out of stock indefinitely until turned back in stock manually
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedOption === "manual"
                        ? "border-[#22A2E3] bg-[#22A2E3] text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {selectedOption === "manual" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Schedule Preview Banner */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-black">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Schedule Summary</span>
              </div>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 pl-6">
                {formattedCalculatedTime}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            {isCurrentlyOutOfStock && onTurnInStock ? (
              <button
                type="button"
                onClick={onTurnInStock}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Turn In Stock Now</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#22A2E3]/25 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {isCurrentlyOutOfStock ? "Update Timing Schedule" : "Confirm Out of Stock"}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
