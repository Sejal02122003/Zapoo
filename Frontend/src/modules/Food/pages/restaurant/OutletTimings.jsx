import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import { ArrowLeft, ChevronUp, ChevronDown, Clock, Edit2 } from "lucide-react"
import { Switch } from "@food/components/ui/switch"
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import dayjs from "dayjs"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { restaurantAPI } from "@food/api"
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
const formatTime12Hour = (time24) => {
  if (!time24) return "09:00 AM"
  const [hours, minutes] = time24.split(":").map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "09:00 AM"
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  const minutesStr = minutes.toString().padStart(2, '0')
  return `${hours12}:${minutesStr} ${period}`
}

const getDefaultDays = () => ({
  Monday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Tuesday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Wednesday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Thursday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Friday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Saturday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Sunday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" } })

export default function OutletTimings() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [expandedDay, setExpandedDay] = useState("Monday")
  const isInternalUpdate = useRef(false)
  const [days, setDays] = useState(getDefaultDays)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")
  const saveTimerRef = useRef(null)

  // Load from backend on mount.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await restaurantAPI.getOutletTimings()
        const outletTimings = res?.data?.data?.outletTimings || res?.data?.outletTimings
        if (mounted && outletTimings && typeof outletTimings === "object") {
          setDays({ ...getDefaultDays(), ...outletTimings })
        }
      } catch (error) {
        debugError("Error loading outlet timings from backend:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Save to backend whenever days change (debounced).
  useEffect(() => {
    if (loading) return
    if (!isInternalUpdate.current) return // Only save if the user made a change
    
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await restaurantAPI.saveOutletTimings(days)
        window.dispatchEvent(new Event("outletTimingsUpdated"))
      } catch (error) {
        debugError("Error saving outlet timings to backend:", error)
      }
    }, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [days, loading])

  // Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true })

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
    setDays(prev => {
      const newOpen = !prev[day].isOpen
      return {
        ...prev,
        [day]: {
          ...prev[day],
          isOpen: newOpen,
          openingTime: newOpen ? (prev[day].openingTime || "09:00") : "",
          closingTime: newOpen ? (prev[day].closingTime || "22:00") : ""
        }
      }
    })
  }

  const handleTimeChange = (day, timeType, newTime) => {
    if (!newTime) {
      debugWarn('No time value received in handleTimeChange')
      return
    }
    
    isInternalUpdate.current = true
    let timeString = ""
    if (typeof newTime === "string") {
      timeString = newTime.trim()
    } else if (dayjs.isDayjs(newTime) && newTime.isValid()) {
      timeString = newTime.format("HH:mm")
    }
    
    // Validate time string format
    if (!timeString || !timeString.includes(":")) {
      debugWarn('Invalid time string generated:', timeString)
      return
    }
    
    debugLog(`Time changed for ${day} - ${timeType}: ${timeString}`)
    
    setDays(prev => ({
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
      await restaurantAPI.saveOutletTimings(days)
      window.dispatchEvent(new Event("outletTimingsUpdated"))
      setSavedMessage("Outlet timings saved successfully!")
      setTimeout(() => setSavedMessage(""), 3500)
    } catch (error) {
      alert("Failed to save outlet timings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading outlet timings...</div>
      </div>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="min-h-screen bg-white overflow-x-hidden flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/food/restaurant/explore")}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-6 h-6 text-gray-900" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">Outlet timings</h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 py-6">
            {/* Zapoo delivery Section Header */}
            <div className="mb-6">
              <div className="text-center mb-2">
                <h2 className="text-base font-semibold text-blue-600">{companyName} delivery</h2>
              </div>
              <div className="h-0.5 bg-blue-600"></div>
            </div>

            {/* Day-wise Accordion */}
            <div className="space-y-2">
              {dayNames.map((day, index) => {
                const dayData = days[day] || { isOpen: true, openingTime: "09:00", closingTime: "22:00" }
                const isExpanded = expandedDay === day

                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="bg-white border border-gray-200 rounded-sm overflow-hidden"
                  >
                    {/* Day Header */}
                    <div
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-color transition-all ${isExpanded ? "bg-gray-100" : ""}`}
                    >
                      <button
                        onClick={() => toggleDay(day)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-700" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-700" />
                        )}
                        <span className="text-base font-medium text-gray-900">{day}</span>
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700">{dayData.isOpen ? "Open" : "Close"}</span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={dayData.isOpen}
                            onCheckedChange={() => toggleDayOpen(day)}
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-4 border-t border-gray-100">
                            {dayData.isOpen ? (
                              <>
                                {/* Opening Time */}
                                <div className="space-y-1.5">
                                  <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      Opening time
                                    </span>
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                      {formatTime12Hour(dayData.openingTime || "09:00")}
                                    </span>
                                  </label>
                                  <input
                                    type="time"
                                    value={dayData.openingTime || "09:00"}
                                    onChange={(e) => handleTimeChange(day, "openingTime", e.target.value)}
                                    className="w-full h-10 px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                  />
                                </div>

                                {/* Closing Time */}
                                <div className="space-y-1.5">
                                  <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      Closing time
                                    </span>
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                      {formatTime12Hour(dayData.closingTime || "22:00")}
                                    </span>
                                  </label>
                                  <input
                                    type="time"
                                    value={dayData.closingTime || "22:00"}
                                    onChange={(e) => handleTimeChange(day, "closingTime", e.target.value)}
                                    className="w-full h-10 px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                  />
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500 pl-6">This day is closed</p>
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
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40 mt-6">
          {savedMessage && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded text-center">
              {savedMessage}
            </div>
          )}
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? "Saving timings..." : "Save Outlet Timings"}
          </button>
        </div>
      </div>
    </LocalizationProvider>
  )
}


