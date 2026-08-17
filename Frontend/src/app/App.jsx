import React, { useState, useEffect, useCallback } from 'react'
import AppRoutes from './routes'
import SplashScreen from '@/shared/components/SplashScreen.jsx'
import PageLoader from '@/shared/components/PageLoader.jsx'

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase()
      if (
        path === '/' ||
        path === '' ||
        path === '/index.html' ||
        path.includes('/terms') ||
        path.includes('/privacy') ||
        path.includes('/support') ||
        path.includes('/restaurant') ||
        path.includes('/delivery') ||
        path.includes('/admin') ||
        path.includes('/food') ||
        path.includes('/user')
      ) {
        return false
      }
      // Check if splash screen was already shown in this session
      if (sessionStorage.getItem('splashShown')) {
        return false
      }
    }
    return false
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleSplashFinish = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('splashShown', 'true')
    }
    setShowSplash(false)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref && typeof ref === 'string' && ref.trim()) {
        const cleanRef = ref.trim()
        sessionStorage.setItem('referralCode', cleanRef)
        localStorage.setItem('referralCode', cleanRef)
      }
    }
  }, [])

  useEffect(() => {
    if (showSplash) {
      const safetyTimer = setTimeout(() => {
        setShowSplash(false)
      }, 2500)
      return () => clearTimeout(safetyTimer)
    }
  }, [showSplash])

  // Normal Loading Spinner (if needed in future)
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-black text-primary italic uppercase tracking-tighter mt-6">ZAPOO</h1>
      </div>
    )
  }

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <PageLoader />
      <AppRoutes />
    </>
  )
}

export default App
