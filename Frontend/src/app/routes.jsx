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

import { isModuleAuthenticated } from '@food/utils/auth'

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
  const path = location.pathname;
  let newPath = `/food${path}`;
  if (path.startsWith('/restaurant')) {
    newPath = path.replace('/restaurant', '/food/restaurant');
  } else if (path.startsWith('/delivery')) {
    newPath = path.replace('/delivery', '/food/delivery');
  }
  return <Navigate to={`${newPath}${location.search}`} replace />;
};

const getSubdomainModule = () => {
  if (typeof window === 'undefined') return null;
  const host = (window.location.hostname || '').toLowerCase();
  if (host.startsWith('restaurant.') || host.startsWith('vendor.') || host.startsWith('merchant.')) {
    return 'restaurant';
  }
  if (host.startsWith('delivery.') || host.startsWith('driver.') || host.startsWith('rider.')) {
    return 'delivery';
  }
  if (host.startsWith('admin.')) {
    return 'admin';
  }
  return null;
};

const RootRouteHandler = () => {
  const subModule = getSubdomainModule();

  if (subModule === 'restaurant') {
    return isModuleAuthenticated('restaurant')
      ? <Navigate to="/food/restaurant" replace />
      : <Navigate to="/food/restaurant/login" replace />;
  }

  if (subModule === 'delivery') {
    return isModuleAuthenticated('delivery')
      ? <Navigate to="/food/delivery" replace />
      : <Navigate to="/food/delivery/login" replace />;
  }

  if (subModule === 'admin') {
    return isModuleAuthenticated('admin')
      ? <Navigate to="/admin" replace />
      : <Navigate to="/admin/login" replace />;
  }

  if (isModuleAuthenticated('restaurant')) {
    return <Navigate to="/food/restaurant" replace />;
  }
  if (isModuleAuthenticated('delivery')) {
    return <Navigate to="/food/delivery" replace />;
  }
  if (isModuleAuthenticated('admin')) {
    return <Navigate to="/admin" replace />;
  }
  return <FoodAppWrapper />;
};

const AppRoutes = () => {
  const location = useLocation()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (location.pathname !== '/' && location.pathname !== '/landing') {
        try {
          const fullPath = `${location.pathname}${location.search}`
          window.localStorage.setItem(NATIVE_LAST_ROUTE_KEY, fullPath)
        } catch (err) {
          console.warn('Failed to save native last route:', err)
        }
      } else {
        window.localStorage.removeItem(NATIVE_LAST_ROUTE_KEY)
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

      {/* Auth Module Routes */}
      <Route path="/user/auth/*" element={<AuthApp />} />
      <Route path="/delivery/auth/*" element={<Navigate to="/food/delivery/login" replace />} />
      <Route path="/restaurant/auth/*" element={<Navigate to="/food/restaurant/login" replace />} />

      {/* Direct Module Routing Shortcuts */}
      <Route path="/restaurant/*" element={<RedirectToFood />} />
      <Route path="/delivery/*" element={<RedirectToFood />} />

      {/* Food Module - Handle both /food and root / for the user app */}
      <Route path="/food/*" element={<FoodAppWrapper />} />

      {/* Global Admin Portal - AdminRouter handles its own protection for sub-routes */}
      <Route path="/admin/*" element={<AdminRouter />} />

      {/* Web Search Marketing Landing Page - accessible at /landing */}
      <Route path="/landing" element={<MasterLandingPage />} />

      {/* Handle root / and other paths via RootRouteHandler / FoodAppWrapper */}
      <Route path="/" element={<RootRouteHandler />} />
      <Route path="/*" element={<FoodAppWrapper />} />
    </Routes>
  )
}

export default AppRoutes
