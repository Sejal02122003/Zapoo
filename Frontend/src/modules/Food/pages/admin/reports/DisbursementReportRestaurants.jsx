import { useState, useMemo, useEffect } from "react"
import { Search, Download, ChevronDown, Filter, UtensilsCrossed, Eye, ArrowUpDown, Info, Settings, FileText, FileSpreadsheet, Code, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { emptyDisbursementReportRestaurants, emptyDisbursementStats } from "@food/utils/adminFallbackData"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

// Import icons from Transaction-report-icons
import pendingIcon from "@food/assets/Dashboard-icons/pending.svg"
import completedIcon from "@food/assets/Dashboard-icons/delivered.svg"
import canceledIcon from "@food/assets/Dashboard-icons/canceled.svg"

export default function DisbursementReportRestaurants() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [disbursements, setDisbursements] = useState([])
  const [stats, setStats] = useState(emptyDisbursementStats)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDisbursement, setSelectedDisbursement] = useState(null)
  const [zones, setZones] = useState([])

  const [filters, setFilters] = useState({
    zone: "All Zones",
    restaurant: "All restaurants",
    paymentMethod: "All Payment Method",
    status: "All status",
    time: "All Time" 
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const fetchDisbursements = async () => {
    setIsLoading(true)
    try {
        const { data } = await adminAPI.getDisbursements({
          targetType: "restaurant",
          search: searchQuery
        })
      if (data.success) {
        // Map the backend data to frontend format
        const mappedData = data.data.disbursements.map((d, index) => ({
          sl: index + 1,
          id: d._id.substring(d._id.length - 6).toUpperCase(), // Shorten ID
          restaurantName: d.targetId ? d.targetId.restaurantName : 'Unknown',
          zoneName: d.targetId?.zone?.name || 'Unknown',
          createdAt: new Date(d.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          disburseAmount: d.amount,
          paymentMethod: d.paymentMethod,
          status: d.status.charAt(0).toUpperCase() + d.status.slice(1)
        }))
        setDisbursements(mappedData)
        setStats(data.data.stats || emptyDisbursementStats)
      } else {
        toast.error(data.message || "Failed to fetch disbursements")
      }
    } catch (error) {
      toast.error("Error connecting to server")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch when search changes (or initially)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDisbursements()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    adminAPI.getZones().then(res => {
      if (res?.data?.success) {
        setZones(res.data.data.zones || res.data.data)
      }
    }).catch(err => console.error("Error fetching zones", err))
  }, [])

  const filteredDisbursements = disbursements.filter(d => {
    let match = true

    // Note: We might not have zoneName for restaurants populated, this requires backend support.
    if (filters.zone !== "All Zones") {
      if (d.zoneName && d.zoneName !== "Unknown" && d.zoneName !== filters.zone) match = false
    }

    if (filters.status !== "All status") {
      if (d.status.toLowerCase() !== filters.status.toLowerCase()) match = false
    }

    if (filters.paymentMethod !== "All Payment Method") {
      const pmMap = { "UPI": "upi", "Bank Transfer": "bank_transfer", "Cash": "cash" }
      const normalizedPM = pmMap[filters.paymentMethod] || filters.paymentMethod.toLowerCase()
      if (d.paymentMethod !== normalizedPM) match = false
    }

    if (filters.restaurant !== "All Restaurants") {
      if (d.restaurantName !== filters.restaurant) match = false
    }

    if (filters.time !== "All Time") {
      const date = new Date(d.createdAt)
      const now = new Date()
      if (filters.time === "Today") {
        if (date.toDateString() !== now.toDateString()) match = false
      } else if (filters.time === "This Week") {
        const weekAgo = new Date(now.setDate(now.getDate() - 7))
        if (date < weekAgo) match = false
      } else if (filters.time === "This Month") {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
        if (date < monthAgo) match = false
      }
    }

    return match
  })


  const totalDisbursements = filteredDisbursements.length

  const handleExport = (format) => {
    if (filteredDisbursements.length === 0) {
      alert("No data to export")
      return
    }
    const headers = [
      { key: "sl", label: "SI" },
      { key: "id", label: "ID" },
      { key: "restaurantName", label: "Restaurant Info" },
      { key: "createdAt", label: "Created At" },
      { key: "disburseAmount", label: "Disburse Amount" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "status", label: "Status" },
    ]
    switch (format) {
      case "csv": exportReportsToCSV(filteredDisbursements, headers, "disbursement_report_restaurants"); break
      case "excel": exportReportsToExcel(filteredDisbursements, headers, "disbursement_report_restaurants"); break
      case "pdf": exportReportsToPDF(filteredDisbursements, headers, "disbursement_report_restaurants", "Restaurant Disbursement Report"); break
      case "json": exportReportsToJSON(filteredDisbursements, "disbursement_report_restaurants"); break
    }
  }

  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  }

  const formatCurrency = (amount) => {
    if (amount >= 1000) {
      return `\u20B9 ${(amount / 1000).toFixed(2)}K`
    }
    return `\u20B9 ${Number(amount || 0).toFixed(2)}`
  }

  const handleResetFilters = () => {
    setFilters({
      zone: "All Zones",
      restaurant: "All restaurants",
      paymentMethod: "All Payment Method",
      status: "All status",
      time: "All Time" })
  }

  const activeFiltersCount = (filters.zone !== "All Zones" ? 1 : 0) + (filters.restaurant !== "All restaurants" ? 1 : 0) + (filters.paymentMethod !== "All Payment Method" ? 1 : 0) + (filters.status !== "All status" ? 1 : 0) + (filters.time !== "All Time" ? 1 : 0)

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Restaurant Disbursement Report</h1>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Pending Disbursements */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <div className="absolute top-4 right-4">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Info className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 relative">
                <img src={pendingIcon} alt="Pending" className="w-10 h-10" />
              </div>
              <p className="text-2xl font-bold text-green-600 mb-1">{formatCurrency(stats.pending || 0)}</p>
              <p className="text-sm text-slate-600">Pending Disbursements</p>
            </div>
          </div>

          {/* Completed Disbursements */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <div className="absolute top-4 right-4">
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                <Info className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center mb-4">
                <img src={completedIcon} alt="Completed" className="w-10 h-10" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(stats.completed || 0)}</p>
              <p className="text-sm text-slate-600">Completed Disbursements</p>
            </div>
          </div>

          {/* Canceled Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <div className="absolute top-4 right-4">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <Info className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4 relative">
                <img src={canceledIcon} alt="Canceled" className="w-10 h-10" />
              </div>
              <p className="text-2xl font-bold text-red-600 mb-1">{formatCurrency(stats.canceled || 0)}</p>
              <p className="text-sm text-slate-600">Canceled Transactions</p>
            </div>
          </div>
        </div>

        {/* Search Data Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Search Data</h3>
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Zone
                </label>
                <select
                  value={filters.zone}
                  onChange={(e) => setFilters(prev => ({ ...prev, zone: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All Zones">All Zones</option>
                  {zones?.length > 0 && zones.map(z => (
                    <option key={z._id} value={z.name}>{z.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Restaurant
                </label>
                <select
                  value={filters.restaurant}
                  onChange={(e) => setFilters(prev => ({ ...prev, restaurant: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All Restaurants">All Restaurants</option>
                  {Array.from(new Set(disbursements.map(d => d.restaurantName))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All Payment Method">All Payment Method</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All status">All status</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Time
                </label>
                <select
                  value={filters.time}
                  onChange={(e) => setFilters(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full sm:w-48 px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="This Year">This Year</option>
                </select>
                <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              <div className="flex items-end gap-2">
                <button 
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Reset
                </button>
                <button 
                  onClick={handleFilterApply}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2 relative ${
                    activeFiltersCount > 0 ? "ring-2 ring-blue-300" : ""
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Total Disbursements Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Total Disbursements {totalDisbursements}</h2>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by id"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                    <Download className="w-4 h-4" />
                    <span className="text-black font-bold">Export</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
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
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>SI</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Id</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Restaurant Info</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Created At</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Disburse Amount</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Payment Method</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredDisbursements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-lg font-semibold text-slate-700 mb-1">No Data Found</p>
                        <p className="text-sm text-slate-500">No disbursements match your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDisbursements.map((disbursement) => (
                    <tr key={disbursement.sl} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-700">{disbursement.sl}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900">{disbursement.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-700">{disbursement.restaurantName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-700">{disbursement.createdAt}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900">{formatCurrency(disbursement.disburseAmount)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-700">{disbursement.paymentMethod}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {disbursement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelectedDisbursement(disbursement)}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedDisbursement} onOpenChange={(open) => !open && setSelectedDisbursement(null)}>
        <DialogContent className="sm:max-w-lg p-6 bg-white rounded-2xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl font-bold text-slate-800">Disbursement Details</DialogTitle>
          </DialogHeader>
          {selectedDisbursement && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">ID</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedDisbursement.id}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Restaurant Info</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedDisbursement.restaurantName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Created At</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedDisbursement.createdAt}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Disburse Amount</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedDisbursement.disburseAmount)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Payment Method</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{selectedDisbursement.paymentMethod.replace('_', ' ')}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedDisbursement.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-700' : 
                    selectedDisbursement.status.toLowerCase() === 'pending' ? 'bg-orange-100 text-orange-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedDisbursement.status}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 border-t border-slate-100 sm:justify-end">
            <button
              onClick={() => setSelectedDisbursement(null)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Report Settings
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <p className="text-sm text-slate-700">
              Restaurant disbursement report settings and preferences will be available here.
            </p>
          </div>
          <div className="px-6 pb-6 flex items-center justify-end">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
