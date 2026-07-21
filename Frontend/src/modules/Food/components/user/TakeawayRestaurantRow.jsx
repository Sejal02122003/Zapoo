import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Clock, Star } from "lucide-react"
import { restaurantAPI } from "@food/api"
import OptimizedImage from "@food/components/OptimizedImage"
import { Button } from "@food/components/ui/button"
import { useCart } from "@food/context/CartContext"
import { getRestaurantAvailabilityStatus } from "@food/utils/restaurantAvailability"

const RUPEE_SYMBOL = "₹"

export default function TakeawayRestaurantRow({ restaurant }) {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { quantities, addToCart } = useCart()

  useEffect(() => {
    let cancelled = false
    const fetchMenu = async () => {
      try {
        setLoading(true)
        const rId = String(restaurant?.id || restaurant?._id)
        if (!rId) return
        
        const response = await restaurantAPI.getMenu(rId)
        if (cancelled) return

        const data = response?.data?.data || response?.data || {}
        let rawItems = []
        if (Array.isArray(data.items)) {
          rawItems = data.items
        } else if (Array.isArray(data.categories)) {
          rawItems = data.categories.flatMap(c => c.items || [])
        } else if (Array.isArray(data)) {
          rawItems = data
        }

        // Format items
        const formattedItems = rawItems
          .filter(item => item && (item.name || item.itemName))
          .map(item => ({
            ...item,
            id: item.id || item._id,
            name: item.name || item.itemName,
            price: item.price || item.basePrice || 0,
            image: item.image || item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
            isVeg: item.isVeg !== undefined ? item.isVeg : true,
            restaurantId: rId,
            restaurantName: restaurant.name,
            restaurantSlug: restaurant.slug,
            restaurantRaw: restaurant,
            isClosed: !getRestaurantAvailabilityStatus(restaurant).isOpen }))

        setMenuItems(formattedItems)
      } catch (error) {
        console.error("Error fetching menu for", restaurant?.name, error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchMenu()
    return () => { cancelled = true }
  }, [restaurant])

  const handleItemClick = (item, restaurantRaw) => {
    // Basic Add to cart logic, assuming it uses standard cart context
    addToCart(item, restaurantRaw, [])
  }

  // Do not render anything if loading is finished and no items are found
  if (!loading && menuItems.length === 0) return null

  return (
    <div className="flex flex-col py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Restaurant Header */}
      <div className="flex flex-col mb-3 px-1 cursor-pointer" onClick={() => navigate(`/food/user/restaurants/${restaurant.slug}`)}>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
          {restaurant.name}
        </h2>
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{restaurant.deliveryTime || "25-30 mins"}</span>
          </div>
          <div className="flex items-center gap-1 bg-green-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">
            <Star className="w-3 h-3 fill-current" />
            <span>{Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : "0"}</span>
          </div>
        </div>
      </div>

      {/* Horizontal Items Scroll */}
      {loading ? (
        <div className="flex overflow-hidden gap-4 pb-2">
           {Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="flex-shrink-0 w-[180px] h-[220px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
           ))}
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
          {menuItems.map((item) => {
            const quantity = quantities[`${item.restaurantId}-${item.id}`] || 0
            
            return (
              <div 
                key={`${item.restaurantId}-${item.id}`} 
                className={`flex-shrink-0 w-[160px] sm:w-[180px] flex flex-col rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1a1a] snap-start transition-transform hover:-translate-y-1 hover:shadow-md ${item.isClosed ? 'opacity-70 grayscale' : ''}`}
              >
                {/* Item Image */}
                <div 
                  className="relative w-full h-[120px] sm:h-[140px] flex-shrink-0 cursor-pointer" 
                  onClick={() => navigate(`/food/user/restaurants/${item.restaurantSlug}`)}
                >
                  <OptimizedImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {item.isVeg ? (
                    <div className="absolute top-2 left-2 bg-white rounded flex-shrink-0 h-4 w-4 border border-green-600 flex items-center justify-center z-10 shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 bg-white rounded flex-shrink-0 h-4 w-4 border border-red-600 flex items-center justify-center z-10 shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-red-600" />
                    </div>
                  )}
                </div>

                {/* Item Info */}
                <div className="p-3 flex flex-col flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 min-h-[40px]">
                    1 x {item.name}
                  </h4>
                  
                  <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50 dark:border-gray-800/50">
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      {RUPEE_SYMBOL}{Math.round(item.price)}
                    </span>
                    
                    {item.isClosed ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        className="h-7 px-3 rounded-xl text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500"
                      >
                        CLOSED
                      </Button>
                    ) : quantity > 0 ? (
                      <Link to="/food/user/cart">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 rounded-xl text-[10px] font-bold border-primary text-primary"
                        >
                          ADDED
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-4 rounded-xl text-[11px] font-bold border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-[1.5px]"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleItemClick(item, item.restaurantRaw)
                        }}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
