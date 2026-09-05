import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { 
  Building2, 
  ShoppingBag, 
  Store, 
  Search, 
  Bell, 
  LogOut, 
  Layers, 
  TrendingUp, 
  Wallet, 
  Plus, 
  ChevronDown, 
  Check, 
  BarChart3, 
  ExternalLink,
  Shield,
  Sparkles,
  ArrowRightLeft,
  MapPin,
  Clock,
  Ticket,
  Tag
} from "lucide-react"
import { clearModuleAuth, getCurrentUser } from "@food/utils/auth"
import { ownerAPI, restaurantAPI } from "@food/api"
import { getOutletTimingDetails } from "@food/pages/restaurant/owner/OwnerOutletsPage"
import restaurantLogo from "@/assets/restaurant_logo.jpeg"

export default function OwnerNav({ selectedOutletId, onSelectOutlet, outlets = [], restaurantData, onOpenAddOutlet }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [user, setUser] = useState(() => getCurrentUser("restaurant"))

  useEffect(() => {
    if (!restaurantData && (!user || !user.name)) {
      restaurantAPI.getCurrentRestaurant()
        .then((res) => {
          const rest = res?.data?.data?.restaurant || res?.data?.restaurant
          if (rest) {
            setUser(rest)
          }
        })
        .catch(() => {})
    }
  }, [restaurantData])

  const handleLogout = () => {
    clearModuleAuth("restaurant")
    navigate("/food/restaurant/login")
  }

  const isActive = (path) => {
    if (path === "/food/restaurant/owner") {
      return location.pathname === "/food/restaurant/owner"
    }
    return location.pathname.startsWith(path)
  }

  const activeName = restaurantData?.name || user?.name || user?.restaurantName || "Zapoo Brand"
  const activeLogo = restaurantData?.logo || user?.logo || null
  const selectedOutlet = outlets.find(o => String(o._id) === String(selectedOutletId))
  const selectedLabel = selectedOutlet ? selectedOutlet.name : "All Outlets"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#111]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Left: Brand / Restaurant Owner Portal Info */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link to="/food/restaurant/owner" className="flex items-center gap-2 sm:gap-3 group min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#22A2E3] to-blue-600 p-0.5 shadow-sm shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] sm:rounded-[14px] flex items-center justify-center overflow-hidden">
                  {activeLogo ? (
                    <img 
                      src={activeLogo} 
                      alt="Brand" 
                      className="w-full h-full object-cover rounded-[10px] sm:rounded-[14px]" 
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#22A2E3]" />
                  )}
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1 className="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-[180px] md:max-w-[240px] leading-tight">
                    {activeName}
                  </h1>
                  <span className="bg-[#22A2E3]/15 text-[#22A2E3] dark:text-[#22A2E3] text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-full tracking-wider border border-[#22A2E3]/30 shrink-0">
                    Owner Hub
                  </span>
                </div>
                <p className="hidden md:block text-[11px] font-bold text-slate-400">
                  Multi-Outlet Central Control
                </p>
              </div>
            </Link>
          </div>

          {/* Center / Right: Switch Outlet Selector & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Switch Outlet Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm transition-all active:scale-95 shrink-0"
              >
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#22A2E3] shrink-0" />
                <span className="truncate max-w-[85px] sm:max-w-[140px] md:max-w-[180px]">
                  <span className="hidden xs:inline">Outlet: </span>
                  <strong className="text-[#22A2E3] dark:text-[#22A2E3]">{selectedLabel}</strong>
                </span>
                <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch Outlet View</p>
                    </div>

                    <button
                      onClick={() => {
                        onSelectOutlet?.(null)
                        setDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-colors ${
                        !selectedOutletId ? "bg-[#22A2E3] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        <div>
                          <p className="leading-tight font-black">All Outlets</p>
                          <p className={`text-[10px] ${!selectedOutletId ? "text-blue-100" : "text-slate-400"}`}>Consolidated Brand View</p>
                          {restaurantData?.timings && (() => {
                            const t = getOutletTimingDetails(restaurantData.timings, restaurantData.outletTimings)
                            return (
                              <p className={`text-[9px] font-bold mt-0.5 ${!selectedOutletId ? "text-blue-100" : "text-[#22A2E3]"}`}>
                                HQ: {t.formattedTiming} ({t.isOpenNow ? "Open" : "Closed"})
                              </p>
                            )
                          })()}
                        </div>
                      </div>
                      {!selectedOutletId && <Check className="w-4 h-4" />}
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {outlets.map((outlet) => {
                        const isSelected = String(outlet._id) === String(selectedOutletId)
                        return (
                          <button
                            key={outlet._id}
                            onClick={() => {
                              onSelectOutlet?.(outlet._id)
                              setDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors ${
                              isSelected ? "bg-[#22A2E3] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${outlet.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <div className="truncate max-w-[180px]">
                                <p className="leading-tight truncate">{outlet.name}</p>
                                <p className={`text-[10px] ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                  {outlet.outletCode || "OUTLET"} • {outlet.address?.city || outlet.city || "Branch"}
                                </p>
                                {(() => {
                                  const t = getOutletTimingDetails(outlet.timings, outlet.outletTimings)
                                  return (
                                    <p className={`text-[9px] font-bold mt-0.5 ${isSelected ? "text-blue-100" : t.isOpenNow ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                      {t.isOpenNow ? "● Open Now" : "○ Closed"} • {t.formattedTiming}
                                    </p>
                                  )
                                })()}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>

                    {onOpenAddOutlet && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setDropdownOpen(false)
                            onOpenAddOutlet()
                          }}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add New Outlet</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick Add Outlet Header Button */}
            {onOpenAddOutlet && (
              <button
                onClick={onOpenAddOutlet}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#22A2E3] hover:bg-[#1a85bb] text-white rounded-xl sm:rounded-2xl text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Add Outlet</span>
              </button>
            )}

            {/* Direct Outlet POS View */}
            <Link
              to="/food/restaurant"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors shrink-0"
              title="Open Single Outlet POS / Live Orders View"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#22A2E3]" />
              <span>Outlet POS</span>
            </Link>

            {/* Notifications */}
            <Link
              to="/food/restaurant/notifications"
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Bar (Responsive Scrollable Tabs) */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/70 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 sm:gap-2 h-11 overflow-x-auto no-scrollbar py-1">
            <Link
              to="/food/restaurant/owner"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive("/food/restaurant/owner") && location.pathname === "/food/restaurant/owner"
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/food/restaurant/owner/outlets"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive("/food/restaurant/owner/outlets")
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Outlets ({outlets.length})</span>
            </Link>

            <Link
              to="/food/restaurant/zone-setup"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                location.pathname === "/food/restaurant/zone-setup"
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Zone Setup & Pin</span>
            </Link>

            <Link
              to="/food/restaurant/outlet-timings"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                location.pathname === "/food/restaurant/outlet-timings"
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Outlet Timings</span>
            </Link>

            <Link
              to="/food/restaurant/owner/orders"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive("/food/restaurant/owner/orders")
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span>Orders</span>
            </Link>

            <Link
              to="/food/restaurant/owner/inventory"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive("/food/restaurant/owner/inventory")
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Inventory</span>
            </Link>

            <Link
              to="/food/restaurant/owner/offers"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive("/food/restaurant/owner/offers")
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <Ticket className="w-3.5 h-3.5 shrink-0" />
              <span>Offers & Promos</span>
            </Link>

            <Link
              to="/food/restaurant/owner/finance"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive("/food/restaurant/owner/finance")
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>Revenue & Profit</span>
            </Link>

            <Link
              to="/food/restaurant/owner/analytics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive("/food/restaurant/owner/analytics")
                  ? "bg-[#22A2E3] text-white shadow-sm shadow-[#22A2E3]/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>Analytics</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
