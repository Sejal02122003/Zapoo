import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@food/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from "@food/components/ui/select"
import { Switch } from "@food/components/ui/switch"
import { Label } from "@food/components/ui/label"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from "recharts"
import {
  Activity, ArrowUpRight, ShoppingBag, CreditCard, Truck, Receipt, DollarSign, Store,
  UserCheck, Package, UserCircle, Clock, CheckCircle, Plus, XCircle, Zap,
  Building2, Phone, Mail, MapPin, ChevronDown, ChevronUp, Search, Eye, ExternalLink,
  ShieldCheck, Filter, Users, Copy, Check
} from "lucide-react"
import { adminAPI } from "@food/api"
const debugLog = () => {}
const debugError = () => {}

const INR_SYMBOL = "\u20B9"

function formatCurrency(amount, options = {}) {
  const numericAmount = Number(amount || 0)
  const formattedAmount = numericAmount.toLocaleString("en-IN", options)
  return `${INR_SYMBOL}${formattedAmount}`
}


export default function AdminHome() {
  const navigate = useNavigate()
  const [selectedZone, setSelectedZone] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("overall")
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [zones, setZones] = useState([])
  const [outletSearch, setOutletSearch] = useState("")
  const [outletFilter, setOutletFilter] = useState("all")
  const [expandedBrandIds, setExpandedBrandIds] = useState({})
  const [copiedPhone, setCopiedPhone] = useState(null)

  const toggleBrandExpand = (id) => {
    setExpandedBrandIds(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }))
  }

  const handleCopyPhone = (phone, e) => {
    e.stopPropagation()
    if (!phone) return
    navigator.clipboard?.writeText(phone)
    setCopiedPhone(phone)
    setTimeout(() => setCopiedPhone(null), 2000)
  }

  // Fetch zone list for filter
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await adminAPI.getZones({ page: 1, limit: 1000 })
        const list = response?.data?.data?.zones || []
        setZones(Array.isArray(list) ? list : [])
      } catch (error) {
        debugError("Error fetching zones:", error)
        setZones([])
      }
    }

    fetchZones()
  }, [])

  // Fetch dashboard stats from backend when filters change
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true)
        const params = {
          period: selectedPeriod,
          ...(selectedZone !== "all" ? { zoneId: selectedZone } : {}) }
        const response = await adminAPI.getDashboardStats(params)
        if (response.data?.success && response.data?.data) {
          setDashboardData(response.data.data)
          debugLog("Dashboard stats fetched:", response.data.data)
        } else {
          setDashboardData(null)
          debugError("Invalid dashboard response format:", response.data)
        }
      } catch (error) {
        setDashboardData(null)
        debugError("Error fetching dashboard stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardStats()
  }, [selectedZone, selectedPeriod])

  // Get order stats from real data
  const getOrderStats = () => {
    if (!dashboardData?.orders?.byStatus) {
      return [
        { label: "Delivered", value: 0, color: "#0ea5e9" },
        { label: "Cancelled", value: 0, color: "#ef4444" },
        { label: "Refunded", value: 0, color: "#f59e0b" },
        { label: "Pending", value: 0, color: "#10b981" },
      ]
    }

    const byStatus = dashboardData.orders.byStatus
    return [
      { label: "Delivered", value: byStatus.delivered || 0, color: "#0ea5e9" },
      { label: "Cancelled", value: byStatus.cancelled || 0, color: "#ef4444" },
      { label: "Refunded", value: 0, color: "#f59e0b" }, // Refunded not tracked separately
      { label: "Pending", value: byStatus.pending || 0, color: "#10b981" },
    ]
  }

  // Get monthly data from real data
  const getMonthlyData = () => {
    if (!dashboardData?.monthlyData || dashboardData.monthlyData.length === 0) {
      // Return empty data structure if no data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return monthNames.map(month => ({ month, commission: 0, revenue: 0, orders: 0 }))
    }

    // Use real monthly data from backend
    return dashboardData.monthlyData.map(item => ({
      month: item.month,
      commission: item.commission || 0,
      revenue: item.revenue || 0,
      orders: item.orders || 0
    }))
  }

  const orderStats = getOrderStats()
  const monthlyData = getMonthlyData()

  // Calculate totals from real data
  const revenueTotal = dashboardData?.revenue?.total || 0
  const commissionTotal = dashboardData?.commission?.total || 0
  const ordersTotal = dashboardData?.orders?.total || 0
  const platformFeeTotal = dashboardData?.platformFee?.total || 0
  const deliveryFeeTotal = dashboardData?.deliveryFee?.total || 0
  const gstTotal = dashboardData?.gst?.total || 0
  const totalAdminEarnings = dashboardData?.totalAdminEarnings || 0
  const cashbackTotal = dashboardData?.cashback?.totalCredited || 0
  const cashbackActiveInWallets = dashboardData?.cashback?.activeInWallets || 0

  // Additional stats
  const totalRestaurants = dashboardData?.restaurants?.total || 0
  const pendingRestaurantRequests = dashboardData?.restaurants?.pendingRequests || 0
  const totalDeliveryBoys = dashboardData?.deliveryBoys?.total || 0
  const pendingDeliveryBoyRequests = dashboardData?.deliveryBoys?.pendingRequests || 0
  const totalFoods = dashboardData?.foods?.total || 0
  const totalAddons = dashboardData?.addons?.total || 0
  const totalCustomers = dashboardData?.customers?.total || 0
  const pendingOrders = dashboardData?.orderStats?.pending || 0
  const processingOrders = dashboardData?.orderStats?.processing || 0
  const completedOrders = dashboardData?.orderStats?.completed || 0

  // Outlet stats & Brand Network
  const totalOutlets = dashboardData?.outlets?.total || 0
  const activeOutlets = dashboardData?.outlets?.active || 0
  const inactiveOutlets = dashboardData?.outlets?.inactive || 0
  const acceptingOrdersOutlets = dashboardData?.outlets?.acceptingOrders || 0
  const brandsWithOutlets = dashboardData?.brandsWithOutlets || []

  const filteredBrands = brandsWithOutlets.filter(brand => {
    if (outletSearch.trim()) {
      const q = outletSearch.toLowerCase().trim()
      const brandMatch =
        (brand.restaurantName && brand.restaurantName.toLowerCase().includes(q)) ||
        (brand.ownerName && brand.ownerName.toLowerCase().includes(q)) ||
        (brand.ownerPhone && String(brand.ownerPhone).includes(q)) ||
        (brand.ownerEmail && brand.ownerEmail.toLowerCase().includes(q)) ||
        (brand.phone && String(brand.phone).includes(q)) ||
        (brand.address?.city && brand.address.city.toLowerCase().includes(q)) ||
        (brand.address?.area && brand.address.area.toLowerCase().includes(q))

      const outletMatch = (brand.outlets || []).some(o =>
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.outletCode && o.outletCode.toLowerCase().includes(q)) ||
        (o.managerName && o.managerName.toLowerCase().includes(q)) ||
        (o.managerPhone && String(o.managerPhone).includes(q)) ||
        (o.phone && String(o.phone).includes(q)) ||
        (o.address?.city && o.address.city.toLowerCase().includes(q))
      )

      if (!brandMatch && !outletMatch) return false
    }

    if (outletFilter === "multi") return brand.outletsCount > 1
    if (outletFilter === "single") return brand.outletsCount === 1
    if (outletFilter === "active") return brand.activeOutletsCount > 0
    if (outletFilter === "with_orders") return (brand.ordersSummary?.totalOrders || 0) > 0
    return true
  })

  const pieData = orderStats.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.color }))

  const deliveryProfit = dashboardData?.deliveryProfit || 0
  const periodLabel = selectedPeriod === "overall" ? "Overall" : 
                    selectedPeriod === "today" ? "Today's" : 
                    `This ${selectedPeriod}'s`

  const activityFeed = dashboardData?.liveSignals || []
  const totalRevenueHelper = [
    `Comm: ${formatCurrency(commissionTotal)}`,
    `Platform: ${formatCurrency(platformFeeTotal)}`,
    `Delivery Net: ${formatCurrency(deliveryProfit)}`,
  ].join(" + ")

  return (
    <div className="px-4 pb-10 lg:px-6 pt-4">
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_120px_-60px_rgba(0,0,0,0.28)]">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm text-neutral-700 ring-1 ring-neutral-200">
              <span className="h-3 w-3 animate-ping rounded-full bg-neutral-800/70" />
              Updating metrics...
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 border-b border-neutral-200 bg-linear-to-br from-white via-neutral-50 to-neutral-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Overview</p>
              <h1 className="text-2xl font-semibold text-neutral-900">Operations Command</h1>
            </div>

          </div>
          <div className="flex flex-wrap items-center gap-4">

            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="min-w-[160px] border-neutral-300 bg-white text-neutral-900">
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent className="border-neutral-200 bg-white text-neutral-900">
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone._id} value={zone._id}>
                    {zone.zoneName || zone.name || "Unnamed Zone"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="min-w-[140px] border-neutral-300 bg-white text-neutral-900">
                <SelectValue placeholder="Overall" />
              </SelectTrigger>
              <SelectContent className="border-neutral-200 bg-white text-neutral-900">
                <SelectItem value="overall">Overall</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total revenue"
              value={formatCurrency(revenueTotal)}
              helper={`Net Profit: ${formatCurrency(totalAdminEarnings)}`}
              icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
              accent="bg-emerald-200/40"
              path="/admin/food/transaction-report"
            />
            <MetricCard
              title="Commission earned"
              value={formatCurrency(commissionTotal)}
              helper={`${periodLabel} restaurant cut`}
              icon={<ArrowUpRight className="h-5 w-5 text-indigo-600" />}
              accent="bg-indigo-200/40"
              path="/admin/food/restaurants/commission"
            />
            <MetricCard
              title="Orders processed"
              value={processingOrders.toLocaleString("en-IN")}
              helper="Orders currently being processed"
              icon={<Activity className="h-5 w-5 text-amber-600" />}
              accent="bg-amber-200/40"
              path="/admin/food/orders/processing"
            />
            <MetricCard
              title="Platform fee"
              value={formatCurrency(platformFeeTotal)}
              helper={`Platform service fees: ${periodLabel}`}
              icon={<CreditCard className="h-5 w-5 text-purple-600" />}
              accent="bg-purple-200/40"
              path="/admin/food/admin-earning-report"
            />
            <MetricCard
              title="Delivery fee"
              value={formatCurrency(deliveryFeeTotal)}
              helper={`Net Delivery: ${formatCurrency(deliveryProfit)}`}
              icon={<Truck className="h-5 w-5 text-blue-600" />}
              accent="bg-blue-200/40"
              path="/admin/food/transaction-report"
            />
            <MetricCard
              title="GST"
              value={formatCurrency(gstTotal)}
              helper={`${periodLabel} tax collected`}
              icon={<Receipt className="h-5 w-5 text-orange-600" />}
              accent="bg-orange-200/40"
              path="/admin/food/tax-report"
            />
            <MetricCard
              title="Cashback distributed"
              value={formatCurrency(cashbackTotal)}
              helper={`Active in Wallets: ${formatCurrency(cashbackActiveInWallets)}`}
              icon={<Zap className="h-5 w-5 text-purple-600" />}
              accent="bg-purple-200/40"
              path="/admin/food/cashback"
            />
            <MetricCard
              title="Total restaurants"
              value={totalRestaurants.toLocaleString("en-IN")}
              helper="Approved restaurants"
              icon={<Store className="h-5 w-5 text-blue-600" />}
              accent="bg-blue-200/40"
              path="/admin/food/restaurants"
            />
            <MetricCard
              title="Restaurant request pending"
              value={pendingRestaurantRequests.toLocaleString("en-IN")}
              helper="Awaiting approval"
              icon={<UserCheck className="h-5 w-5 text-orange-600" />}
              accent="bg-orange-200/40"
              path="/admin/food/restaurants/joining-request"
            />
            <MetricCard
              title="Total Outlets"
              value={totalOutlets.toLocaleString("en-IN")}
              helper={`${activeOutlets} active • ${acceptingOrdersOutlets} taking orders`}
              icon={<Building2 className="h-5 w-5 text-teal-600" />}
              accent="bg-teal-200/40"
              path="/admin/food/restaurants"
            />
            <MetricCard
              title="Active Outlets"
              value={activeOutlets.toLocaleString("en-IN")}
              helper={`${inactiveOutlets} inactive branches`}
              icon={<Store className="h-5 w-5 text-emerald-600" />}
              accent="bg-emerald-200/40"
              path="/admin/food/restaurants"
            />
            <MetricCard
              title="Total delivery boy"
              value={totalDeliveryBoys.toLocaleString("en-IN")}
              helper="Approved delivery partners"
              icon={<Truck className="h-5 w-5 text-indigo-600" />}
              accent="bg-indigo-200/40"
              path="/admin/food/delivery-partners"
            />
            <MetricCard
              title="Delivery boy request pending"
              value={pendingDeliveryBoyRequests.toLocaleString("en-IN")}
              helper="Awaiting verification"
              icon={<Clock className="h-5 w-5 text-yellow-600" />}
              accent="bg-yellow-200/40"
              path="/admin/food/delivery-partners/join-request"
            />
            <MetricCard
              title="Total foods"
              value={totalFoods.toLocaleString("en-IN")}
              helper="Approved menu items"
              icon={<Package className="h-5 w-5 text-purple-600" />}
              accent="bg-purple-200/40"
              path="/admin/food/foods"
            />
            <MetricCard
              title="Total addons"
              value={totalAddons.toLocaleString("en-IN")}
              helper="Approved addon items"
              icon={<Plus className="h-5 w-5 text-pink-600" />}
              accent="bg-pink-200/40"
              path="/admin/food/addons"
            />
            <MetricCard
              title="Total customers"
              value={totalCustomers.toLocaleString("en-IN")}
              helper="Registered users"
              icon={<UserCircle className="h-5 w-5 text-cyan-600" />}
              accent="bg-cyan-200/40"
              path="/admin/food/customers"
            />
            <MetricCard
              title="Pending orders"
              value={pendingOrders.toLocaleString("en-IN")}
              helper="Orders awaiting processing"
              icon={<Clock className="h-5 w-5 text-red-600" />}
              accent="bg-red-200/40"
              path="/admin/food/orders/pending"
            />
            <MetricCard
              title="Completed orders"
              value={completedOrders.toLocaleString("en-IN")}
              helper="Successfully delivered"
              icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
              accent="bg-emerald-200/40"
              path="/admin/food/orders/delivered"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Revenue trajectory</CardTitle>
                <p className="text-sm text-neutral-500">
                  Commission and total revenue with monthly order volume
                </p>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-80 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="comFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }}
                        labelStyle={{ color: "#111827" }}
                        itemStyle={{ color: "#111827" }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0ea5e9"
                        fillOpacity={1}
                        fill="url(#revFill)"
                        name="Total revenue"
                      />
                      <Area
                        type="monotone"
                        dataKey="commission"
                        stroke="#a855f7"
                        fillOpacity={1}
                        fill="url(#comFill)"
                        name="Commission"
                      />
                      <Bar
                        dataKey="orders"
                        fill="#ef4444"
                        radius={[6, 6, 0, 0]}
                        name="Orders"
                        barSize={10}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <CardTitle className="text-lg text-neutral-900">Order mix</CardTitle>
                  <p className="text-sm text-neutral-500">Distribution by state</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                  {orderStats.reduce((s, o) => s + o.value, 0)} orders
                </span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }}
                        labelStyle={{ color: "#111827" }}
                        itemStyle={{ color: "#111827" }}
                      />
                      <Legend
                        formatter={(value) => <span style={{ color: "#111827", fontSize: 12 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {orderStats.map((item) => (
                    <div
                      key={item.label}
                    onClick={() => {
                        const routes = {
                          'Delivered': '/admin/food/orders/delivered',
                          'Cancelled': '/admin/food/orders/canceled',
                          'Refunded': '/admin/food/orders/refunded',
                          'Pending': '/admin/food/orders/pending'
                        }
                        navigate(routes[item.label] || '/admin/food/orders/all')
                      }}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125" style={{ background: item.color }} />
                        <p className="text-sm text-neutral-800 group-hover:text-neutral-900">{item.label}</p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 border-neutral-200 bg-white">
              <CardHeader className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Momentum snapshot</CardTitle>
                <span className="text-xs text-neutral-500">Summary: {ordersTotal} Orders</span>
              </CardHeader>
              <CardContent className="min-w-0 pt-4">
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={monthlyData.slice(-6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }}
                        labelStyle={{ color: "#111827" }}
                        itemStyle={{ color: "#111827" }}
                      />
                      <Legend />
                      <Bar dataKey="orders" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Orders" />
                      <Bar dataKey="commission" fill="#a855f7" radius={[8, 8, 0, 0]} name="Commission" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Live signals</CardTitle>
                <p className="text-sm text-neutral-500">Ops notes and service health</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 h-[300px] overflow-y-auto custom-scrollbar">
                {activityFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-neutral-400">
                    <Activity className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">No recent signals</p>
                  </div>
                ) : (
                  activityFeed.map((item, idx) => {
                    const getIcon = (type) => {
                      switch (type) {
                        case "order_pending":
                          return <Clock className="h-4 w-4 text-amber-600" />
                        case "order_delivered":
                          return <CheckCircle className="h-4 w-4 text-emerald-600" />
                        case "order_cancelled":
                          return <XCircle className="h-4 w-4 text-red-600" />
                        case "restaurant":
                          return <Store className="h-4 w-4 text-blue-600" />
                        case "delivery":
                          return <Truck className="h-4 w-4 text-purple-600" />
                        case "customer":
                          return <UserCircle className="h-4 w-4 text-pink-600" />
                        default:
                          return <Activity className="h-4 w-4 text-neutral-600" />
                      }
                    }

                    const getBg = (type) => {
                      switch (type) {
                        case "order_pending":
                          return "bg-amber-50"
                        case "order_delivered":
                          return "bg-emerald-50"
                        case "order_cancelled":
                          return "bg-red-50"
                        case "restaurant":
                          return "bg-blue-50"
                        case "delivery":
                          return "bg-purple-50"
                        case "customer":
                          return "bg-pink-50"
                        default:
                          return "bg-neutral-50"
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 rounded-xl border border-neutral-200 ${getBg(item.type)} px-3 py-3 hover:border-neutral-300 transition-all`}
                      >
                        <div className="mt-0.5">{getIcon(item.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-neutral-900 truncate">{item.title}</p>
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{item.time}</span>
                          </div>
                          <p className="text-xs text-neutral-600 line-clamp-1">{item.detail}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <CardTitle className="text-lg text-neutral-900">Order states</CardTitle>
                <p className="text-sm text-neutral-500">Quick glance by status (Click to view orders)</p>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                {orderStats.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => {
                      const routes = {
                        'Delivered': '/admin/food/orders/delivered',
                        'Cancelled': '/admin/food/orders/canceled',
                        'Refunded': '/admin/food/orders/refunded',
                        'Pending': '/admin/food/orders/pending'
                      }
                      navigate(routes[item.label] || '/admin/food/orders/all')
                    }}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-white px-3.5 py-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-neutral-300 group active:scale-[0.98]"
                    title={`Click to view all ${item.label} orders`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-neutral-900 transition-transform duration-200 group-hover:scale-110 shadow-xs"
                        style={{ background: `${item.color}1A`, color: item.color }}
                      >
                        {item.label.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 group-hover:text-orange-600 transition-colors">{item.label}</p>
                        <p className="text-[11px] text-neutral-500 font-medium">Tracked in {selectedPeriod}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-neutral-900">{item.value}</span>
                      <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-orange-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Brand Owners & Outlets Command Hub */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <h2 className="text-xl font-bold text-neutral-900">Brand Owners & Outlets Directory</h2>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                    {brandsWithOutlets.length} Brands • {totalOutlets} Outlets
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  Comprehensive network overview of brand owners, branch managers, live outlet operational status, and order performance
                </p>
              </div>

              {/* Quick stats pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Total Brands: <strong className="text-neutral-900">{brandsWithOutlets.length}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  Total Outlets: <strong className="text-neutral-900">{totalOutlets}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Active: <strong className="text-neutral-900">{activeOutlets}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Taking Orders: <strong className="text-emerald-900">{acceptingOrdersOutlets}</strong>
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search brand, owner name, phone, outlet name, code, manager, city..."
                  value={outletSearch}
                  onChange={(e) => setOutletSearch(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-10 pr-12 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {outletSearch && (
                  <button
                    onClick={() => setOutletSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400 hover:text-neutral-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: `All (${brandsWithOutlets.length})` },
                  { id: "multi", label: `Multi-Outlet (${brandsWithOutlets.filter(b => b.outletsCount > 1).length})` },
                  { id: "single", label: `Single Outlet (${brandsWithOutlets.filter(b => b.outletsCount === 1).length})` },
                  { id: "active", label: `Active (${brandsWithOutlets.filter(b => b.activeOutletsCount > 0).length})` },
                  { id: "with_orders", label: `With Orders (${brandsWithOutlets.filter(b => (b.ordersSummary?.totalOrders || 0) > 0).length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setOutletFilter(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      outletFilter === tab.id
                        ? "bg-neutral-900 text-white shadow-xs"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand and Outlets Cards */}
            <div className="mt-5 space-y-4">
              {filteredBrands.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-12 text-center">
                  <Building2 className="h-10 w-10 text-neutral-300 mb-2" />
                  <p className="text-sm font-semibold text-neutral-700">No brand owners or outlets found</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {outletSearch ? `No matches for "${outletSearch}". Try a different search term.` : "No outlets configured."}
                  </p>
                </div>
              ) : (
                filteredBrands.map((brand) => {
                  const isExpanded = expandedBrandIds[brand._id] !== false
                  const hasOutlets = (brand.outlets || []).length > 0

                  return (
                    <div
                      key={brand._id}
                      className="rounded-2xl border border-neutral-200 bg-white transition-all duration-200 hover:border-neutral-300 hover:shadow-md overflow-hidden"
                    >
                      {/* Brand Header */}
                      <div className="bg-neutral-50/80 p-4 sm:p-5 border-b border-neutral-200">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          {/* Brand Info */}
                          <div className="flex items-start gap-3.5">
                            {brand.profileImage ? (
                              <img
                                src={brand.profileImage}
                                alt={brand.restaurantName}
                                className="h-12 w-12 rounded-xl object-cover ring-1 border border-neutral-200 shadow-xs shrink-0"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-base font-bold text-white shadow-xs">
                                {(brand.restaurantName || "R").slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-neutral-900">{brand.restaurantName}</h3>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  brand.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : brand.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-neutral-100 text-neutral-700'
                                }`}>
                                  <ShieldCheck className="h-3 w-3" />
                                  {brand.status ? brand.status.charAt(0).toUpperCase() + brand.status.slice(1) : 'Unknown'}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                  <Building2 className="h-3 w-3" />
                                  {brand.outletsCount} {brand.outletsCount === 1 ? 'Branch' : 'Branches'}
                                </span>
                                {brand.isVegetarian && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                    PURE VEG
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                                {brand.address?.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                                    {brand.address.area ? `${brand.address.area}, ` : ''}{brand.address.city}
                                  </span>
                                )}
                                {brand.cuisines?.length > 0 && (
                                  <span className="text-neutral-400">
                                    • {brand.cuisines.slice(0, 3).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Brand Owner Profile Card */}
                          <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-xs">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-700 font-bold text-xs">
                                <UserCircle className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-neutral-400">Brand Owner</p>
                                <p className="text-xs font-bold text-neutral-800">{brand.ownerName || 'Not specified'}</p>
                              </div>
                            </div>

                            <div className="h-6 w-px bg-neutral-200 hidden sm:block" />

                            {/* Owner Phone */}
                            {brand.ownerPhone && brand.ownerPhone !== 'N/A' && (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${brand.ownerPhone}`}
                                  className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-teal-600 font-medium bg-neutral-50 hover:bg-teal-50 px-2 py-1 rounded-lg transition-colors"
                                  title="Call Owner"
                                >
                                  <Phone className="h-3.5 w-3.5 text-teal-600" />
                                  <span>{brand.ownerPhone}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyPhone(brand.ownerPhone, e)}
                                  className="text-neutral-400 hover:text-neutral-700 p-1"
                                  title="Copy Phone"
                                >
                                  {copiedPhone === brand.ownerPhone ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Owner Email */}
                            {brand.ownerEmail && brand.ownerEmail !== 'N/A' && (
                              <a
                                href={`mailto:${brand.ownerEmail}`}
                                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-indigo-600 font-medium bg-neutral-50 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors truncate max-w-[180px]"
                                title={brand.ownerEmail}
                              >
                                <Mail className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate">{brand.ownerEmail}</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Performance Strip & Actions */}
                        <div className="mt-3.5 pt-3.5 border-t border-neutral-200/70 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-lg bg-white px-2.5 py-1 border border-neutral-200 font-medium text-neutral-700">
                              Total Orders: <strong className="text-neutral-900">{brand.ordersSummary?.totalOrders || 0}</strong>
                            </span>
                            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 border border-emerald-200 font-medium text-emerald-800">
                              Delivered: <strong className="text-emerald-900">{brand.ordersSummary?.deliveredOrders || 0}</strong>
                            </span>
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 border border-blue-200 font-medium text-blue-800">
                              GMV Revenue: <strong className="text-blue-900">{formatCurrency(brand.ordersSummary?.totalRevenue || 0)}</strong>
                            </span>
                            {brand.ordersSummary?.commission > 0 && (
                              <span className="rounded-lg bg-purple-50 px-2.5 py-1 border border-purple-200 font-medium text-purple-800">
                                Commission: <strong className="text-purple-900">{formatCurrency(brand.ordersSummary?.commission)}</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/food/orders/all?restaurantId=${brand._id}`)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <ShoppingBag className="h-3.5 w-3.5 text-neutral-500" />
                              View Orders
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleBrandExpand(brand._id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg transition-all"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  Hide Outlets ({brand.outletsCount})
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                  Show Outlets ({brand.outletsCount})
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Outlets List Body */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5">
                          {!hasOutlets ? (
                            <div className="py-4 text-center text-xs text-neutral-400 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
                              No separate branch outlets configured under this brand yet.
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {brand.outlets.map((outlet) => {
                                const isOnline = outlet.isAcceptingOrders !== false && outlet.status === 'active'

                                return (
                                  <div
                                    key={outlet._id}
                                    className="rounded-xl border border-neutral-200 bg-white p-3.5 hover:border-teal-300 hover:shadow-sm transition-all flex flex-col justify-between"
                                  >
                                    <div>
                                      {/* Top Row: Code & Status */}
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-0.5 text-[11px] font-mono font-bold text-white shadow-xs">
                                          {outlet.outletCode || "OUTLET"}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            outlet.status === 'active'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-neutral-100 text-neutral-600'
                                          }`}>
                                            {outlet.status ? outlet.status.toUpperCase() : 'ACTIVE'}
                                          </span>
                                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            isOnline
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                                          }`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                                            {isOnline ? 'Online' : 'Paused'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Outlet Name */}
                                      <h4 className="text-sm font-bold text-neutral-900 mb-1.5 truncate" title={outlet.name}>
                                        {outlet.name}
                                      </h4>

                                      {/* Manager details */}
                                      <div className="space-y-1 text-xs text-neutral-600 mb-3">
                                        {outlet.managerName && (
                                          <p className="flex items-center gap-1.5 font-medium text-neutral-800">
                                            <UserCheck className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                                            <span>Mgr: {outlet.managerName}</span>
                                          </p>
                                        )}
                                        {outlet.managerPhone && (
                                          <p className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                            <a href={`tel:${outlet.managerPhone}`} className="hover:text-teal-600 hover:underline">
                                              {outlet.managerPhone}
                                            </a>
                                          </p>
                                        )}
                                        {outlet.address?.city && (
                                          <p className="flex items-center gap-1.5 text-[11px] text-neutral-500 truncate" title={outlet.address.formattedAddress || `${outlet.address.area}, ${outlet.address.city}`}>
                                            <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                                            <span className="truncate">{outlet.address.area ? `${outlet.address.area}, ` : ''}{outlet.address.city}</span>
                                          </p>
                                        )}
                                        {outlet.timings?.openTime && (
                                          <p className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                                            <Clock className="h-3.5 w-3.5 shrink-0" />
                                            <span>{outlet.timings.openTime} - {outlet.timings.closeTime}</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Outlet Stats footer */}
                                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                                      <span className="text-neutral-500 font-medium">
                                        Orders: <strong className="text-neutral-900">{outlet.totalOrders || 0}</strong>
                                      </span>
                                      {outlet.totalRevenue > 0 && (
                                        <span className="text-emerald-700 font-bold">
                                          {formatCurrency(outlet.totalRevenue)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, helper, icon, accent, path }) {
  const navigate = useNavigate()
  return (
    <Card
      className="group relative overflow-hidden border-neutral-200 bg-white p-0 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
      onClick={() => path && navigate(path)}
    >
      <CardContent className="relative flex flex-col gap-2 px-4 pb-4 pt-4 h-full">
        <div className={`absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-60 ${accent}`} />
        <div className="relative flex items-center justify-between z-10">
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-bold mb-1 truncate">{title}</p>
            <p className="text-xl font-bold text-neutral-900 leading-tight mb-1">{value}</p>
            <p className="text-[10px] text-neutral-500 font-medium line-clamp-1">{helper}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 ring-1 ring-neutral-200 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-md">
            {icon}
          </div>
        </div>
        <div className="absolute bottom-2 right-2 opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
          <ArrowUpRight className="h-3 w-3 text-neutral-400" />
        </div>
      </CardContent>
    </Card>
  )
}

