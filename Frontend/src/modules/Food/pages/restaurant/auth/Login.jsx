import { useEffect, useRef, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ShieldCheck, 
  Utensils, 
  Star, 
  Heart, 
  ArrowRight, 
  Loader2, 
  Store, 
  ShieldQuestion, 
  Key, 
  Smartphone, 
  Building2, 
  Lock, 
  User 
} from "lucide-react"
import { Button } from "@food/components/ui/button"
import { toast } from "sonner"
import { restaurantAPI } from "@food/api"
import { setAuthData as setRestaurantAuthData } from "@food/utils/auth"
import logoNew from "@/assets/restaurant_logo.jpeg"
import loginBg from "@/assets/Restauntrant_bg.jpg"

const DEFAULT_COUNTRY_CODE = "+91"

export default function RestaurantLogin() {
  const navigate = useNavigate()
  const phoneInputRef = useRef(null)
  
  // Login Mode: 'otp' | 'credentials'
  const [loginMode, setLoginMode] = useState("otp")
  
  // OTP Form State
  const [phone, setPhone] = useState(() => sessionStorage.getItem("restaurantLoginPhone") || "")
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  // Credentials Form State
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  })
  const [credLoading, setCredLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("restaurant_accessToken") || localStorage.getItem("restaurantToken")
    if (token) {
      navigate("/food/restaurant", { replace: true })
    }
  }, [navigate])

  const validatePhone = (num) => {
    const digits = num.replace(/\D/g, "")
    if (digits.length !== 10) return false
    return ["6", "7", "8", "9"].includes(digits[0])
  }

  // Handle Send OTP
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault()
    if (!validatePhone(phone)) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)

    const fullPhone = `${DEFAULT_COUNTRY_CODE} ${phone}`.trim()

    try {
      await restaurantAPI.sendOTP(fullPhone, "login")
      const authData = {
        method: "phone",
        phone: fullPhone,
        isSignUp: false,
        module: "restaurant"
      }
      sessionStorage.setItem("restaurantAuthData", JSON.stringify(authData))
      sessionStorage.setItem("restaurantLoginPhone", phone)
      toast.success("Verification code sent!")
      navigate("/food/restaurant/otp")
    } catch (apiErr) {
      const msg = apiErr?.response?.data?.message || apiErr?.message || "Failed to send OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  // Handle Credentials Login (Outlet Branch Staff)
  const handleCredentialsLogin = async (e) => {
    e.preventDefault()
    if (!credentials.username.trim()) {
      toast.error("Username or registered phone is required")
      return
    }
    if (!credentials.password.trim()) {
      toast.error("Password is required")
      return
    }

    setCredLoading(true)
    try {
      let fcmToken = null
      let platform = "web"
      try {
        if (typeof window !== "undefined") {
          fcmToken = localStorage.getItem("fcm_web_registered_token_restaurant") || null
        }
      } catch (e) {}

      const res = await restaurantAPI.loginOutlet(
        credentials.username.trim(),
        credentials.password.trim(),
        fcmToken,
        platform
      )
      const data = res?.data?.data || res?.data

      if (data?.accessToken && data?.user) {
        setRestaurantAuthData("restaurant", data.accessToken, data.user, data.refreshToken)
        window.dispatchEvent(new Event("restaurantAuthChanged"))
        toast.success(`Welcome back, ${data.user.name || "Partner"}!`)

        // Check if role is OWNER vs OUTLETER
        if (data.user.role === "OWNER" || data.user.isOwner) {
          navigate("/food/restaurant/owner", { replace: true })
        } else {
          navigate("/food/restaurant", { replace: true })
        }
      } else {
        toast.error("Authentication failed. Please check credentials.")
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed. Please verify credentials."
      toast.error(msg)
    } finally {
      setCredLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden font-['Poppins']"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark Overlay over the background with signature blue tint */}
      <div className="absolute inset-0 bg-[#0f172a]/70 dark:bg-black/80 backdrop-blur-[3px] z-0" />

      {/* Decorative Lighting Effects */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#22A2E3]/25 via-[#22A2E3]/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#22A2E3]/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Main Content */}
      <div className="absolute top-6 right-6 z-20">
        <Link to="/food/restaurant/profile/support">
          <Button variant="ghost" className="text-white hover:text-[#22A2E3] font-semibold flex items-center gap-2">
            <ShieldQuestion className="w-5 h-5" />
            Support
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-[460px]"
        >
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/20 mx-auto mb-3 bg-white p-1"
            >
              <img 
                src={logoNew} 
                alt="Zapoo Logo" 
                className="w-full h-full object-cover rounded-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-2"
            >
              <span className="text-white font-black text-sm uppercase tracking-[0.25em]">
                RESTAURANT PORTAL
              </span>
              <span className="bg-[#22A2E3] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                Owner & Outlets
              </span>
            </motion.div>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 dark:bg-[#151515]/95 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-2xl border border-white/20 dark:border-slate-800 relative overflow-hidden">
            
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setLoginMode("otp")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === "otp"
                    ? "bg-white dark:bg-slate-900 text-[#22A2E3] shadow-md shadow-[#22A2E3]/10"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Mobile OTP Login</span>
              </button>

              <button
                type="button"
                onClick={() => setLoginMode("credentials")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === "credentials"
                    ? "bg-white dark:bg-slate-900 text-[#22A2E3] shadow-md shadow-[#22A2E3]/10"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Outlet Staff Login</span>
              </button>
            </div>

            {/* TAB 1: Mobile OTP Login */}
            {loginMode === "otp" && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-6 text-center sm:text-left">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 font-['Outfit'] tracking-tight">
                    Partner Mobile Login
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Enter registered mobile number for Owner HQ or Branch Outlet
                  </p>
                </div>

                <form onSubmit={handleSendOTP} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#22A2E3] uppercase tracking-[0.2em] ml-1">
                      Mobile Number
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <span className="text-sm font-bold text-[#22A2E3] border-r border-slate-200 dark:border-slate-700 pr-2.5">+91</span>
                      </div>
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        required
                        autoFocus
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        className="block w-full pl-16 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 focus:border-[#22A2E3] focus:ring-4 focus:ring-[#22A2E3]/10 rounded-2xl outline-none transition-all placeholder:text-slate-300 font-bold text-base shadow-sm"
                        placeholder="00000 00000"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length < 10}
                    className="w-full py-4 bg-[#22A2E3] hover:bg-[#1a85bb] disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-[#22A2E3]/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Outlet Staff Login (Username & Password) */}
            {loginMode === "credentials" && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-6 text-center sm:text-left">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 font-['Outfit'] tracking-tight">
                    Outlet Staff Login
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Sign in with username & password generated by Restaurant Owner
                  </p>
                </div>

                <form onSubmit={handleCredentialsLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#22A2E3] uppercase tracking-[0.2em] ml-1">
                      Outlet Username or Phone
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. indore@zapoo.com or 9876543210"
                        value={credentials.username}
                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 focus:border-[#22A2E3] rounded-2xl outline-none text-xs font-bold font-mono transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#22A2E3] uppercase tracking-[0.2em] ml-1">
                      Outlet Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="Enter outlet password"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 focus:border-[#22A2E3] rounded-2xl outline-none text-xs font-bold transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={credLoading || !credentials.username.trim() || !credentials.password.trim()}
                    className="w-full mt-2 py-4 bg-[#22A2E3] hover:bg-[#1a85bb] disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-[#22A2E3]/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {credLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Outlet POS</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Bottom Registration Prompt */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                New restaurant brand?{" "}
                <Link
                  to="/food/restaurant/signup"
                  className="text-[#22A2E3] font-black hover:underline ml-1"
                >
                  Register as Restaurant Owner →
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[11px] text-white/80 font-medium leading-relaxed max-w-[320px] mx-auto">
              By continuing, you agree to Zapoo's <br />
              <Link to="/food/restaurant/profile/terms" className="text-white font-bold hover:underline">Terms of Service</Link> & <Link to="/food/restaurant/profile/privacy" className="text-white font-bold hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
