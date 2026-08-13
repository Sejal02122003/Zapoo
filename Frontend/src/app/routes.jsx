// Routing file
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { AppShellSkeleton } from '@food/components/ui/loading-skeletons'

const NATIVE_LAST_ROUTE_KEY = 'native_last_route'

// Lazy load the Food service module (Quick-spicy app)
const FoodApp = lazy(() => import('../modules/Food/routes'))
const AuthApp = lazy(() => import('../modules/auth/routes'))
import ProtectedRoute from '@food/components/ProtectedRoute'
import MasterLandingPage from './MasterLandingPage'
const AdminRouter = lazy(() => import('../modules/Food/components/admin/AdminRouter'))
const Terms = lazy(() => import('../modules/Food/pages/user/profile/Terms'))
const Privacy = lazy(() => import('../modules/Food/pages/user/profile/Privacy'))
const Refund = lazy(() => import('../modules/Food/pages/user/profile/Refund'))
const Support = lazy(() => import('../modules/Food/pages/user/profile/Support'))
const ContactUs = lazy(() => import('../modules/Food/pages/user/profile/ContactUs'))

const PageLoader = () => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase()
    if (
      path.includes('/terms') ||
      path.includes('/privacy') ||
      path.includes('/support')
    ) {
      return null
    }
  }
  return <AppShellSkeleton />
}

/**
 * FoodAppWrapper — Quick-spicy App. को /food prefix के साथ render करता है.
 * 
 * Quick-spicy की App.jsx में routes /restaurant, /usermain, /admin, /delivery
 * जैसे hain (bina /food prefix ke). Yahan hum useLocation se /food ke baad wala
 * path nikalne ke baad FoodApp render karte hain. FoodApp internally BrowserRouter
 * nahi use karta (sirf Routes use karta hai), isliye ye directly kaam karta hai.
 */
const FoodAppWrapper = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <FoodApp />
    </Suspense>
  )
}

const RedirectToFood = () => {
  const location = useLocation();
  // We safely replace the exact current pathname with a /food prefixed pathname
  // This effectively catches programmatic navigation to absolute paths like '/restaurant/login'
  // and turns them into '/food/restaurant/login'
  return <Navigate to={`/food${location.pathname}${location.search}`} replace />;
};

const AppRoutes = () => {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof window !== 'undefined' && location.pathname !== '/') {
      try {
        const fullPath = `${location.pathname}${location.search}`
        window.localStorage.setItem(NATIVE_LAST_ROUTE_KEY, fullPath)
      } catch (err) {
        console.warn('Failed to save native last route:', err)
      }
    }
  }, [location.pathname, location.search])

  return (
    <Routes>
      {/* Public Legal & Support Routes */}
      <Route path="/help-support" element={<Suspense fallback={null}><Support /></Suspense>} />
      <Route path="/contact-us" element={<Suspense fallback={null}><ContactUs /></Suspense>} />
      <Route path="/terms-conditions" element={<Suspense fallback={null}><Terms /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={null}><Terms /></Suspense>} />
      <Route path="/privacy-policy" element={<Suspense fallback={null}><Privacy /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={null}><Privacy /></Suspense>} />
      <Route path="/refund-policy" element={<Suspense fallback={null}><Refund /></Suspense>} />
      <Route path="/refund" element={<Suspense fallback={null}><Refund /></Suspense>} />

      {/* Auth Module */}
      <Route path="/user/auth/*" element={<AuthApp />} />
      <Route path="/delivery/auth/*" element={<AuthApp />} />
      <Route path="/restaurant/auth/*" element={<AuthApp />} />

      {/* Direct Module Routing Shortcuts */}
      <Route path="/restaurant/*" element={<RedirectToFood />} />
      <Route path="/delivery/*" element={<RedirectToFood />} />

      {/* Food Module - Handle both /food and root / for the user app */}
      <Route path="/food/*" element={<FoodAppWrapper />} />

      {/* Global Admin Portal - AdminRouter handles its own protection for sub-routes */}
      <Route path="/admin/*" element={<AdminRouter />} />

      {/* Handle root and other paths via FoodAppWrapper */}
      <Route path="/" element={<MasterLandingPage />} />
      <Route path="/*" element={<FoodAppWrapper />} />
    </Routes>
  )
}

export default AppRoutes
