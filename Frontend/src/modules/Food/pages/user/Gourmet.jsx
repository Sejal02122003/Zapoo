import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Star, Heart, Settings2, ChevronDown, Zap, Sparkles, Utensils, BadgePercent, Clock, Check, X, RotateCcw } from "lucide-react"
import { Button } from "@food/components/ui/button"
import api, { userAPI } from "@food/api"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { toast } from "sonner"
import { API_BASE_URL } from "@food/api/config"
import OptimizedImage from "@food/components/OptimizedImage"
import { RestaurantGridSkeleton } from "@food/components/ui/loading-skeletons"
import { useDelayedLoading } from "@food/hooks/useDelayedLoading"
import { useAppLocation } from "@food/hooks/useAppLocation"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

export default function Gourmet() {
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const [favorites, setFavorites] = useState(new Set())
  const [gourmetRestaurants, setGourmetRestaurants] = useState([])
  const [topOffers, setTopOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filter & Sort States
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)
  const [highRatingOnly, setHighRatingOnly] = useState(false)
  const [vegOnly, setVegOnly] = useState(false)
  const [selectedSort, setSelectedSort] = useState("default")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const activeFilterCount = (fastDeliveryOnly ? 1 : 0) + (highRatingOnly ? 1 : 0) + (vegOnly ? 1 : 0) + (selectedSort !== "default" ? 1 : 0)

  const { zoneId } = useAppLocation()
  const showGourmetSkeleton = useDelayedLoading(loading)

  const backendOrigin = (API_BASE_URL || "").replace(/\/api\/v1\/?$/, "")

  const resolveImageUrl = (url) => {
    if (typeof url !== "string") return ""
    const trimmed = url.trim()
    if (!trimmed) return ""
    if (/^(https?:|\/\/|data:|blob:)/i.test(trimmed)) return trimmed
    if (!backendOrigin) return trimmed
    return `${backendOrigin.replace(/\/$/, "")}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`
  }

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await userAPI.getAvailableCoupons()
        const coupons = res?.data?.data || res?.data || []
        if (Array.isArray(coupons)) {
          setTopOffers(coupons)
        }
      } catch (err) {
        setTopOffers([])
      }
    }
    fetchOffers()
  }, [])

  useEffect(() => {
    const fetchGourmetRestaurants = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get('/food/hero-banners/gourmet/public', {
          params: zoneId ? { zoneId } : {}
        })
        const data = response?.data?.data
        const list = data?.restaurants ?? (Array.isArray(data) ? data : [])
        setGourmetRestaurants(Array.isArray(list) ? list : [])
      } catch (err) {
        debugError('Error fetching Gourmet restaurants:', err)
        setError('Failed to load Gourmet restaurants')
        setGourmetRestaurants([])
      } finally {
        setLoading(false)
      }
    }
    fetchGourmetRestaurants()
  }, [zoneId])

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const filteredAndSortedRestaurants = useMemo(() => {
    let result = [...gourmetRestaurants]

    if (fastDeliveryOnly) {
      result = result.filter((r) => {
        const timeStr = String(r.time || r.deliveryTime || "").toLowerCase()
        return (
          timeStr.includes("15") ||
          timeStr.includes("20") ||
          timeStr.includes("10") ||
          timeStr.includes("fast")
        )
      })
    }

    if (highRatingOnly) {
      result = result.filter((r) => parseFloat(r.rating || r.ratings?.average || 0) >= 4.0)
    }

    if (vegOnly) {
      result = result.filter((r) => {
        const isVeg = r.isVeg || r.veg || String(r.cuisines || "").toLowerCase().includes("veg")
        return Boolean(isVeg)
      })
    }

    if (selectedSort === "rating") {
      result.sort((a, b) => parseFloat(b.rating || b.ratings?.average || 0) - parseFloat(a.rating || a.ratings?.average || 0))
    } else if (selectedSort === "time") {
      result.sort((a, b) => parseInt(a.time || a.deliveryTime || 30) - parseInt(b.time || b.deliveryTime || 30))
    } else if (selectedSort === "cost_low") {
      result.sort((a, b) => parseInt(a.price || a.costForTwo || 0) - parseInt(b.price || b.costForTwo || 0))
    }

    return result
  }, [gourmetRestaurants, fastDeliveryOnly, highRatingOnly, vegOnly, selectedSort])

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white overflow-x-hidden font-sans pb-10 relative">
      
      {/* Custom Keyframes for Luxurious Animations */}
      <style>
        {`
          @keyframes float-slow {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          @keyframes float-slow-reverse {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(-30px, 50px) scale(0.9); }
            66% { transform: translate(20px, -20px) scale(1.1); }
          }
          .animate-lux-float { animation: float-slow 15s ease-in-out infinite; }
          .animate-lux-float-reverse { animation: float-slow-reverse 18s ease-in-out infinite; }
          
          @keyframes text-shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-text-shimmer {
            background-size: 200% auto;
            animation: text-shimmer 4s ease infinite;
          }
        `}
      </style>

      {/* Interactive Global Background Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top Right Orb */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] animate-lux-float" />
        {/* Bottom Left Orb */}
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-amber-600/5 rounded-full blur-[100px] animate-lux-float-reverse" />
      </div>

      {/* Clean Header Section with Food Arch & Background Pattern */}
      <div className="relative w-full pt-12 pb-4 bg-[#0f0f13]/60 backdrop-blur-sm border-b border-white/5 z-10 overflow-hidden">
        
        {/* Intricate Geometric Background Pattern (Matches the luxurious feel) */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.15] mix-blend-overlay pointer-events-none" 
          style={{ 
            backgroundImage: `url("https://www.transparenttextures.com/patterns/arabesque.png")`, 
            backgroundSize: '120px' 
          }} 
        />
        
        {/* Subtle top shadow gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#0f0f13] to-transparent z-0 opacity-80 pointer-events-none" />

        {/* Header-Specific Animated Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg bg-orange-500/15 blur-[100px] rounded-full animate-pulse pointer-events-none z-0" />

        {/* Top Icons */}
        <div className="absolute top-6 left-4 md:left-8 right-4 md:right-8 flex justify-between items-center z-20 pointer-events-none">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 bg-black/20 backdrop-blur-md border border-white/5 pointer-events-auto"
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </button>
          {/* Optional Search Icon placeholder, if they want it like the screenshot */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        {/* 3 Plates Layout */}
        <div className="flex flex-col items-center justify-center px-4 relative z-20 mt-4">
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-6">
            {/* Left Plate (Smaller) */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-orange-900/30">
              <img src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300" alt="Dish 1" className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
            </div>
            
            {/* Center Plate (Larger) */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-amber-600/40 relative z-10 -mt-4">
              <img src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400" alt="Main Dish" className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
            </div>
            
            {/* Right Plate (Smaller) */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-orange-900/30">
              <img src="https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300" alt="Dish 3" className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center gap-2 z-20">
            <Sparkles className="w-5 h-5 text-orange-400 opacity-80 animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-500 to-orange-400 tracking-wide font-medium lowercase animate-text-shimmer leading-normal pb-2">
              gourmet
            </h1>
            <Sparkles className="w-4 h-4 text-orange-400 opacity-60 animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <p className="text-orange-200/80 text-sm md:text-base font-light tracking-wide -mt-2 z-20">
            Curated offers on artisanal flavours
          </p>

          {/* Decorative Divider */}
          <div className="mt-6 flex items-center justify-center opacity-40">
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-amber-500/50" />
            <div className="mx-2 rotate-45 w-2 h-2 border border-amber-500/50" />
            <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </div>
      </div>

      {/* Content Wrapper to ensure it sits above the fixed background orbs */}
      <div className="relative z-10">
        {/* Offers Section - Dynamically rendered from Admin Coupons */}
        {topOffers.length > 0 && (
          <div className="px-4 md:px-8 max-w-2xl mx-auto mt-2">
            <h2 className="text-white/80 text-sm font-bold mb-3 uppercase tracking-wider">Top Offers</h2>
            
            {/* Horizontal Scroll offers */}
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {topOffers.map((coupon, idx) => {
                const isPercent = String(coupon.discountType || "").toUpperCase() === "PERCENTAGE" || String(coupon.type || "").toUpperCase() === "PERCENTAGE";
                const headerText = coupon.code ? coupon.code : (isPercent ? "UPTO" : "FLAT");
                const valueText = isPercent
                  ? `${coupon.discountValue || coupon.discountPercentage || coupon.percentage || 0}% OFF`
                  : `₹${coupon.discountValue || coupon.amount || 0} OFF`;

                return (
                  <div key={coupon._id || coupon.code || idx} className="min-w-[130px] flex-shrink-0 bg-[#1a1a1a]/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-center items-center group cursor-pointer hover:bg-[#222]/90 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all border border-transparent hover:border-orange-500/20">
                    <span className="text-[10px] text-orange-200/50 font-bold tracking-[0.1em] mb-1">{headerText}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-orange-400">{valueText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Filter Chips */}
      <div className="px-4 md:px-8 max-w-2xl mx-auto mb-8 mt-4 sticky top-0 z-30 bg-[#0f0f13]/90 backdrop-blur-xl py-3 -mx-4 md:mx-0 md:px-0 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex overflow-x-auto gap-2.5 scrollbar-hide px-4 md:px-0 relative">
          
          {/* Filter Modal Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white/5 text-gray-200 hover:bg-white/10 transition-all border border-transparent">
            <span>Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Sort By Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                selectedSort !== "default"
                  ? "bg-orange-500/10 border border-orange-500/20 text-orange-100"
                  : "bg-white/5 text-gray-200 hover:bg-white/10 border border-transparent"
              }`}>
              <span>
                {selectedSort === "rating"
                  ? "Sort: Rating"
                  : selectedSort === "time"
                  ? "Sort: Fastest"
                  : selectedSort === "cost_low"
                  ? "Sort: Cost Low"
                  : "Sort by"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
            </button>

            {showSortMenu && (
              <div className="absolute top-11 left-0 z-50 w-48 bg-[#1a1a22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5 text-xs text-gray-200 backdrop-blur-xl">
                <button
                  onClick={() => { setSelectedSort("default"); setShowSortMenu(false); }}
                  className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between">
                  <span>Relevance (Default)</span>
                  {selectedSort === "default" && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
                <button
                  onClick={() => { setSelectedSort("rating"); setShowSortMenu(false); }}
                  className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between">
                  <span>Rating: High to Low</span>
                  {selectedSort === "rating" && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
                <button
                  onClick={() => { setSelectedSort("time"); setShowSortMenu(false); }}
                  className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between">
                  <span>Delivery Time</span>
                  {selectedSort === "time" && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
                <button
                  onClick={() => { setSelectedSort("cost_low"); setShowSortMenu(false); }}
                  className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center justify-between">
                  <span>Cost: Low to High</span>
                  {selectedSort === "cost_low" && <Check className="w-3.5 h-3.5 text-orange-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Fast Delivery (Food in 15 mins) */}
          <button
            onClick={() => setFastDeliveryOnly(!fastDeliveryOnly)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
              fastDeliveryOnly
                ? "bg-orange-500/10 border border-orange-500/20 text-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                : "bg-white/5 text-gray-200 hover:bg-white/10 border border-transparent"
            }`}>
            <Zap className={`w-3.5 h-3.5 ${fastDeliveryOnly ? "text-orange-500 animate-pulse" : "text-orange-400"}`} />
            <span>Food in 15 mins</span>
          </button>

          {/* Rating 4.0+ */}
          <button
            onClick={() => setHighRatingOnly(!highRatingOnly)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
              highRatingOnly
                ? "bg-orange-500/10 border border-orange-500/20 text-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                : "bg-white/5 text-gray-200 hover:bg-white/10 border border-transparent"
            }`}>
            <Star className={`w-3.5 h-3.5 ${highRatingOnly ? "text-amber-400 fill-amber-400" : "text-amber-400"}`} />
            <span>Rating 4.0+</span>
          </button>
        </div>
      </div>

      {/* Main Content - Restaurant List */}
      <div className="px-4 md:px-8 max-w-2xl mx-auto space-y-6">
        {/* Loading State */}
        {showGourmetSkeleton && (
          <div className="space-y-6">
            <RestaurantGridSkeleton count={3} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-400 text-center">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">Retry</Button>
          </div>
        )}

        {/* Restaurant List */}
        {!showGourmetSkeleton && !error && (
          <div className="flex flex-col gap-10 md:gap-12">
            {filteredAndSortedRestaurants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">
                  {gourmetRestaurants.length === 0
                    ? "No Gourmet restaurants available at the moment"
                    : "No restaurants match the selected filters"}
                </p>
              </div>
            ) : (
              filteredAndSortedRestaurants.map((restaurant, index) => {
                const restaurantId = restaurant._id || restaurant.id
                const name = restaurant.name || restaurant.restaurantName || "Gourmet Restaurant"
                const image = resolveImageUrl(restaurant.image || restaurant.coverImage || restaurant.logo || restaurant.profileImage || "")
                const rating = restaurant.rating || restaurant.ratings?.average || restaurant.avgRating || "4.5"
                const reviews = restaurant.reviews || restaurant.ratings?.count || "100+"
                const cuisines = Array.isArray(restaurant.cuisines)
                  ? restaurant.cuisines.join(", ")
                  : (restaurant.cuisines || (Array.isArray(restaurant.cuisineTypes) ? restaurant.cuisineTypes.join(", ") : "Specialty Gourmet"))
                const location = restaurant.location || restaurant.area || restaurant.city || "City Center"
                const distance = restaurant.distance || "2.5 km"
                const price = restaurant.price || restaurant.costForTwo || "400"
                const offer = restaurant.offer || (restaurant.discount ? `${restaurant.discount}% OFF` : "Exclusive Offer")
                const time = restaurant.time || restaurant.deliveryTime || "25-30 MINS"
                const isFavorite = favorites.has(restaurantId)

                return (
                  <div key={restaurantId} className="mb-8">
                    <Link to={`/user/restaurants/${restaurantId}`} className="block group">
                      <div className="flex flex-col gap-3">
                        {/* Clean Image Container */}
                        <div className="relative w-full h-[220px] sm:h-[280px] rounded-2xl overflow-hidden bg-[#1a1a22]">
                          {image ? (
                            <OptimizedImage
                              src={image}
                              alt={name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                              {name}
                            </div>
                          )}

                          {/* Top Right Heart Icon */}
                          <div className="absolute top-4 right-4 z-10">
                            <button
                              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-90 transition-all"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFavorite(restaurantId)
                              }}
                            >
                              <Heart className={`w-4 h-4 ${isFavorite ? "fill-white text-white" : "text-white"}`} strokeWidth={2.5} />
                            </button>
                          </div>
                          
                          {/* Ad tag if needed */}
                          {index === 0 && (
                            <div className="absolute top-4 right-14 z-10 text-[9px] bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-white/90 font-bold">
                              Ad
                            </div>
                          )}

                          {/* Bottom Left Discount Badge */}
                          {offer && (
                            <div className="absolute bottom-3 left-3 z-10 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-white shadow-sm border border-white/5">
                              <BadgePercent className="w-3.5 h-3.5 text-orange-400" strokeWidth={2.5} />
                              <span className="text-xs font-semibold">{offer}</span>
                            </div>
                          )}

                          {/* Bottom Right Time Badge */}
                          <div className="absolute bottom-3 right-3 z-10 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-white shadow-sm border border-white/5">
                            <span className="text-[10px] font-semibold">{time}</span>
                          </div>
                        </div>

                        {/* Details Container - Cleaned up */}
                        <div className="px-1 flex flex-col gap-0.5">
                          {/* Gourmet / Subtitle row */}
                          <div className="flex items-center gap-2 mb-1">
                            {restaurant.bestIn && (
                              <div className="flex items-center gap-1.5 mr-1">
                                <div className="w-3.5 h-3.5 rounded-full bg-orange-500/20 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                </div>
                                <span className="text-[11px] text-gray-300 font-bold">{restaurant.bestIn}</span>
                              </div>
                            )}
                            <span className="text-[#f59e0b] font-serif lowercase text-[16px] font-semibold tracking-normal border-b-[1.5px] border-[#f59e0b]/40 pb-[2px] leading-snug drop-shadow-[0_0_2px_rgba(245,158,11,0.3)]">
                              gourmet
                            </span>
                          </div>

                          {/* Restaurant Name */}
                          <h3 className="text-xl font-bold text-white tracking-tight mt-1 group-hover:text-orange-300 transition-colors">
                            {name}
                          </h3>

                          {/* Details Row */}
                          <div className="flex items-center flex-wrap gap-1.5 text-[13px] text-gray-400 mt-1">
                            <div className="flex items-center gap-1 bg-green-800/80 px-1.5 py-0.5 rounded text-white font-bold text-xs">
                              {rating}
                              <Star className="w-2.5 h-2.5 fill-white" />
                            </div>
                            <span>({reviews})</span>
                            <span className="text-gray-600">•</span>
                            <span>{cuisines}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[13px] text-gray-500 mt-0.5">
                            <span>{location}</span>
                            <span className="text-gray-600">•</span>
                            <span>{distance}</span>
                            <span className="text-gray-600">•</span>
                            <span>₹{price} for two</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      </div>

      {/* Filter Bottom Sheet Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#181820] border-t border-white/10 rounded-t-3xl p-6 text-white shadow-2xl flex flex-col gap-5 animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-bold">Filter & Sort Options</h3>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-1">
              {/* Sort Section */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300">Sort By</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "default", label: "Relevance" },
                    { id: "rating", label: "Rating: High to Low" },
                    { id: "time", label: "Delivery Time" },
                    { id: "cost_low", label: "Cost: Low to High" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedSort(opt.id)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-medium text-left border flex items-center justify-between transition-all ${
                        selectedSort === opt.id
                          ? "bg-orange-500/20 border-orange-500 text-orange-200 font-bold"
                          : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                      }`}>
                      <span>{opt.label}</span>
                      {selectedSort === opt.id && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences Section */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300">Preferences</h4>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setFastDeliveryOnly(!fastDeliveryOnly)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                      fastDeliveryOnly
                        ? "bg-orange-500/20 border-orange-500 text-orange-200 font-bold"
                        : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                    }`}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-400" />
                      <span>Food in 15 mins (Fast Delivery)</span>
                    </div>
                    {fastDeliveryOnly && <Check className="w-4 h-4 text-orange-400" />}
                  </button>

                  <button
                    onClick={() => setHighRatingOnly(!highRatingOnly)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                      highRatingOnly
                        ? "bg-amber-500/20 border-amber-500 text-amber-200 font-bold"
                        : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                    }`}>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Rating 4.0+ Stars</span>
                    </div>
                    {highRatingOnly && <Check className="w-4 h-4 text-amber-400" />}
                  </button>

                  <button
                    onClick={() => setVegOnly(!vegOnly)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                      vegOnly
                        ? "bg-green-500/20 border-green-500 text-green-200 font-bold"
                        : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-green-500 flex items-center justify-center p-0.5 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      </div>
                      <span>Pure Veg Only</span>
                    </div>
                    {vegOnly && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10 mt-1">
              <button
                onClick={() => {
                  setFastDeliveryOnly(false)
                  setHighRatingOnly(false)
                  setVegOnly(false)
                  setSelectedSort("default")
                  toast.info("Filters cleared")
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 transition-all flex items-center justify-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
              <button
                onClick={() => {
                  setIsFilterModalOpen(false)
                  toast.success("Filters applied")
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center">
                <span>Apply Filters ({filteredAndSortedRestaurants.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
