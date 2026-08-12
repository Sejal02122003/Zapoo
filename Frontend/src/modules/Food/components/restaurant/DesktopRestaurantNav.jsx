import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { 
  ShoppingBag, 
  Store, 
  Search, 
  Bell, 
  HelpCircle, 
  X, 
  MapPin, 
  Utensils, 
  FileText, 
  LogOut, 
  CalendarCheck
} from "lucide-react"
import WalletIcon from "@food/components/ui/WalletIcon"
import { restaurantAPI } from "@food/api"
import { getCachedSettings, loadBusinessSettings } from "@food/utils/businessSettings"
import useNotificationInbox from "@food/hooks/useNotificationInbox"
import { clearModuleAuth } from "@food/utils/auth"
import restaurantLogo from "@/assets/restaurant_logo.jpeg"

export default function DesktopRestaurantNav() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [restaurantData, setRestaurantData] = useState(null)
  const [status, setStatus] = useState("Offline")
  const [companyName, setCompanyName] = useState("")
  const [logoUrl, setLogoUrl] = useState(null)
  const [searchValue, setSearchValue] = useState("")
  const { unreadCount } = useNotificationInbox("restaurant", { limit: 20, pollMs: 5 * 60 * 1000 })

  // Fetch business settings and restaurant details
  useEffect(() => {
    const loadSettings = async () => {
      const cached = getCachedSettings()
      if (cached) {
        if (cached.companyName) setCompanyName(cached.companyName)
        if (cached.logo?.url) setLogoUrl(cached.logo.url)
      } else {
        const settings = await loadBusinessSettings()
        if (settings) {
          if (settings.companyName) setCompanyName(settings.companyName)
          if (settings.logo?.url) setLogoUrl(settings.logo.url)
        }
      }
    }
    loadSettings()

    const fetchRestaurantData = async () => {
      try {
        const response = await restaurantAPI.getCurrentRestaurant()
        const data = response?.data?.data?.restaurant || response?.data?.restaurant || response?.data?.data
        if (data) {
          setRestaurantData(data)
          const savedStatus = localStorage.getItem('restaurant_online_status')
          if (savedStatus !== null) {
            setStatus(JSON.parse(savedStatus) ? "Online" : "Offline")
          } else {
            setStatus(data.isAcceptingOrders ? "Online" : "Offline")
          }
        }
      } catch (error) {
        // silent fallback
      }
    }
    fetchRestaurantData()

    const handleStatusChange = (event) => {
      const isOnline = event.detail?.isOnline || false
      setStatus(isOnline ? "Online" : "Offline")
    }
    window.addEventListener('restaurantStatusChanged', handleStatusChange)

    return () => {
      window.removeEventListener('restaurantStatusChanged', handleStatusChange)
    }
  }, [])

  const handleStatusToggle = () => {
    navigate("/food/restaurant/status")
  }

  const handleLogout = () => {
    clearModuleAuth("restaurant")
    navigate("/food/restaurant/login")
  }

  const isActive = (path) => {
    if (path === "/food/restaurant") {
      return location.pathname === "/food/restaurant"
    }
    return location.pathname.startsWith(path)
  }

  const restaurantName = restaurantData?.name || "Restaurant Partner"
  const areaName = restaurantData?.location?.area || restaurantData?.location?.city || "Partner Portal"

  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200">
      {/* Top Branding & Main Controls Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          
          {/* Left: Brand / Restaurant Info */}
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/food/restaurant" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <img 
                  src={logoUrl || restaurantLogo} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = restaurantLogo }}
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-black text-slate-900 dark:text-white truncate max-w-[220px] leading-tight">
                  {restaurantName}
                </h1>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate max-w-[180px]">{areaName}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Center: Search & Status Bar */}
          <div className="flex-1 max-w-xl flex items-center gap-4">
            {/* Quick Search */}
            <div className="relative flex-1">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/30 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search orders, dishes, customers..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchValue.trim()) {
                      navigate(`/food/restaurant/orders/all?search=${encodeURIComponent(searchValue.trim())}`)
                    }
                  }}
                  className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                {searchValue && (
                  <button onClick={() => setSearchValue("")} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Live Online/Offline Status Toggle Badge */}
            <button
              onClick={handleStatusToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 border ${
                status === "Online"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${status === "Online" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="tracking-wide uppercase">{status}</span>
            </button>
          </div>

          {/* Right: Notifications & Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Notification Inbox */}
            <Link
              to="/food/restaurant/notifications"
              className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </Link>

            {/* Support */}
            <Link
              to="/food/restaurant/help-centre/support"
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Help & Support"
            >
              <HelpCircle className="w-5 h-5" />
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Links Bar */}
      <div className="bg-slate-50/90 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-8 h-11 overflow-x-auto no-scrollbar">
            <Link
              to="/food/restaurant"
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors py-2 border-b-2 whitespace-nowrap ${
                isActive("/food/restaurant") && !isActive("/food/restaurant/orders/all")
                  ? "text-primary border-primary"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Live Orders</span>
            </Link>

            <Link
              to="/food/restaurant/orders/all"
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors py-2 border-b-2 whitespace-nowrap ${
                isActive("/food/restaurant/orders/all")
                  ? "text-primary border-primary"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Order History</span>
            </Link>

            <Link
              to="/food/restaurant/inventory"
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors py-2 border-b-2 whitespace-nowrap ${
                isActive("/food/restaurant/inventory") || isActive("/food/restaurant/menu-categories")
                  ? "text-primary border-primary"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Menu & Stock</span>
            </Link>

            <Link
              to="/food/restaurant/reservations"
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors py-2 border-b-2 whitespace-nowrap ${
                isActive("/food/restaurant/reservations")
                  ? "text-primary border-primary"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Dining Requests</span>
            </Link>

            <Link
              to="/food/restaurant/hub-finance"
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors py-2 border-b-2 whitespace-nowrap ${
                isActive("/food/restaurant/hub-finance") || isActive("/food/restaurant/finance-details") || isActive("/food/restaurant/withdrawal-history")
                  ? "text-primary border-primary"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <WalletIcon className="w-4 h-4" />
              <span>Finance & Payouts</span>
            </Link>

            <Link
              to="/food/restaurant/explore"
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors py-2 border-b-2 whitespace-nowrap ${
                isActive("/food/restaurant/explore") || isActive("/food/restaurant/outlet-info") || isActive("/food/restaurant/outlet-timings")
                  ? "text-primary border-primary"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Outlet Hub & Settings</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
