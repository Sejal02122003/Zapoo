import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Megaphone,
  Plus,
  Calendar,
  Globe,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Upload,
  ArrowLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  CreditCard
} from "lucide-react"
import { toast } from "sonner"
import { restaurantAPI } from "@food/api"
import { initRazorpayPayment } from "@food/utils/razorpay"
import BottomNavOrders from "@food/components/restaurant/BottomNavOrders"

export default function Advertise() {
  const navigate = useNavigate()
  const [adRequests, setAdRequests] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // New Request Form State
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState("global")
  const [selectedZone, setSelectedZone] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState("")
  const fileInputRef = useRef(null)

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payingAd, setPayingAd] = useState(null)
  const [swipeProgress, setSwipeProgress] = useState(0)
  const swipeSliderRef = useRef(null)
  const isSwipingRef = useRef(false)
  const swipeStartXRef = useRef(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [reqRes, zoneRes] = await Promise.all([
        restaurantAPI.getAdRequests(),
        restaurantAPI.getZones()
      ])
      if (reqRes.data?.success) {
        setAdRequests(reqRes.data.data)
      }
      if (zoneRes.data?.success) {
        setZones(zoneRes.data.data)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load sponsored campaigns")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setMediaFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !startDate || !endDate) {
      toast.error("Please fill all required fields")
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("description", description)
      formData.append("scope", scope)
      formData.append("startDate", startDate)
      formData.append("endDate", endDate)
      formData.append("mediaType", "image")

      if (scope === "zone" && selectedZone) {
        const zoneObj = zones.find(z => z._id === selectedZone)
        formData.append("zoneId", selectedZone)
        formData.append("zoneName", zoneObj ? zoneObj.name : "")
      }

      const res = await restaurantAPI.createAdRequest(formData)
      if (res.data?.success) {
        toast.success("Ad request submitted successfully")
        setShowCreateModal(false)
        resetForm()
        fetchData()
      }
    } catch (error) {
      console.error("Error creating ad request:", error)
      toast.error(error.response?.data?.message || "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setScope("global")
    setSelectedZone("")
    setStartDate("")
    setEndDate("")
    setMediaFile(null)
    setMediaPreview("")
  }

  // Swipe-to-Pay handlers
  const handleSwipeStart = (clientX) => {
    isSwipingRef.current = true
    swipeStartXRef.current = clientX
  }

  const handleSwipeMove = (clientX) => {
    if (!isSwipingRef.current) return
    const sliderWidth = swipeSliderRef.current?.offsetWidth || 300
    const handleWidth = 56
    const maxTravel = sliderWidth - handleWidth - 16
    const deltaX = Math.max(0, clientX - swipeStartXRef.current)
    setSwipeProgress(Math.min(deltaX / maxTravel, 1))
  };

  const handleSwipeEnd = () => {
    if (!isSwipingRef.current) return
    isSwipingRef.current = false
    if (swipeProgress >= 0.9) {
      triggerPayment()
    } else {
      setSwipeProgress(0)
    }
  }

  const triggerPayment = async () => {
    if (!payingAd) return
    try {
      // 1. Initiate online payment
      const initRes = await restaurantAPI.initiateAdRequestPayment(payingAd._id)
      if (initRes.data?.success) {
        if (initRes.data.isMock) {
          // Fallback to mock pay flow if Razorpay is not configured
          const mockRes = await restaurantAPI.payAdRequest(payingAd._id)
          if (mockRes.data?.success) {
            toast.success("Payment successful! Admin will make your campaign live shortly.")
            setShowPaymentModal(false)
            setPayingAd(null)
            setSwipeProgress(0)
            fetchData()
          }
        } else {
          // Razorpay configured - trigger real Razorpay Checkout modal
          const options = {
            key: initRes.data.key,
            amount: initRes.data.amount,
            currency: initRes.data.currency,
            order_id: initRes.data.orderId,
            name: "Zapoo Sponsored Ads",
            description: `Ad Campaign: ${payingAd.title}`,
            prefill: {
              name: payingAd.restaurantName,
              email: "partner@zapoo.com",
              contact: ""
            },
            notes: initRes.data.notes,
            handler: async (response) => {
              try {
                // Verify signature on backend
                const verifyRes = await restaurantAPI.verifyAdRequestPayment(payingAd._id, {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature
                });
                
                if (verifyRes.data?.success) {
                  toast.success("Online payment successful! Campaign status updated to Paid.")
                  setShowPaymentModal(false)
                  setPayingAd(null)
                  setSwipeProgress(0)
                  fetchData()
                } else {
                  toast.error("Payment verification failed. Please contact support.")
                  setSwipeProgress(0)
                }
              } catch (verifyErr) {
                toast.error("Error verifying payment signature")
                setSwipeProgress(0)
              }
            },
            onError: (err) => {
              toast.error(err.description || "Razorpay payment checkout failed")
              setSwipeProgress(0)
            },
            onClose: () => {
              toast.info("Payment window closed")
              setSwipeProgress(0)
            }
          };
          
          await initRazorpayPayment(options);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment initiation failed. Please try again.")
      setSwipeProgress(0)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending_pricing":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "pending_payment":
        return "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
      case "paid":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "live":
        return "bg-green-50 text-green-700 border-green-200"
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending_pricing":
        return "Pending Pricing"
      case "pending_payment":
        return "Price Set (Awaiting Payment)"
      case "paid":
        return "Paid (Awaiting Verification)"
      case "live":
        return "Campaign Live"
      case "rejected":
        return "Rejected"
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800">
      {/* Navbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/food/restaurant/explore")}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-600" />
              Sponsored Ads
            </h1>
            <p className="text-xs text-slate-500">Promote your outlet to more customers</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Ad
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-3" />
            <p className="text-sm">Loading campaigns...</p>
          </div>
        ) : adRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No Ads Created Yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Promote your restaurant locally in specific delivery zones or globally to reach thousands of active users on Zapoo.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {adRequests.map((ad) => (
              <div
                key={ad._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300"
              >
                <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                    {ad.mediaUrl ? (
                      <img
                        src={ad.mediaUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Megaphone className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(ad.status)}`}>
                        {getStatusLabel(ad.status)}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                        {ad.scope === "global" ? (
                          <>
                            <Globe className="w-3 h-3 text-slate-500" /> Global
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3 h-3 text-slate-500" /> {ad.zoneName || "Zone"}
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm md:text-base leading-tight mb-1">{ad.title}</h3>
                    {ad.description && <p className="text-xs text-slate-500 mb-2">{ad.description}</p>}
                    
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Campaign Price</span>
                    <span className="text-base font-black text-slate-900">
                      {ad.price > 0 ? `₹${ad.price}` : "Awaiting Pricing"}
                    </span>
                  </div>

                  {ad.status === "pending_payment" && (
                    <button
                      onClick={() => {
                        setPayingAd(ad)
                        setShowPaymentModal(true)
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Ad Request Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-orange-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Request sponsored Ad</h3>
                  <p className="text-xs opacity-80">Submit details for admin to evaluate pricing</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Campaign Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Special Weekend discount"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Description</label>
                  <textarea
                    placeholder="Short description / subtitle"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:bg-white transition-all min-h-16"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Start Date *</label>
                    <input
                      type="date"
                      required
                      min={(() => {
                        const now = new Date();
                        const isPast9PM = now.getHours() >= 21;
                        const minDate = new Date();
                        minDate.setDate(now.getDate() + (isPast9PM ? 2 : 1));
                        const offset = minDate.getTimezoneOffset();
                        return new Date(minDate.getTime() - (offset*60*1000)).toISOString().split('T')[0];
                      })()}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">End Date *</label>
                    <input
                      type="date"
                      required
                      min={startDate || (() => {
                        const now = new Date();
                        const isPast9PM = now.getHours() >= 21;
                        const minDate = new Date();
                        minDate.setDate(now.getDate() + (isPast9PM ? 2 : 1));
                        const offset = minDate.getTimezoneOffset();
                        return new Date(minDate.getTime() - (offset*60*1000)).toISOString().split('T')[0];
                      })()}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Ad Scope (Select Target) *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setScope("global")
                        setSelectedZone("")
                      }}
                      className={`flex items-center justify-center gap-2 p-3 border rounded-xl font-semibold text-sm transition-all ${
                        scope === "global"
                          ? "border-orange-600 bg-orange-50 text-orange-700"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Global App
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope("zone")}
                      className={`flex items-center justify-center gap-2 p-3 border rounded-xl font-semibold text-sm transition-all ${
                        scope === "zone"
                          ? "border-orange-600 bg-orange-50 text-orange-700"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      Specific Zone
                    </button>
                  </div>
                </div>

                {scope === "zone" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Select Target Zone *</label>
                    <select
                      required
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    >
                      <option value="">Choose a delivery zone...</option>
                      {zones.map((zone) => (
                        <option key={zone._id} value={zone._id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}



                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-sm flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Swipe to Pay Modal */}
      <AnimatePresence>
        {showPaymentModal && payingAd && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">Confirm Ad Campaign Payment</h3>
                <p className="text-xs text-slate-500">Pay the requested amount to launch campaign</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Campaign Title:</span>
                  <span className="font-semibold text-slate-800">{payingAd.title}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Scope Target:</span>
                  <span className="font-semibold text-slate-800 capitalize">{payingAd.scope}</span>
                </div>
                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-slate-700">Total Payable:</span>
                  <span className="text-xl font-black text-slate-900">₹{payingAd.price}</span>
                </div>
              </div>

              {/* Swipe Slider */}
              <div
                ref={swipeSliderRef}
                className="relative h-14 bg-slate-100 border border-slate-200 rounded-full p-1.5 select-none overflow-hidden touch-none"
              >
                {/* Background Progress Slider */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-orange-600"
                  style={{ width: `calc(${swipeProgress * 100}% + 28px)` }}
                />

                {/* Centered Instructions text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold text-slate-600 z-10">
                  {swipeProgress > 0.5 ? "Release to confirm pay" : "Swipe right to Pay"}
                </div>

                {/* Handle bar */}
                <div
                  onMouseDown={(e) => handleSwipeStart(e.clientX)}
                  onTouchStart={(e) => handleSwipeStart(e.touches[0].clientX)}
                  onMouseMove={(e) => handleSwipeMove(e.clientX)}
                  onTouchMove={(e) => handleSwipeMove(e.touches[0].clientX)}
                  onMouseUp={handleSwipeEnd}
                  onTouchEnd={handleSwipeEnd}
                  onMouseLeave={handleSwipeEnd}
                  style={{ transform: `translateX(${swipeProgress * 100}%)`, left: "6px" }}
                  className="absolute top-1.5 bottom-1.5 w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-20 transition-transform duration-75"
                >
                  <ChevronRight className="w-5 h-5 text-orange-600" />
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPayingAd(null)
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl mt-4 transition-all text-xs"
              >
                Cancel & Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNavOrders />
    </div>
  )
}
