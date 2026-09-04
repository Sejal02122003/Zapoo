import React, { Component, Suspense, lazy, useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute from "@food/components/ProtectedRoute"
import { getCurrentUser } from "@food/utils/auth"
import Loader from "@food/components/Loader"
import { Loader2 } from "lucide-react"
import GlobalNewOrderModal from "./GlobalNewOrderModal"
import RestaurantBlockGuard from "./RestaurantBlockGuard"
import "./restaurantTheme.css"
import restaurantLogo from "@/assets/restaurant_logo.jpeg"

// Lazy Loading Components
const RestaurantNotifications = lazy(() => import("@food/pages/restaurant/Notifications"))
const AllOrdersPage = lazy(() => import("@food/pages/restaurant/AllOrdersPage"))
const OrderDetails = lazy(() => import("@food/pages/restaurant/OrderDetails"))
const OrdersMain = lazy(() => import("@food/pages/restaurant/OrdersMain"))
const RestaurantOnboarding = lazy(() => import("@food/pages/restaurant/Onboarding"))
const PrivacyPolicyPage = lazy(() => import("@food/pages/restaurant/PrivacyPolicyPage"))
const TermsAndConditionsPage = lazy(() => import("@food/pages/restaurant/TermsAndConditionsPage"))
const MenuCategoriesPage = lazy(() => import("@food/pages/restaurant/MenuCategoriesPage"))
const RestaurantStatus = lazy(() => import("@food/pages/restaurant/RestaurantStatus"))
const ExploreMore = lazy(() => import("@food/pages/restaurant/ExploreMore"))
const DeliverySettings = lazy(() => import("@food/pages/restaurant/DeliverySettings"))
const RushHour = lazy(() => import("@food/pages/restaurant/RushHour"))
const OutletTimings = lazy(() => import("@food/pages/restaurant/OutletTimings"))
const DaySlots = lazy(() => import("@food/pages/restaurant/DaySlots"))
const OutletInfo = lazy(() => import("@food/pages/restaurant/OutletInfo"))
const RatingsReviews = lazy(() => import("@food/pages/restaurant/RatingsReviews"))
const EditOwner = lazy(() => import("@food/pages/restaurant/EditOwner"))
const EditCuisines = lazy(() => import("@food/pages/restaurant/EditCuisines"))
const EditRestaurantAddress = lazy(() => import("@food/pages/restaurant/EditRestaurantAddress"))
const Inventory = lazy(() => import("@food/pages/restaurant/Inventory"))
const Feedback = lazy(() => import("@food/pages/restaurant/Feedback"))
const ShareFeedback = lazy(() => import("@food/pages/restaurant/ShareFeedback"))
const DishRatings = lazy(() => import("@food/pages/restaurant/DishRatings"))
const RestaurantSupport = lazy(() => import("@food/pages/restaurant/RestaurantSupport"))
const FssaiDetails = lazy(() => import("@food/pages/restaurant/FssaiDetails"))
const FssaiUpdate = lazy(() => import("@food/pages/restaurant/FssaiUpdate"))
const Hyperpure = lazy(() => import("@food/pages/restaurant/Hyperpure"))
const Challenges = lazy(() => import("@food/pages/restaurant/Challenges"))
const ItemDetailsPage = lazy(() => import("@food/pages/restaurant/ItemDetailsPage"))
const HubFinance = lazy(() => import("@food/pages/restaurant/HubFinance"))
const FinanceDetailsPage = lazy(() => import("@food/pages/restaurant/FinanceDetailsPage"))
const WithdrawalHistoryPage = lazy(() => import("@food/pages/restaurant/WithdrawalHistoryPage"))
const PhoneNumbersPage = lazy(() => import("@food/pages/restaurant/PhoneNumbersPage"))
const DownloadReport = lazy(() => import("@food/pages/restaurant/DownloadReport"))
const Promocodes = lazy(() => import("@food/pages/restaurant/Promocodes"))
const Advertise = lazy(() => import("@food/pages/restaurant/Advertise"))

const ManageOutlets = lazy(() => import("@food/pages/restaurant/ManageOutlets"))
const UpdateBankDetails = lazy(() => import("@food/pages/restaurant/UpdateBankDetails"))
const ZoneSetup = lazy(() => import("@food/pages/restaurant/ZoneSetup"))
const DiningReservations = lazy(() => import("@food/pages/restaurant/DiningReservations"))
const Welcome = lazy(() => import("@food/pages/restaurant/auth/Welcome"))
const Login = lazy(() => import("@food/pages/restaurant/auth/Login"))
const OTP = lazy(() => import("@food/pages/restaurant/auth/OTP"))
const Signup = lazy(() => import("@food/pages/restaurant/auth/Signup"))
const ForgotPassword = lazy(() => import("@food/pages/restaurant/auth/ForgotPassword"))
const VerificationPending = lazy(() => import("@food/pages/restaurant/auth/VerificationPending"))
const RestaurantLocationCoupons = lazy(() => import("@food/pages/restaurant/locationCoupons/RestaurantLocationCoupons"))

// Owner Multi-Outlet Hub Pages
const OwnerDashboard = lazy(() => import("@food/pages/restaurant/owner/OwnerDashboard"))
const OwnerOutletsPage = lazy(() => import("@food/pages/restaurant/owner/OwnerOutletsPage"))
const OwnerOrdersPage = lazy(() => import("@food/pages/restaurant/owner/OwnerOrdersPage"))
const OwnerInventoryPage = lazy(() => import("@food/pages/restaurant/owner/OwnerInventoryPage"))
const OwnerFinancePage = lazy(() => import("@food/pages/restaurant/owner/OwnerFinancePage"))
const OwnerAnalyticsPage = lazy(() => import("@food/pages/restaurant/owner/OwnerAnalyticsPage"))

function RestaurantRootRedirector() {
  const user = getCurrentUser("restaurant")
  if (user && (user.role === "OWNER" || user.isOwner || (!user.outletId && user.role !== "OUTLETER"))) {
    return <Navigate to="/food/restaurant/owner" replace />
  }
  return <OrdersMain />
}

class RestaurantErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error("Restaurant portal error caught:", error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c0c0c] flex items-center justify-center p-6 font-['Poppins']">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 font-['Outfit']">Something Went Wrong</h2>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              We encountered an unexpected error displaying this section. Please try reloading or head back to your dashboard.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="bg-[#22A2E3] hover:bg-[#1b8bc4] text-white font-bold py-3 px-5 rounded-xl text-xs transition active:scale-95 shadow-md shadow-[#22A2E3]/20"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.href = "/food/restaurant/owner"
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-5 rounded-xl text-xs transition active:scale-95"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function RestaurantRouter() {
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    const originalHref = link.href
    link.href = restaurantLogo
    
    return () => {
      link.href = originalHref
    }
  }, [])

  return (
    <div className="restaurant-theme">
      <RestaurantErrorBoundary>
        <Suspense fallback={
          <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
            <Loader2 className="w-8 h-8 animate-spin text-[#7e3866]" />
          </div>
        }>
          <Routes>
          {/* Auth Routes */}
          <Route path="welcome" element={<Welcome />} />
          <Route path="login" element={<Login />} />
          <Route path="otp" element={<OTP />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="pending-verification" element={<VerificationPending />} />

          {/* Unprotected Static/Onboarding Routes */}
          <Route path="onboarding" element={<RestaurantOnboarding />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsAndConditionsPage />} />
          <Route path="profile/privacy" element={<PrivacyPolicyPage />} />
          <Route path="profile/terms" element={<TermsAndConditionsPage />} />

          {/* Protected Routes Wrapped in RestaurantBlockGuard */}
          <Route element={
            <ProtectedRoute requiredRole="restaurant" loginPath="/food/restaurant/login">
              <RestaurantBlockGuard />
            </ProtectedRoute>
          }>
            {/* Multi-Outlet Owner Control Hub */}
            <Route path="owner" element={<OwnerDashboard />} />
            <Route path="owner/outlets" element={<OwnerOutletsPage />} />
            <Route path="owner/orders" element={<OwnerOrdersPage />} />
            <Route path="owner/inventory" element={<OwnerInventoryPage />} />
            <Route path="owner/finance" element={<OwnerFinancePage />} />
            <Route path="owner/analytics" element={<OwnerAnalyticsPage />} />

            <Route path="" element={<RestaurantRootRedirector />} />
            <Route path="orders/all" element={<AllOrdersPage />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="notifications" element={<RestaurantNotifications />} />
            <Route path="delivery-settings" element={<DeliverySettings />} />
            <Route path="rush-hour" element={<RushHour />} />
            <Route path="menu-categories" element={<MenuCategoriesPage />} />
            <Route path="challenges" element={<Challenges />} />
            <Route path="status" element={<RestaurantStatus />} />
            <Route path="explore" element={<ExploreMore />} />
            <Route path="outlet-timings" element={<OutletTimings />} />
            <Route path="outlet-timings/:day" element={<DaySlots />} />
            <Route path="outlet-info" element={<OutletInfo />} />
            <Route path="ratings-reviews" element={<RatingsReviews />} />
            <Route path="edit-owner" element={<EditOwner />} />
            <Route path="edit-cuisines" element={<EditCuisines />} />
            <Route path="edit-address" element={<EditRestaurantAddress />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="share-feedback" element={<ShareFeedback />} />
            <Route path="dish-ratings" element={<DishRatings />} />
            <Route path="help-centre/support" element={<RestaurantSupport />} />
            <Route path="fssai" element={<FssaiDetails />} />
            <Route path="fssai/update" element={<FssaiUpdate />} />
            <Route path="hyperpure" element={<Hyperpure />} />
            <Route path="hub-menu/item/:id" element={<ItemDetailsPage />} />
            <Route path="hub-finance" element={<HubFinance />} />
            <Route path="withdrawal-history" element={<WithdrawalHistoryPage />} />
            <Route path="finance-details" element={<FinanceDetailsPage />} />
            <Route path="phone" element={<PhoneNumbersPage />} />
            <Route path="download-report" element={<DownloadReport />} />
            <Route path="promocodes" element={<Promocodes />} />
            <Route path="advertise" element={<Advertise />} />
            <Route path="manage-outlets" element={<ManageOutlets />} />
            <Route path="update-bank-details" element={<UpdateBankDetails />} />
            <Route path="reservations" element={<DiningReservations />} />
            <Route path="zone-setup" element={<ZoneSetup />} />
            <Route path="coupon" element={<RestaurantLocationCoupons />} />
            <Route path="dashboard/*" element={<Navigate to="/food/restaurant" replace />} />
            <Route path="*" element={<Navigate to="/food/restaurant" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/food/restaurant/login" replace />} />
        </Routes>
      </Suspense>
      </RestaurantErrorBoundary>
      <GlobalNewOrderModal />
    </div>
  )
}
