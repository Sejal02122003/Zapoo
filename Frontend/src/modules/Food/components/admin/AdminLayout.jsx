import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import AdminSidebar from "./AdminSidebar"
import AdminNavbar from "./AdminNavbar"
import { API_BASE_URL } from "@food/api/config"
import { adminAPI } from "@/services/api/index.js"
import io from "socket.io-client"
import { toast } from "sonner"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Connect to global admin socket for SOS alerts
    const backendUrl = API_BASE_URL?.replace("/api/v1", "") || "http://localhost:5000"
    const socket = io(backendUrl, { transports: ["websocket", "polling"] })
    
    socket.on("connect", () => {
      socket.emit("join-admin-orders") // Re-using admin room
    })
    
    socket.on("rider_sos_alert", (data) => {
      // Play a loud/noticeable toast for SOS
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-lg">âš ï¸  EMERGENCY: {data.type}</span>
          <span>Rider: {data.riderName} ({data.phone}) triggered an SOS alert!</span>
          {data.activeOrderNumber && (
             <span className="font-bold mt-1 text-white bg-black/20 p-1 rounded">Active Order: {data.activeOrderNumber}</span>
          )}
        </div>,
        { duration: 15000, position: "top-center", style: { background: '#ef4444', color: '#fff', border: 'none' } }
      )
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Get initial collapsed state from localStorage to set initial margin
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_state')
      if (saved !== null) {
        const state = JSON.parse(saved)
        if (state && typeof state.isCollapsed !== 'undefined') {
          setIsSidebarCollapsed(state.isCollapsed)
        }
      }
    } catch (e) {
      debugError('Error loading sidebar collapsed state:', e)
    }

    // Refresh profile to keep permissions up to date
    adminAPI.getAdminProfile().then(res => {
      const admin = res.data?.data?.admin;
      if (admin) {
        localStorage.setItem('admin_user', JSON.stringify(admin));
        window.dispatchEvent(new Event('adminAuthChanged'));
      }
    }).catch(e => debugError('Failed to refresh admin profile:', e));
  }, [])

  const handleCollapseChange = (collapsed) => {
    setIsSidebarCollapsed(collapsed)
  }

  return (
    <div className="h-screen bg-neutral-200 flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapseChange={handleCollapseChange}
      />

      {/* Main Content Area */}
      <div className={`
        flex-1 flex min-h-0 flex-col transition-all duration-300 ease-in-out min-w-0
        ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'}
      `}>
        {/* Top Navbar */}
        <AdminNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Backend disconnected banner */}
        {!API_BASE_URL && (
          <div className="w-full bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900">
            Backend disconnected. Data is not live.
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 min-h-0 w-full max-w-full overflow-x-hidden overflow-y-auto bg-neutral-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

