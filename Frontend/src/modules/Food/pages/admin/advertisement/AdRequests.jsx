import { useState, useMemo, useEffect, useRef } from "react"
import { Search, Settings, MoreVertical, Building2, Download, ChevronDown, Filter, FileDown, FileSpreadsheet, FileText, Code, Eye, CheckCircle2, XCircle, IndianRupee, Globe, MapPin, Loader2, Plus, Calendar, Upload } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@food/components/ui/dialog"
import SettingsDialog from "@food/components/admin/orders/SettingsDialog"
import { exportAdvertisementsToCSV, exportAdvertisementsToExcel, exportAdvertisementsToPDF, exportAdvertisementsToJSON } from "@food/components/admin/advertisements/advertisementsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

export default function AdRequests() {
  const [activeTab, setActiveTab] = useState("pending_pricing")
  const [searchQuery, setSearchQuery] = useState("")
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  
  // Pricing state
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false)
  const [pricingAmount, setPricingAmount] = useState("")
  
  // Rejection state
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  // Approval with designed banner upload state
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [approveMediaFile, setApproveMediaFile] = useState(null)
  const [approveMediaPreview, setApproveMediaPreview] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const approveFileInputRef = useRef(null)

  const [filters, setFilters] = useState({
    scope: "",
    restaurant: "" })
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    adsId: true,
    adsTitle: true,
    restaurantInfo: true,
    scope: true,
    duration: true,
    price: true,
    status: true,
    actions: true })

  const columnsConfig = {
    si: "Serial Number",
    adsId: "Ads ID",
    adsTitle: "Ads Title",
    restaurantInfo: "Restaurant Info",
    scope: "Target Scope",
    duration: "Duration",
    price: "Price",
    status: "Status",
    actions: "Actions" }

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getAdRequests()
      if (res.data?.success) {
        setRequests(res.data.data)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch ad requests")
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    let result = [...requests]
    
    // Filter by tab
    if (activeTab === "pending_pricing") {
      result = result.filter(r => r.status === "pending_pricing")
    } else if (activeTab === "pending_payment") {
      result = result.filter(r => r.status === "pending_payment")
    } else if (activeTab === "paid") {
      result = result.filter(r => r.status === "paid")
    } else if (activeTab === "live") {
      result = result.filter(r => r.status === "live")
    } else if (activeTab === "rejected") {
      result = result.filter(r => r.status === "rejected")
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(request =>
        request._id?.toLowerCase().includes(query) ||
        request.restaurantName?.toLowerCase().includes(query) ||
        request.title?.toLowerCase().includes(query)
      )
    }
    
    // Filter by scope
    if (filters.scope) {
      result = result.filter(r => r.scope === filters.scope)
    }
    
    // Filter by restaurant
    if (filters.restaurant) {
      result = result.filter(r => r.restaurantName === filters.restaurant)
    }
    
    return result
  }, [requests, searchQuery, activeTab, filters])

  const activeFiltersCount = Object.values(filters).filter(v => v).length

  const handleExport = (format) => {
    const filename = `ad_requests_${activeTab}`
    const mappedForExport = filteredRequests.map((r, idx) => ({
      sl: idx + 1,
      adsId: r._id,
      adsTitle: r.title,
      restaurantName: r.restaurantName,
      adsType: r.scope === "global" ? "Global" : `Zone (${r.zoneName})`,
      duration: `${new Date(r.startDate).toLocaleDateString()} - ${new Date(r.endDate).toLocaleDateString()}`
    }))

    switch (format) {
      case "csv":
        exportAdvertisementsToCSV(mappedForExport, filename)
        break
      case "excel":
        exportAdvertisementsToExcel(mappedForExport, filename)
        break
      case "pdf":
        exportAdvertisementsToPDF(mappedForExport, filename)
        break
      case "json":
        exportAdvertisementsToJSON(mappedForExport, filename)
        break
      default:
        break
    }
  }

  const handleViewRequest = (request) => {
    setSelectedRequest(request)
    setIsViewOpen(true)
  }

  const handleOpenPricing = (request) => {
    setSelectedRequest(request)
    setPricingAmount(request.price || "")
    setIsPriceDialogOpen(true)
  }

  const handleSavePrice = async () => {
    if (!pricingAmount || Number(pricingAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      const res = await adminAPI.setAdRequestPrice(selectedRequest._id, pricingAmount)
      if (res.data?.success) {
        toast.success("Pricing set successfully!")
        setIsPriceDialogOpen(false)
        fetchRequests()
      }
    } catch (err) {
      toast.error("Failed to update price")
    }
  }

  const handleOpenApprove = (request) => {
    setSelectedRequest(request)
    setApproveMediaFile(null)
    setApproveMediaPreview("")
    setIsApproveDialogOpen(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setApproveMediaFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setApproveMediaPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleApproveLive = async () => {
    if (!approveMediaFile) {
      toast.error("Please upload the designed banner image")
      return
    }

    setIsApproving(true)
    try {
      const formData = new FormData()
      formData.append("media", approveMediaFile)
      formData.append("mediaType", "image")

      const res = await adminAPI.approveAdRequest(selectedRequest._id, formData)
      if (res.data?.success) {
        toast.success("Campaign is now Live!")
        setIsApproveDialogOpen(false)
        fetchRequests()
      }
    } catch (err) {
      toast.error("Failed to approve ad campaign")
    } finally {
      setIsApproving(false)
    }
  }

  const handleOpenReject = (request) => {
    setSelectedRequest(request)
    setRejectionReason("")
    setIsRejectDialogOpen(true)
  }

  const handleConfirmReject = async () => {
    try {
      const res = await adminAPI.rejectAdRequest(selectedRequest._id, rejectionReason)
      if (res.data?.success) {
        toast.success("Ad request rejected successfully")
        setIsRejectDialogOpen(false)
        fetchRequests()
      }
    } catch (err) {
      toast.error("Failed to reject request")
    }
  }

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      adsId: true,
      adsTitle: true,
      restaurantInfo: true,
      scope: true,
      duration: true,
      price: true,
      status: true,
      actions: true })
  }

  const handleApplyFilters = () => {
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    setFilters({
      scope: "",
      restaurant: "" })
  }

  const restaurants = [...new Set(requests.map(r => r.restaurantName))].filter(Boolean)

  const tabs = [
    { key: "pending_pricing", label: "Awaiting Pricing" },
    { key: "pending_payment", label: "Awaiting Payment" },
    { key: "paid", label: "Awaiting Approval (Paid)" },
    { key: "live", label: "Live Campaigns" },
    { key: "rejected", label: "Rejected Requests" },
  ]

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Advertisement Requests</h1>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">
              {filteredRequests.length}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-4 overflow-x-auto whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-orange-600 text-orange-600 font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Ad ID, Title or Restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                  <Download className="w-4 h-4" />
                  <span className="text-black font-bold">Export</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")} className="cursor-pointer">
                  <Code className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button 
              onClick={() => setIsFilterOpen(true)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all relative ${
                activeFiltersCount > 0 ? "border-emerald-500 bg-emerald-50" : ""
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-black font-bold">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-3" />
            <p className="text-sm">Loading requests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {visibleColumns.si && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</th>}
                  {visibleColumns.adsId && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Ads ID</th>}
                  {visibleColumns.adsTitle && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Ads Title</th>}
                  {visibleColumns.restaurantInfo && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant Info</th>}
                  {visibleColumns.scope && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Target Scope</th>}
                  {visibleColumns.duration && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Duration</th>}
                  {visibleColumns.price && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Price</th>}
                  {visibleColumns.status && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</th>}
                  {visibleColumns.actions && <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-20 text-center">
                      <p className="text-lg font-semibold text-slate-700 mb-1">No Data Found</p>
                      <p className="text-sm text-slate-500">No ad campaign requests match your view</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request, index) => (
                    <tr key={request._id} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-700">{index + 1}</span>
                        </td>
                      )}
                      {visibleColumns.adsId && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-slate-500">{request._id.slice(-8).toUpperCase()}</span>
                        </td>
                      )}
                      {visibleColumns.adsTitle && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{request.title}</span>
                            {request.description && <span className="text-xs text-slate-400 line-clamp-1">{request.description}</span>}
                          </div>
                        </td>
                      )}
                      {visibleColumns.restaurantInfo && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">{request.restaurantName}</span>
                              {request.restaurantAddress && (
                                <span className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">{request.restaurantAddress}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.scope && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1 w-fit">
                            {request.scope === "global" ? (
                              <>
                                <Globe className="w-3.5 h-3.5 text-slate-500" /> Global
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-slate-500" /> {request.zoneName || "Zone"}
                              </>
                            )}
                          </span>
                        </td>
                      )}
                      {visibleColumns.duration && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </span>
                        </td>
                      )}
                      {visibleColumns.price && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-slate-900 flex items-center">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {request.price || "0"}
                          </span>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${
                            request.status === "pending_pricing" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            request.status === "pending_payment" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            request.status === "paid" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            request.status === "live" ? "bg-green-50 text-green-700 border-green-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {request.status.replace("_", " ")}
                          </span>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewRequest(request)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {request.status === "pending_pricing" && (
                              <button
                                onClick={() => handleOpenPricing(request)}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                              >
                                Set Price
                              </button>
                            )}

                            {request.status === "paid" && (
                              <button
                                onClick={() => handleOpenApprove(request)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                              >
                                Make Live
                              </button>
                            )}

                            {(request.status === "pending_pricing" || request.status === "paid") && (
                              <button
                                onClick={() => handleOpenReject(request)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs p-1.5 rounded-lg border border-rose-200 transition-colors"
                                title="Reject Request"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-600" />
              Filter Requests
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Scope</label>
              <select
                value={filters.scope}
                onChange={(e) => setFilters(prev => ({ ...prev, scope: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="">All Scopes</option>
                <option value="global">Global</option>
                <option value="zone">Zone-based</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant</label>
              <select
                value={filters.restaurant}
                onChange={(e) => setFilters(prev => ({ ...prev, restaurant: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="">All Restaurants</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant} value={restaurant}>{restaurant}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-md"
              >
                Apply
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        visibleColumns={visibleColumns}
        toggleColumn={toggleColumn}
        resetColumns={resetColumns}
        columnsConfig={columnsConfig}
      />

      {/* View Request Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Advertisement Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="px-6 pb-6 space-y-5">
              <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {selectedRequest.mediaUrl && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                    <img src={selectedRequest.mediaUrl} alt="Campaign banner" className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedRequest.title}</h4>
                  {selectedRequest.description && <p className="text-xs text-slate-500 mt-1">{selectedRequest.description}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Ad Request ID</p>
                  <p className="text-sm font-mono font-bold text-slate-800">{selectedRequest._id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Restaurant Info</p>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedRequest.restaurantName}
                    {selectedRequest.restaurantAddress && ` - ${selectedRequest.restaurantAddress}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Scope Type</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">
                    {selectedRequest.scope} {selectedRequest.scope === "zone" && `(${selectedRequest.zoneName})`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Duration Range</p>
                  <p className="text-sm text-slate-800">
                    {new Date(selectedRequest.startDate).toLocaleDateString()} to {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Status</p>
                  <p className="text-sm font-bold capitalize text-slate-800">{selectedRequest.status.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Proposed Price</p>
                  <p className="text-sm font-bold text-slate-800">₹{selectedRequest.price || "0"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Set Pricing Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Set Ad Campaign Pricing</DialogTitle>
            <DialogDescription>
              Set the price restaurant needs to pay to run this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Total Price (INR) *</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="E.g., 5000"
                  value={pricingAmount}
                  onChange={(e) => setPricingAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                />
                <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPriceDialogOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-sm"
              >
                Submit Price
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve and Upload Banner Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-emerald-600">Design & Upload Ad Banner</DialogTitle>
            <DialogDescription>
              Upload the final banner designed for this restaurant's campaign to publish it live on the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Designed Banner Image *</label>
              <div
                onClick={() => approveFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-white"
              >
                <input
                  type="file"
                  ref={approveFileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {approveMediaPreview ? (
                  <div className="relative aspect-video max-h-32 mx-auto rounded-lg overflow-hidden border border-slate-200">
                    <img src={approveMediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="space-y-1 text-slate-400">
                    <Upload className="w-8 h-8 mx-auto mb-1 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600">Click to upload designed banner</p>
                    <p className="text-[10px]">JPG, PNG or WEBP (Max 5MB)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsApproveDialogOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveLive}
                disabled={isApproving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-sm flex items-center justify-center gap-2"
              >
                {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
                Approve & Launch Live
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-rose-600">Reject Ad Campaign Request</DialogTitle>
            <DialogDescription>
              Provide a reason to the restaurant explaining why the request was rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Reason for Rejection *</label>
              <textarea
                placeholder="E.g., Image size mismatch, invalid content..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:bg-white transition-all min-h-20"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejectDialogOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-sm"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
