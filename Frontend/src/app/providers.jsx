import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './store'
import { UserNotificationProvider } from '../modules/Food/context/UserNotificationContext'
import { RestaurantNotificationProvider } from '../modules/Food/context/RestaurantNotificationContext'
import { DeliveryNotificationProvider } from '../modules/Food/context/DeliveryNotificationContext'


function shouldUseHashRouter() {
  if (typeof window === 'undefined') return false

  const protocol = String(window.location?.protocol || '').toLowerCase()
  // Only use HashRouter for file:// protocol or WebView environments
  return (
    protocol === 'file:' ||
    Boolean(window.flutter_inappwebview) ||
    Boolean(window.ReactNativeWebView)
  )
}

export function AppProviders({ children }) {
  const Router = shouldUseHashRouter() ? HashRouter : BrowserRouter

  return (
    <StrictMode>
      <ReduxProvider store={store}>
        <Router>
          <UserNotificationProvider>
            <RestaurantNotificationProvider>
              <DeliveryNotificationProvider>
                {children}
                <Toaster position="top-center" richColors offset="80px" />
              </DeliveryNotificationProvider>
            </RestaurantNotificationProvider>
          </UserNotificationProvider>
        </Router>
      </ReduxProvider>
    </StrictMode>
  )
}
