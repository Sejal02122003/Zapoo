import { Routes, Route, Navigate } from "react-router-dom"
import UserLayout from "./UserLayout"
import React, { Component, Suspense, lazy } from "react"
import Loader from "@food/components/Loader"
import ProtectedRoute from "@food/components/ProtectedRoute"

// Lazy Loading Pages

// Home & Discovery
const Home = lazy(() => import("@food/pages/user/Home"))
const Dining = lazy(() => import("@food/pages/user/Dining"))
const DiningCategory = lazy(() => import("@food/pages/user/DiningCategory"))
const DiningExplore50 = lazy(() => import("@food/pages/user/DiningExplore50"))
const DiningExploreNear = lazy(() => import("@food/pages/user/DiningExploreNear"))
const Coffee = lazy(() => import("@food/pages/user/Coffee"))
const Under99 = lazy(() => import("@food/pages/user/Under99"))
const CollectionPage = lazy(() => import("@food/pages/user/CollectionPage"))
const Categories = lazy(() => import("@food/pages/user/Categories"))
const CategoryPage = lazy(() => import("@food/pages/user/CategoryPage"))
const MomoPage = lazy(() => import("@food/pages/user/MomoPage"))
const TakeawayPage = lazy(() => import("@food/pages/user/TakeawayPage"))
const Restaurants = lazy(() => import("@food/pages/user/restaurants/Restaurants"))
const RestaurantDetails = lazy(() => import("@food/pages/user/restaurants/RestaurantDetails"))
const RestaurantInfo = lazy(() => import("@food/pages/user/restaurants/RestaurantInfo"))
const DiningRestaurantDetails = lazy(() => import("@food/pages/user/dining/DiningRestaurantDetails"))
const TableBooking = lazy(() => import("@food/pages/user/dining/TableBooking"))
const TableBookingConfirmation = lazy(() => import("@food/pages/user/dining/TableBookingConfirmation"))
const TableBookingSuccess = lazy(() => import("@food/pages/user/dining/TableBookingSuccess"))
const TableModificationPolicy = lazy(() => import("@food/pages/user/dining/TableModificationPolicy"))
const TableCancellationPolicy = lazy(() => import("@food/pages/user/dining/TableCancellationPolicy"))
const TableEditUserPage = lazy(() => import("@food/pages/user/dining/TableEditUserPage"))
const MyBookings = lazy(() => import("@food/pages/user/dining/MyBookings"))
const SearchResults = lazy(() => import("@food/pages/user/search/ProfessionalSearch"))
const ProductDetail = lazy(() => import("@food/pages/user/ProductDetail"))

// Cart
const Cart = lazy(() => import("@food/pages/user/cart/Cart"))
const Checkout = lazy(() => import("@food/pages/user/cart/Checkout"))
const SelectAddress = lazy(() => import("@food/pages/user/cart/SelectAddress"))
const AddressSelectorPage = lazy(() => import("@food/pages/user/cart/AddressSelectorPage"))

// Orders
const Orders = lazy(() => import("@food/pages/user/orders/Orders"))
const OrderTracking = lazy(() => import("@food/pages/user/orders/OrderTracking"))
const OrderInvoice = lazy(() => import("@food/pages/user/orders/OrderInvoice"))
const UserOrderDetails = lazy(() => import("@food/pages/user/orders/UserOrderDetails"))

// Offers
const Offers = lazy(() => import("@food/pages/user/Offers"))

// Gourmet
const Gourmet = lazy(() => import("@food/pages/user/Gourmet"))


// Collections
const Collections = lazy(() => import("@food/pages/user/Collections"))
const CollectionDetail = lazy(() => import("@food/pages/user/CollectionDetail"))



// Profile
const Profile = lazy(() => import("@food/pages/user/profile/Profile"))
const EditProfile = lazy(() => import("@food/pages/user/profile/EditProfile"))
const Payments = lazy(() => import("@food/pages/user/profile/Payments"))
const AddPayment = lazy(() => import("@food/pages/user/profile/AddPayment"))
const EditPayment = lazy(() => import("@food/pages/user/profile/EditPayment"))
const Favorites = lazy(() => import("@food/pages/user/profile/Favorites"))
const Support = lazy(() => import("@food/pages/user/profile/Support"))
const Coupons = lazy(() => import("@food/pages/user/profile/Coupons"))
const About = lazy(() => import("@food/pages/user/profile/About"))
const Terms = lazy(() => import("@food/pages/user/profile/Terms"))
const Privacy = lazy(() => import("@food/pages/user/profile/Privacy"))
const Refund = lazy(() => import("@food/pages/user/profile/Refund"))
const Shipping = lazy(() => import("@food/pages/user/profile/Shipping"))
const Cancellation = lazy(() => import("@food/pages/user/profile/Cancellation"))
const ReportSafetyEmergency = lazy(() => import("@food/pages/user/profile/ReportSafetyEmergency"))
const Accessibility = lazy(() => import("@food/pages/user/profile/Accessibility"))
const Logout = lazy(() => import("@food/pages/user/profile/Logout"))
const ReferEarn = lazy(() => import("@food/pages/user/profile/ReferEarn"))

// Auth
const SignIn = lazy(() => import("@food/pages/user/auth/SignIn"))
const OTP = lazy(() => import("@food/pages/user/auth/OTP"))
const AuthCallback = lazy(() => import("@food/pages/user/auth/AuthCallback"))

// Help
const Help = lazy(() => import("@food/pages/user/help/Help"))
const OrderHelp = lazy(() => import("@food/pages/user/help/OrderHelp"))

// Notifications
const Notifications = lazy(() => import("@food/pages/user/Notifications"))

// Wallet
const Wallet = lazy(() => import("@food/pages/user/Wallet"))

// Complaints
const SubmitComplaint = lazy(() => import("@food/pages/user/complaints/SubmitComplaint"))

const ProtectedUser = ({ children }) => (
  <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
    {children}
  </ProtectedRoute>
)

class UserErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error("User portal error caught:", error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c0c0c] flex items-center justify-center p-6 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📍</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Something Went Wrong</h2>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              We encountered an unexpected error displaying this section. Please try heading back to the home page or reloading.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.href = "/food/user"
                }}
                className="bg-primary hover:opacity-90 text-white font-bold py-3 px-5 rounded-xl text-xs transition active:scale-95 shadow-md shadow-primary/20"
              >
                Go to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-5 rounded-xl text-xs transition active:scale-95"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function UserRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <UserErrorBoundary>
        <Routes>
          <Route element={<UserLayout />}>
          {/* Home & Discovery */}
          <Route path="" element={<ProtectedUser><Home /></ProtectedUser>} />
          <Route path="user" element={<ProtectedUser><Home /></ProtectedUser>} />
          <Route path="food" element={<ProtectedUser><Home /></ProtectedUser>} />
          <Route path="dining" element={<ProtectedUser><Dining /></ProtectedUser>} />
          <Route path="dining/:category" element={<ProtectedUser><DiningCategory /></ProtectedUser>} />
          <Route path="dining/explore/upto50" element={<ProtectedUser><DiningExplore50 /></ProtectedUser>} />
          <Route path="dining/explore/near-rated" element={<ProtectedUser><DiningExploreNear /></ProtectedUser>} />
          <Route path="dining/coffee" element={<ProtectedUser><Coffee /></ProtectedUser>} />
          <Route path="dining/:diningType/:slug" element={<ProtectedUser><DiningRestaurantDetails /></ProtectedUser>} />
          <Route path="dining/book/:slug" element={<ProtectedUser><TableBooking /></ProtectedUser>} />
          <Route path="dining/book-confirmation" element={<ProtectedUser><TableBookingConfirmation /></ProtectedUser>} />
          <Route path="dining/book-success" element={<ProtectedUser><TableBookingSuccess /></ProtectedUser>} />
          <Route path="dining/modification-policy" element={<ProtectedUser><TableModificationPolicy /></ProtectedUser>} />
          <Route path="dining/cancellation-policy" element={<ProtectedUser><TableCancellationPolicy /></ProtectedUser>} />
          <Route path="dining/edit-user" element={<ProtectedUser><TableEditUserPage /></ProtectedUser>} />
          <Route path="bookings" element={<ProtectedUser><MyBookings /></ProtectedUser>} />
          <Route path="under99" element={<ProtectedUser><Under99 /></ProtectedUser>} />
          <Route path="user/under99" element={<ProtectedUser><Under99 /></ProtectedUser>} />
          <Route path="under-99" element={<Navigate to="/food/user/under99" replace />} />
          <Route path="user/under-99" element={<Navigate to="/food/user/under99" replace />} />
          <Route path="collection/:category" element={<ProtectedUser><CollectionPage /></ProtectedUser>} />
          <Route path="categories" element={<ProtectedUser><Categories /></ProtectedUser>} />
          <Route path="category/momo" element={<ProtectedUser><MomoPage /></ProtectedUser>} />
          <Route path="category/:category" element={<ProtectedUser><CategoryPage /></ProtectedUser>} />
          <Route path="takeaway" element={<ProtectedUser><TakeawayPage /></ProtectedUser>} />
          <Route path="restaurants" element={<ProtectedUser><Restaurants /></ProtectedUser>} />
          <Route path="restaurants/:slug" element={<ProtectedUser><RestaurantDetails /></ProtectedUser>} />
          <Route path="restaurants/:slug/info" element={<ProtectedUser><RestaurantInfo /></ProtectedUser>} />
          <Route path="search" element={<ProtectedUser><SearchResults /></ProtectedUser>} />
          <Route path="product/:id" element={<ProtectedUser><ProductDetail /></ProtectedUser>} />

          {/* Cart */}
          <Route path="cart" element={<ProtectedUser><Cart /></ProtectedUser>} />
          <Route path="cart/checkout" element={<ProtectedUser><Checkout /></ProtectedUser>} />
          <Route path="cart/select-address" element={<ProtectedUser><SelectAddress /></ProtectedUser>} />
          <Route path="address-selector" element={<AddressSelectorPage />} />
          <Route path="user/address-selector" element={<AddressSelectorPage />} />

          {/* Orders */}
          <Route path="orders" element={<ProtectedUser><Orders /></ProtectedUser>} />
          <Route path="orders/:orderId" element={<ProtectedUser><OrderTracking /></ProtectedUser>} />
          <Route path="orders/:orderId/invoice" element={<ProtectedUser><OrderInvoice /></ProtectedUser>} />
          <Route path="orders/:orderId/details" element={<ProtectedUser><UserOrderDetails /></ProtectedUser>} />

          {/* Offers */}
          <Route path="offers" element={<ProtectedUser><Offers /></ProtectedUser>} />

          {/* Gourmet */}
          <Route path="gourmet" element={<ProtectedUser><Gourmet /></ProtectedUser>} />

          {/* Collections */}
          <Route path="collections" element={<ProtectedUser><Collections /></ProtectedUser>} />
          <Route path="collections/:id" element={<ProtectedUser><CollectionDetail /></ProtectedUser>} />

          {/* Profile */}
          <Route path="profile" element={<ProtectedUser><Profile /></ProtectedUser>} />
          <Route path="profile/edit" element={<ProtectedUser><EditProfile /></ProtectedUser>} />
          <Route path="profile/payments" element={<ProtectedUser><Payments /></ProtectedUser>} />
          <Route path="profile/payments/new" element={<ProtectedUser><AddPayment /></ProtectedUser>} />
          <Route path="profile/payments/:id/edit" element={<ProtectedUser><EditPayment /></ProtectedUser>} />
          <Route path="profile/favorites" element={<ProtectedUser><Favorites /></ProtectedUser>} />
          <Route path="profile/support" element={<ProtectedUser><Support /></ProtectedUser>} />
          <Route path="profile/coupons" element={<ProtectedUser><Coupons /></ProtectedUser>} />
          <Route path="profile/about" element={<ProtectedUser><About /></ProtectedUser>} />
          <Route path="profile/report-safety-emergency" element={<ProtectedUser><ReportSafetyEmergency /></ProtectedUser>} />
          <Route path="profile/accessibility" element={<ProtectedUser><Accessibility /></ProtectedUser>} />
          <Route path="profile/logout" element={<ProtectedUser><Logout /></ProtectedUser>} />
          <Route path="profile/refer-earn" element={<ProtectedUser><ReferEarn /></ProtectedUser>} />
          <Route path="profile/dining-bookings" element={<ProtectedUser><MyBookings /></ProtectedUser>} />

          {/* Public Legal Policies (stay public) */}
          <Route path="profile/terms" element={<Terms />} />
          <Route path="profile/privacy" element={<Privacy />} />
          <Route path="profile/refund" element={<Refund />} />
          <Route path="profile/shipping" element={<Shipping />} />
          <Route path="profile/cancellation" element={<Cancellation />} />

          {/* Auth - User login is centralized at /user/auth/login */}
          <Route path="auth/login" element={<Navigate to="/user/auth/login" replace />} />
          <Route path="auth/sign-in" element={<Navigate to="/user/auth/login" replace />} />
          <Route path="auth/otp" element={<OTP />} />
          <Route path="auth/callback" element={<AuthCallback />} />

          {/* Help */}
          <Route path="help" element={<ProtectedUser><Help /></ProtectedUser>} />
          <Route path="help/orders/:orderId" element={<ProtectedUser><OrderHelp /></ProtectedUser>} />

          {/* Notifications */}
          <Route path="notifications" element={<ProtectedUser><Notifications /></ProtectedUser>} />

          {/* Wallet */}
          <Route path="wallet" element={<ProtectedUser><Wallet /></ProtectedUser>} />

          {/* Complaints */}
          <Route path="complaints/submit/:orderId" element={<ProtectedUser><SubmitComplaint /></ProtectedUser>} />

          {/* Fallback to user home so unmatched routes never show a blank screen */}
          <Route path="*" element={<Navigate to="" replace />} />
        </Route>
      </Routes>
      </UserErrorBoundary>
    </Suspense>
  )
}
