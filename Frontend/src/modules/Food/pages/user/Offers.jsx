import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Star, Clock, ArrowRight, Zap } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Card, CardContent } from "@food/components/ui/card"
import { restaurantAPI } from "@food/api"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { toast } from "sonner"
import { RestaurantGridSkeleton } from "@food/components/ui/loading-skeletons"
import { useDelayedLoading } from "@food/hooks/useDelayedLoading"

// Import banner image
import offerBanner from "../../assets/offerpagebanner.svg"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

export default function Offers() {
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const [dailyDeals, setDailyDeals] = useState([])
  const [bestOffers, setBestOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const showOffersSkeleton = useDelayedLoading(loading)

  // Fetch offers from API
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await restaurantAPI.getPublicOffers()
        const data = response?.data?.data
        
        if (data) {
          setDailyDeals(data.dailyDeals || [])
          setBestOffers(data.bestOffers || [])
        }
      } catch (err) {
        debugError('Error fetching offers:', err)
        debugError('Error details:', err?.response?.data || err?.message)
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load offers'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchOffers()
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Banner Section */}
      <div className="relative w-full overflow-hidden min-h-[25vh] md:min-h-[30vh]">
        {/* Back Button */}
        <button 
          onClick={goBack}
          className="absolute top-4 left-4 md:top-6 md:left-6 z-20 w-10 h-10 md:w-12 md:h-12 bg-gray-800/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-800/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </button>
        
        {/* Banner Image */}
        <div className="absolute inset-0 z-0 bg-blue-50/50">
          <img 
            src={offerBanner} 
            alt="Great Offers" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-8 lg:py-10 space-y-8 md:space-y-12">
        <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
          {/* Loading State */}
          {showOffersSkeleton && <RestaurantGridSkeleton count={4} compact />}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-500 dark:text-red-400 text-center">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
            </div>
          )}

          {/* Offers Sections */}
          {!showOffersSkeleton && !error && (
            <>
              {/* Daily Deals Section */}
              {dailyDeals.length > 0 && (
                <section>
                  <h2 className="text-lg sm:text-xl font-black text-center text-slate-800 dark:text-slate-100 mb-6 uppercase flex items-center justify-center gap-3 sm:gap-4 italic">
                    <span className="h-px bg-slate-200 dark:bg-slate-700 w-8 sm:w-12"></span>
                    DAILY DEALS
                    <span className="h-px bg-slate-200 dark:bg-slate-700 w-8 sm:w-12"></span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {dailyDeals.map((deal) => (
                      <Link 
                        key={deal.id} 
                        to={deal.restaurantId ? `/user/restaurants/${deal.restaurantId}` : '/user'}
                        className="w-full block"
                      >
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative flex flex-col items-center hover:shadow-md transition-shadow group">
                          <div className="w-full h-32 sm:h-40 relative">
                            <img 
                              src={deal.restaurantImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"} 
                              alt={deal.restaurantName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Fade to white at bottom of image */}
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent"></div>
                            
                            {/* Circular Logo */}
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm border border-slate-100 dark:border-slate-800">
                              <img 
                                src={deal.restaurantImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"} 
                                alt={deal.restaurantName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                          </div>
                          
                          <div className="pt-8 pb-5 px-4 text-center w-full flex-grow flex flex-col justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-600 dark:text-slate-400 text-sm mb-1 line-clamp-1">{deal.restaurantName}</h3>
                              <p className="font-black text-slate-800 dark:text-slate-100 text-base sm:text-lg mb-3 line-clamp-1">{deal.dealText}</p>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 uppercase tracking-wide">
                              Order now <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Best Offers Section */}
              {bestOffers.length > 0 && (
                <section>
                  <h2 className="text-lg sm:text-xl font-black text-center text-slate-800 dark:text-slate-100 mb-6 uppercase flex items-center justify-center gap-3 sm:gap-4 italic">
                    <span className="h-px bg-slate-200 dark:bg-slate-700 w-8 sm:w-12"></span>
                    BEST OFFERS FOR YOU
                    <span className="h-px bg-slate-200 dark:bg-slate-700 w-8 sm:w-12"></span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {bestOffers.map((offer) => (
                      <Link 
                        key={offer.id} 
                        to={offer.restaurantId ? `/user/restaurants/${offer.restaurantId}` : '/user'}
                        className="w-full block"
                      >
                        <div className="flex flex-col gap-2 group">
                          {/* Square Image Container */}
                          <div className="relative w-full aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden shadow-sm">
                            <img 
                              src={offer.restaurantImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"} 
                              alt={offer.restaurantName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Dark Overlay Tag at Top Left */}
                            <div className="absolute top-0 left-0 bg-black/80 text-white text-[10px] sm:text-xs font-bold px-2 py-1.5 rounded-br-lg shadow-sm">
                              {offer.title}
                            </div>
                            
                            {/* Rating Tag at Bottom Left */}
                            <div className="absolute bottom-2 left-2 bg-[#1b7c3d] text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" /> {offer.restaurantRating?.toFixed(1) || '0.0'}
                            </div>
                          </div>
                          
                          {/* Info Below Image */}
                          <div className="px-1">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-[15px] leading-tight truncate">
                              {offer.restaurantName}
                            </h3>
                            <div className="flex items-center text-[#1b7c3d] dark:text-[#28a755] text-xs font-semibold gap-1 mt-0.5 sm:mt-1">
                              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> {offer.deliveryTime ? `${offer.deliveryTime} mins` : "Near & Fast"}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {dailyDeals.length === 0 && bestOffers.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No offers available at the moment</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
