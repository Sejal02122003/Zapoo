import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, PhoneCall, Clock, Store } from "lucide-react"
import { restaurantAPI } from "@food/api"
import { useAppLocation } from "@food/hooks/useAppLocation"
import AnimatedPage from "@food/components/user/AnimatedPage"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { Button } from "@food/components/ui/button"
import fssaiLogo from "@food/assets/fssai.png"
import { toast } from "sonner"
import { getRestaurantAvailabilityStatus } from "@food/utils/restaurantAvailability"

export default function RestaurantInfo() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const { location: userLocation } = useAppLocation()

  const routerLocation = useLocation()
  
  const [restaurant, setRestaurant] = useState(routerLocation.state?.restaurant || null)
  const [loading, setLoading] = useState(!routerLocation.state?.restaurant)

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!slug || restaurant) return
      
      try {
        setLoading(true)
        const requestConfig = { noCache: true }
        if (Number.isFinite(userLocation?.latitude) && Number.isFinite(userLocation?.longitude)) {
          requestConfig.params = { lat: userLocation.latitude, lng: userLocation.longitude }
        }

        let response = null
        try {
          response = await restaurantAPI.getRestaurantById(slug, requestConfig)
          if (response?.data?.success && response?.data?.data) {
            setRestaurant(response.data.data)
            return
          }
        } catch (error) {
          // Fallback search just like RestaurantDetails
          try {
            const searchParams = { name: slug.replace(/-/g, ' ') }
            const searchResponse = await restaurantAPI.getRestaurants(searchParams, { noCache: true })
            const matchingRestaurant = searchResponse.data?.data?.find(
              r => r.restaurantNameNormalized === slug || 
                   r.restaurantName?.toLowerCase()?.includes(slug.replace(/-/g, ' ').toLowerCase())
            )

            if (matchingRestaurant) {
              const fullResponse = await restaurantAPI.getRestaurantById(matchingRestaurant._id || matchingRestaurant.restaurantId, requestConfig)
              if (fullResponse.data?.success && fullResponse.data?.data) {
                setRestaurant(fullResponse.data.data)
                return
              }
            }
          } catch (searchError) {
            console.error("Search fallback failed:", searchError)
          }
        }
        
        toast.error("Restaurant not found")
      } catch (error) {
        console.error("Error fetching restaurant info:", error)
        toast.error("Failed to load restaurant information")
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurant()
  }, [slug, restaurant])

  const handleContactClick = () => {
    if (restaurant?.ownerPhone) {
      window.location.href = `tel:${restaurant.ownerPhone}`
    } else {
      toast.error("Contact number not available")
    }
  }

  const { isOpen } = getRestaurantAvailabilityStatus(restaurant)
  const openTime = restaurant?.openingTime || "N/A"
  const closeTime = restaurant?.closingTime || "N/A"

  // Derive services string
  const services = []
  if (restaurant?.isDeliveryEnabled !== false) services.push("delivery")
  if (restaurant?.diningSettings?.isEnabled) services.push("dining")
  if (restaurant?.isTakeawayEnabled) services.push("takeaway")

  let servicesText = "Provides delivery & takeaway" // Fallback
  if (services.length > 0) {
    if (services.length === 1) {
      servicesText = `Provides ${services[0]}`
    } else if (services.length === 2) {
      servicesText = `Provides ${services.join(" & ")}`
    } else {
      servicesText = `Provides ${services.slice(0, -1).join(", ")} & ${services[services.length - 1]}`
    }
  }

  // Find formatted address
  const fullAddress = restaurant?.locationObject?.address || restaurant?.gstAddress || "Address not available"

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md px-4 pt-4 pb-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1a1a]"
          onClick={() => goBack(`/food/user/restaurants/${slug}`)}
        >
          <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
        </Button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 h-48" />
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 h-32" />
          </div>
        ) : !restaurant ? (
          <div className="text-center py-20 text-gray-500">
            Restaurant information could not be found.
          </div>
        ) : (
          <>
            {/* Main Info Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {restaurant.name || restaurant.restaurantName || "Unknown Restaurant"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                {fullAddress}
              </p>

              {/* Contact Button Row */}
              <div 
                className="flex items-center gap-3 py-4 border-y border-gray-100 dark:border-gray-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors"
                onClick={handleContactClick}
              >
                <div className="h-11 w-11 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                  <PhoneCall className="h-5 w-5 text-[#dc2626]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Contact to restaurant</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    Contact restaurant directly for any inquiries, order updates, or support
                  </p>
                </div>
              </div>

              {/* Timings and Services */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {isOpen ? (
                      <span className="text-green-600 font-semibold">Open now</span>
                    ) : (
                      <span className="text-red-500 font-semibold">Closed</span>
                    )}
                    <span className="mx-1.5 text-gray-400">•</span>
                    {isOpen ? `Closes ${closeTime}` : `Opens ${openTime}`}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Store className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {servicesText}
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">
                Legal Name
              </div>
              <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                {restaurant.gstLegalName || restaurant.ownerName || restaurant.restaurantName || "Not Available"}
              </h2>

              <div className="flex flex-col items-start gap-1.5 mt-2">
                <img 
                  src={fssaiLogo} 
                  alt="FSSAI" 
                  className="h-7 object-contain dark:invert-[0.8] dark:brightness-200" 
                />
                <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium tracking-tight">
                  Lic. No. {restaurant.fssaiNumber || "Not Available"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-lg mx-auto w-full">
          <Button
            className="w-full h-12 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-xl font-bold shadow-lg text-[15px]"
            onClick={() => navigate(`/food/user/restaurants/${slug}`)}
          >
            Go back to menu
          </Button>
        </div>
      </div>
    </AnimatedPage>
  )
}
