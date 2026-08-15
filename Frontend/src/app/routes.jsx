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

export const detectAppModule = () => {
  if (typeof window === 'undefined') return 'user';

  const pathname = (window.location.pathname || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase();
  const userAgent = (window.navigator?.userAgent || '').toLowerCase();
  const host = (window.location.hostname || '').toLowerCase();

  // 1. Direct path check
  if (pathname.includes('/restaurant') || pathname.includes('/food/restaurant')) return 'restaurant';
  if (pathname.includes('/delivery') || pathname.includes('/food/delivery')) return 'delivery';
  if (pathname.includes('/admin')) return 'admin';

  // 2. Query param check (e.g. ?module=delivery or ?app=restaurant or ?role=delivery)
  if (search.includes('module=restaurant') || search.includes('app=restaurant') || search.includes('role=restaurant') || search.includes('type=restaurant')) return 'restaurant';
  if (search.includes('module=delivery') || search.includes('app=delivery') || search.includes('role=delivery') || search.includes('type=delivery')) return 'delivery';
  if (search.includes('module=admin') || search.includes('app=admin')) return 'admin';

  // 3. Hash check (e.g. #restaurant or #/delivery)
  if (hash.includes('restaurant')) return 'restaurant';
  if (hash.includes('delivery')) return 'delivery';
  if (hash.includes('admin')) return 'admin';

  // 4. Injected window variables (from Flutter/React Native/Capacitor WebView)
  const globalModule = String(window.APP_MODULE || window.MODULE_NAME || window.NATIVE_APP_TYPE || window.NATIVE_MODULE || '').toLowerCase();
  if (globalModule === 'restaurant' || globalModule === 'delivery' || globalModule === 'admin') return globalModule;

  // 5. UserAgent check (for native mobile app WebViews)
  if (userAgent.includes('restaurant') || userAgent.includes('vendor') || userAgent.includes('zapoo_restaurant') || userAgent.includes('zapoorestaurant')) return 'restaurant';
  if (userAgent.includes('delivery') || userAgent.includes('driver') || userAgent.includes('rider') || userAgent.includes('zapoo_delivery') || userAgent.includes('zapoodelivery')) return 'delivery';
  if (userAgent.includes('admin') || userAgent.includes('zapoo_admin')) return 'admin';

  // 6. Subdomain check
  if (host.startsWith('restaurant.') || host.startsWith('vendor.') || host.startsWith('merchant.')) return 'restaurant';
  if (host.startsWith('delivery.') || host.startsWith('driver.') || host.startsWith('rider.')) return 'delivery';
  if (host.startsWith('admin.')) return 'admin';

  // 7. Stored app module key (saved when native app opens)
  const storedAppModule = (localStorage.getItem('native_app_module') || '').toLowerCase();
  if (storedAppModule === 'restaurant' || storedAppModule === 'delivery' || storedAppModule === 'admin') return storedAppModule;

  return 'user';
};

const RootRouteHandler = () => {
  const targetModule = detectAppModule();

  if (targetModule === 'restaurant') {
    return isModuleAuthenticated('restaurant')
      ? <Navigate to="/food/restaurant" replace />
      : <Navigate to="/food/restaurant/login" replace />;
  }

  if (targetModule === 'delivery') {
    return isModuleAuthenticated('delivery')
      ? <Navigate to="/food/delivery" replace />
      : <Navigate to="/food/delivery/login" replace />;
  }

  if (targetModule === 'admin') {
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
