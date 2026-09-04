import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import { ArrowLeft, ChevronUp, ChevronDown, Clock, Edit2, Store, Building2, Check, RefreshCw } from "lucide-react"
import { Switch } from "@food/components/ui/switch"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import dayjs from "dayjs"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { restaurantAPI, ownerAPI } from "@food/api"
import { getCurrentUser } from "@food/utils/auth"
import { toast } from "sonner"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

// Helper function to convert "HH:mm" string to Date object
const stringToTime = (timeString) => {
  if (!timeString || typeof timeString !== "string" || !timeString.includes(":")) {
    return dayjs().hour(9).minute(0)
  }
  const [hours, minutes] = timeString.split(":").map(Number)
  const validH = Number.isFinite(hours) && hours >= 0 && hours <= 23 ? hours : 9
  const validM = Number.isFinite(minutes) && minutes >= 0 && minutes <= 59 ? minutes : 0
  return dayjs().hour(validH).minute(validM)
}

// Helper function to convert Date object to "HH:mm" string
const timeToString = (date) => {
  if (!date) return "09:00"
  if (typeof date === "string") return date
  if (!dayjs.isDayjs(date) || !date.isValid()) {
    return "09:00"
  }
  return date.format("HH:mm")
}

// Format time from 24-hour to 12-hour format for display
const formatTime12Hour = (time) => {
  if (!time) return "09:00 AM"
  const str = String(time).trim()
  if (/am|pm/i.test(str)) {
    return str.replace(/:\d{2}\s/i, " ").toUpperCase()
  }
  const parts = str.split(":")
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (isNaN(hours)) return str
  const period = hours >= 12 ? "PM" : "AM"
  const hours12 = hours % 12 || 12
  const minutesStr = isNaN(minutes) ? "00" : String(minutes).padStart(2, "0")
  return `${hours12}:${minutesStr} ${period}`
}

const getDefaultDays = () => ({
  Monday: { isOpen: true, openingTime: "09:00", closingTime: "23:00" },
  Tuesday: { isOpen: true, openingTime: "09:00", closingTime: "23:00" },
  Wednesday: { isOpen: true, openingTime: "09:00", closingTime: "23:00" },
  Thursday: { isOpen: true, openingTime: "09:00", closingTime: "23:00" },
  Friday: { isOpen: true, openingTime: "09:00", closingTime: "23:00" },
  Saturday: { isOpen: true, openingTime: "09:00", closingTime: "23:00" },
  Sunday: { isOpen: true, openingTime: "09:00", closingTime: "23:00" }
})

export default function OutletTimings() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlOutletId = searchParams.get("outletId")

  const user = getCurrentUser("restaurant")
  const isOwner = user && (user.role === "OWNER" || user.isOwner || (!user.outletId && user.role !== "OUTLETER"))

  const [expandedDay, setExpandedDay] = useState("Monday")
  const isInternalUpdate = useRef(false)
  const [days, setDays] = useState(getDefaultDays)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")
  const saveTimerRef = useRef(null)

  // Multi-outlet state
  const [outlets, setOutlets] = useState([])
  const [selectedTargetId, setSelectedTargetId] = useState(
    urlOutletId || (user?.outletId ? String(user.outletId) : "main")
  )
  const [restaurantData, setRestaurantData] = useState(null)

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  // Fetch Outlets for Multi-Outlet Owners
  const fetchOutlets = async () => {
    if (!isOwner) return
    try {
      const res = await ownerAPI.getOutlets()
      const data = res?.data?.data || res?.data
      const list = Array.isArray(data?.outlets) ? data.outlets : Array.isArray(data) ? data : []
      setOutlets(list)
    } catch (err) {
      console.warn("Could not load outlets for timings:", err)
    }
  }

  // Fetch Restaurant Profile
  const fetchRestaurantProfile = async () => {
    try {
      const res = await restaurantAPI.getCurrentRestaurant()
      const rest = res?.data?.data?.restaurant || res?.data?.restaurant
      if (rest) setRestaurantData(rest)
    } catch (err) {
      console.warn("Error loading restaurant profile:", err)
    }
  }

  // Load timings for currently selected target (main or outlet)
  const loadTimingsForTarget = useCallback(async (targetId, currentOutlets = outlets) => {
    try {
      setLoading(true)
      isInternalUpdate.current = false

      if (targetId === "main") {
        const res = await restaurantAPI.getOutletTimings()
        const outletTimings = res?.data?.data?.outletTimings || res?.data?.outletTimings
        if (outletTimings && typeof outletTimings === "object") {
          setDays({ ...getDefaultDays(), ...outletTimings })
        } else {
          setDays(getDefaultDays())
        }
      } else {
        const targetOutlet = currentOutlets.find((o) => String(o._id) === String(targetId))
        if (targetOutlet) {
          if (targetOutlet.outletTimings && typeof targetOutlet.outletTimings === "object") {
            setDays({ ...getDefaultDays(), ...targetOutlet.outletTimings })
          } else if (targetOutlet.timings?.schedule && typeof targetOutlet.timings.schedule === "object") {
            setDays({ ...getDefaultDays(), ...targetOutlet.timings.schedule })
          } else {
            // Build schedule from outlet's general timings
            const oTime = targetOutlet.timings?.openTime || "09:00"
            const cTime = targetOutlet.timings?.closeTime || "23:00"
            const oDays = (targetOutlet.timings?.openDays || [
              "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
            ]).map((d) => String(d).toLowerCase())

            const converted = {}
            dayNames.forEach((d) => {
              converted[d] = {
                isOpen: oDays.includes(d.toLowerCase()),
                openingTime: oTime,
                closingTime: cTime
              }
            })
            setDays(converted)
          }
        }
      }
    } catch (error) {
      debugError("Error loading outlet timings:", error)
    } finally {
      setLoading(false)
    }
  }, [outlets])

  useEffect(() => {
    fetchRestaurantProfile()
    fetchOutlets()
  }, [])

  useEffect(() => {
    loadTimingsForTarget(selectedTargetId)
  }, [selectedTargetId, loadTimingsForTarget])

  // Handle Switching Target Outlet
  const handleSelectTarget = (targetId) => {
    setSelectedTargetId(targetId)
    if (targetId === "main") {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ outletId: targetId }, { replace: true })
    }
  }

  // Active target label
  const activeOutlet = outlets.find((o) => String(o._id) === String(selectedTargetId))
  const activeTargetName = selectedTargetId === "main"
    ? (restaurantData?.name || "Main Restaurant (HQ)")
    : (activeOutlet?.name || "Outlet Branch")

  // Auto-save whenever days change (debounced)
  useEffect(() => {
    if (loading) return
    if (!isInternalUpdate.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (selectedTargetId === "main") {
          await restaurantAPI.saveOutletTimings(days)
        } else {
          // Save outlet timings
          const firstOpenDay = Object.values(days).find((d) => d?.isOpen) || days.Monday || {}
          const openDays = Object.keys(days)
            .filter((d) => days[d]?.isOpen)
            .map((d) => d.toLowerCase())

          await ownerAPI.updateOutlet(selectedTargetId, {
            outletTimings: days,
            timings: {
              openTime: firstOpenDay.openingTime || "09:00",
              closeTime: firstOpenDay.closingTime || "23:00",
              openDays: openDays.length > 0 ? openDays : ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
              schedule: days
            }
          })
        }
        window.dispatchEvent(new Event("outletTimingsUpdated"))
        window.dispatchEvent(new Event("ownerDataUpdated"))
      } catch (error) {
        debugError("Error saving outlet timings to backend:", error)
      }
    }, 600)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [days, loading, selectedTargetId])

  // Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  const toggleDay = (day) => {
    setExpandedDay(expandedDay === day ? null : day)
  }

  const toggleDayOpen = (day) => {
    isInternalUpdate.current = true
    setDays((prev) => {
      const newOpen = !prev[day].isOpen
      return {
        ...prev,
        [day]: {
          ...prev[day],
          isOpen: newOpen,
          openingTime: newOpen ? (prev[day].openingTime || "09:00") : "",
          closingTime: newOpen ? (prev[day].closingTime || "23:00") : ""
        }
      }
    })
  }

  const handleTimeChange = (day, timeType, newTime) => {
    if (!newTime) return

    isInternalUpdate.current = true
    let timeString = ""
    if (typeof newTime === "string") {
      timeString = newTime.trim()
    } else if (dayjs.isDayjs(newTime) && newTime.isValid()) {
      timeString = newTime.format("HH:mm")
    }

    if (!timeString || !timeString.includes(":")) return

    setDays((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeType]: timeString
      }
    }))
  }

  const handleManualSave = async () => {
    try {
      setSaving(true)
      setSavedMessage("")

      if (selectedTargetId === "main") {
        await restaurantAPI.saveOutletTimings(days)
      } else {
        const firstOpenDay = Object.values(days).find((d) => d?.isOpen) || days.Monday || {}
        const openDays = Object.keys(days)
          .filter((d) => days[d]?.isOpen)
          .map((d) => d.toLowerCase())

        await ownerAPI.updateOutlet(selectedTargetId, {
          outletTimings: days,
          timings: {
            openTime: firstOpenDay.openingTime || "09:00",
            closeTime: firstOpenDay.closingTime || "23:00",
            openDays: openDays.length > 0 ? openDays : ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            schedule: days
          }
        })
      }

      window.dispatchEvent(new Event("outletTimingsUpdated"))
      window.dispatchEvent(new Event("ownerDataUpdated"))
      toast.success(`Timings for ${activeTargetName} saved successfully!`)
      setSavedMessage(`Timings for ${activeTargetName} saved successfully!`)
      setTimeout(() => setSavedMessage(""), 3500)
    } catch (error) {
      toast.error("Failed to save outlet timings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (isOwner) {
      navigate("/food/restaurant/owner/outlets")
    } else {
      navigate("/food/restaurant/explore")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-bold text-gray-600 flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading outlet operational timings...</span>
        </div>
      </div>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="min-h-screen bg-slate-50 overflow-x-hidden flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
                <div>
                  <h1 className="text-lg font-black text-gray-900 leading-tight">
                    Outlet Operating Timings
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure daily opening, closing hours and delivery availability
                  </p>
                </div>
              </div>

              {isOwner && (
                <Link
                  to="/food/restaurant/owner/outlets"
                  className="text-xs font-bold text-blue-600 hover:underline hidden sm:inline"
                >
                  Manage Outlets →
                </Link>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Multi-Outlet Switcher Tabs (For Owners with Multiple Outlets) */}
            {isOwner && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Select Outlet Branch to Edit Timings
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {outlets.length + 1} Outlets Available
                  </span>
                </div>

                <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                  {/* Main HQ Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectTarget("main")}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
                      selectedTargetId === "main"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{restaurantData?.name || "Main Restaurant (HQ)"}</span>
                    {selectedTargetId === "main" && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {/* Branch Outlets Buttons */}
                  {outlets.map((outlet) => {
                    const isSelected = String(selectedTargetId) === String(outlet._id)
                    return (
                      <button
                        key={outlet._id}
                        type="button"
                        onClick={() => handleSelectTarget(String(outlet._id))}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${outlet.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span>{outlet.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? "bg-blue-700 text-blue-100" : "bg-slate-200 text-slate-600"
                        }`}>
                          {outlet.outletCode || "OUTLET"}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Currently Editing Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Weekly Timings for: <span className="text-blue-700">{activeTargetName}</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Orders will only be accepted within these specified operational hours
                  </p>
                </div>
              </div>
            </div>

            {/* Day-wise Accordion */}
            <div className="space-y-2.5">
              {dayNames.map((day, index) => {
                const dayData = days[day] || { isOpen: true, openingTime: "09:00", closingTime: "23:00" }
                const isExpanded = expandedDay === day

                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                  >
                    {/* Day Header */}
                    <div
                      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/80 transition-colors ${
                        isExpanded ? "bg-slate-50/90 border-b border-slate-100" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDay(day)}
                          className="flex items-center gap-2 text-left"
                        >
                          <span className="font-black text-sm text-slate-900 min-w-[95px]">
                            {day}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            dayData.isOpen
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {dayData.isOpen ? "Open" : "Closed"}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {dayData.isOpen && (
                          <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                            {formatTime12Hour(dayData.openingTime || "09:00")} - {formatTime12Hour(dayData.closingTime || "23:00")}
                          </span>
                        )}

                        <Switch
                          checked={dayData.isOpen}
                          onCheckedChange={() => toggleDayOpen(day)}
                          aria-label={`Toggle ${day} open status`}
                        />

                        <button
                          type="button"
                          onClick={() => toggleDay(day)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Day Content (Expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-4 bg-white space-y-4">
                            {dayData.isOpen ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Opening Time */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                                      Opening time
                                    </span>
                                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                      {formatTime12Hour(dayData.openingTime || "09:00")}
                                    </span>
                                  </label>
                                  <input
                                    type="time"
                                    value={dayData.openingTime || "09:00"}
                                    onChange={(e) => handleTimeChange(day, "openingTime", e.target.value)}
                                    className="w-full h-10 px-3 py-1.5 text-sm font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                  />
                                </div>

                                {/* Closing Time */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                                      Closing time
                                    </span>
                                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                      {formatTime12Hour(dayData.closingTime || "23:00")}
                                    </span>
                                  </label>
                                  <input
                                    type="time"
                                    value={dayData.closingTime || "23:00"}
                                    onChange={(e) => handleTimeChange(day, "closingTime", e.target.value)}
                                    className="w-full h-10 px-3 py-1.5 text-sm font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-slate-400">
                                This branch is closed on {day}s. Delivery and takeaway will be automatically turned off.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Save Bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-40 mt-6">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-slate-800">
                Operating Schedule for: <span className="text-blue-600 font-extrabold">{activeTargetName}</span>
              </p>
              {savedMessage && (
                <p className="text-xs font-bold text-emerald-600 mt-0.5">
                  ✓ {savedMessage}
                </p>
              )}
            </div>

            <button
              onClick={handleManualSave}
              disabled={saving}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {saving ? "Saving Timings..." : `Confirm & Save Timings for ${activeTargetName}`}
            </button>
          </div>
        </div>
      </div>
    </LocalizationProvider>
  )
}
