import { useState, useEffect } from "react"
import { Save, Loader2, DollarSign, Plus, Trash2, Edit, Check, X } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


// Fee Settings Component - Range-based delivery fee configuration
export default function FeeSettings() {
  const [feeSettings, setFeeSettings] = useState({
    deliveryFeeType: "range",
    slabDistance: "",
    slabPrice: "",
    extraPricePerKm: "",
    deliveryFee: "",
    deliveryFeeRanges: [],
    riderPayoutType: "range",
    riderSlabDistance: "",
    riderSlabPrice: "",
    riderExtraPricePerKm: "",
    riderBasePayout: "",
    riderPayoutRanges: [],
    freeDeliveryUpTo: "",
    freeDeliveryThreshold: "",
    platformFee: "",
    takeawayPlatformFee: "",
    packagingFee: "",
    gstRate: "",
    gstOnDeliveryFee: "",
    gstOnPlatformFee: "",
    gstOnTakeawayPlatformFee: "",
    gstOnPackagingFee: "",
    deliveryBonusAmount: "",
    dispatchRadiusTiers: "2, 4, 6, 8, 10"
  })
  const [loadingFeeSettings, setLoadingFeeSettings] = useState(false)
  const [savingFeeSettings, setSavingFeeSettings] = useState(false)
  
  // Customer Range state
  const [editingRangeIndex, setEditingRangeIndex] = useState(null)
  const [newRange, setNewRange] = useState({ min: '', max: '', fee: '' })

  // Rider Range state
  const [editingRiderRangeIndex, setEditingRiderRangeIndex] = useState(null)
  const [newRiderRange, setNewRiderRange] = useState({ min: '', max: '', pay: '' })

  // Fetch fee settings
  const fetchFeeSettings = async () => {
    try {
      setLoadingFeeSettings(true)
      const response = await adminAPI.getFeeSettings()
      if (response.data.success && response.data.data.feeSettings) {
        setFeeSettings({
          deliveryFeeType: response.data.data.feeSettings.deliveryFeeType ?? "range",
          slabDistance: response.data.data.feeSettings.slabDistance ?? "",
          slabPrice: response.data.data.feeSettings.slabPrice ?? "",
          extraPricePerKm: response.data.data.feeSettings.extraPricePerKm ?? "",
          deliveryFee: response.data.data.feeSettings.deliveryFee ?? "",
          deliveryFeeRanges: response.data.data.feeSettings.deliveryFeeRanges || [],
          riderPayoutType: response.data.data.feeSettings.riderPayoutType ?? "range",
          riderBasePayout: response.data.data.feeSettings.riderBasePayout ?? "",
          riderPayoutRanges: response.data.data.feeSettings.riderPayoutRanges || [],
          freeDeliveryUpTo: response.data.data.feeSettings.freeDeliveryUpTo ?? "",
          freeDeliveryThreshold: response.data.data.feeSettings.freeDeliveryThreshold ?? "",
          discountDeliveryThreshold: response.data.data.feeSettings.discountDeliveryThreshold ?? "",
          discountedDeliveryFee: response.data.data.feeSettings.discountedDeliveryFee ?? "",
          platformFee: response.data.data.feeSettings.platformFee ?? "",
          takeawayPlatformFee: response.data.data.feeSettings.takeawayPlatformFee ?? "",
          packagingFee: response.data.data.feeSettings.packagingFee ?? "",
          gstRate: response.data.data.feeSettings.gstRate ?? "",
          gstOnDeliveryFee: response.data.data.feeSettings.gstOnDeliveryFee ?? "",
          gstOnPlatformFee: response.data.data.feeSettings.gstOnPlatformFee ?? "",
          gstOnTakeawayPlatformFee: response.data.data.feeSettings.gstOnTakeawayPlatformFee ?? "",
          gstOnPackagingFee: response.data.data.feeSettings.gstOnPackagingFee ?? "",
          deliveryBonusAmount: response.data.data.feeSettings.deliveryBonusAmount ?? "",
          dispatchRadiusTiers: response.data.data.feeSettings.dispatchRadiusTiers?.join(", ") ?? "2, 4, 6, 8, 10"
        })
      } else if (response.data.success && response.data.data.feeSettings === null) {
        setFeeSettings({
          deliveryFeeType: "range",
          slabDistance: "",
          slabPrice: "",
          extraPricePerKm: "",
          deliveryFee: "",
          deliveryFeeRanges: [],
          riderPayoutType: "range",
          riderBasePayout: "",
          riderPayoutRanges: [],
          freeDeliveryUpTo: "",
          freeDeliveryThreshold: "",
          discountDeliveryThreshold: "",
          discountedDeliveryFee: "",
          platformFee: "",
          takeawayPlatformFee: "",
          packagingFee: "",
          gstRate: "",
          gstOnDeliveryFee: "",
          gstOnPlatformFee: "",
          gstOnTakeawayPlatformFee: "",
          gstOnPackagingFee: "",
          deliveryBonusAmount: "",
          dispatchRadiusTiers: "2, 4, 6, 8, 10"
        })
      }
    } catch (error) {
      debugError('Error fetching fee settings:', error)
      toast.error('Failed to load fee settings')
    } finally {
      setLoadingFeeSettings(false)
    }
  }

  // Fetch fee settings on mount
  useEffect(() => {
    fetchFeeSettings()
  }, [])

  // Save fee settings
  const handleSaveFeeSettings = async () => {
    try {
      setSavingFeeSettings(true)
      const response = await adminAPI.createOrUpdateFeeSettings({
        deliveryFeeType: feeSettings.deliveryFeeType,
        slabDistance: feeSettings.slabDistance === "" ? undefined : Number(feeSettings.slabDistance),
        slabPrice: feeSettings.slabPrice === "" ? undefined : Number(feeSettings.slabPrice),
        extraPricePerKm: feeSettings.extraPricePerKm === "" ? undefined : Number(feeSettings.extraPricePerKm),
        deliveryFee: feeSettings.deliveryFee === "" ? undefined : Number(feeSettings.deliveryFee),
        deliveryFeeRanges: feeSettings.deliveryFeeRanges,
        riderPayoutType: feeSettings.riderPayoutType,
        riderBasePayout: feeSettings.riderBasePayout === "" ? undefined : Number(feeSettings.riderBasePayout),
        riderPayoutRanges: feeSettings.riderPayoutRanges,
        freeDeliveryUpTo: feeSettings.freeDeliveryUpTo === "" ? undefined : Number(feeSettings.freeDeliveryUpTo),
        freeDeliveryThreshold: feeSettings.freeDeliveryThreshold === "" ? undefined : Number(feeSettings.freeDeliveryThreshold),
        discountDeliveryThreshold: feeSettings.discountDeliveryThreshold === "" ? undefined : Number(feeSettings.discountDeliveryThreshold),
        discountedDeliveryFee: feeSettings.discountedDeliveryFee === "" ? undefined : Number(feeSettings.discountedDeliveryFee),
        platformFee: feeSettings.platformFee === "" ? undefined : Number(feeSettings.platformFee),
        takeawayPlatformFee: feeSettings.takeawayPlatformFee === "" ? undefined : Number(feeSettings.takeawayPlatformFee),
        packagingFee: feeSettings.packagingFee === "" ? undefined : Number(feeSettings.packagingFee),
        gstRate: feeSettings.gstRate === "" ? undefined : Number(feeSettings.gstRate),
        gstOnDeliveryFee: feeSettings.gstOnDeliveryFee === "" ? undefined : Number(feeSettings.gstOnDeliveryFee),
        gstOnPlatformFee: feeSettings.gstOnPlatformFee === "" ? undefined : Number(feeSettings.gstOnPlatformFee),
        gstOnTakeawayPlatformFee: feeSettings.gstOnTakeawayPlatformFee === "" ? undefined : Number(feeSettings.gstOnTakeawayPlatformFee),
        gstOnPackagingFee: feeSettings.gstOnPackagingFee === "" ? undefined : Number(feeSettings.gstOnPackagingFee),
        deliveryBonusAmount: feeSettings.deliveryBonusAmount === "" ? undefined : Number(feeSettings.deliveryBonusAmount),
        dispatchRadiusTiers: feeSettings.dispatchRadiusTiers ? feeSettings.dispatchRadiusTiers.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)) : undefined,
        isActive: true
      })

      if (response.data.success) {
        toast.success('Fee settings saved successfully')
        // Avoid an extra API call; update local state from response
        const saved = response?.data?.data?.feeSettings
        if (saved) {
          setFeeSettings({
            deliveryFeeType: saved.deliveryFeeType ?? "range",
            slabDistance: saved.slabDistance ?? "",
            slabPrice: saved.slabPrice ?? "",
            extraPricePerKm: saved.extraPricePerKm ?? "",
            deliveryFee: saved.deliveryFee ?? "",
            deliveryFeeRanges: saved.deliveryFeeRanges ?? [],
            riderPayoutType: saved.riderPayoutType ?? "range",
            riderBasePayout: saved.riderBasePayout ?? "",
            riderPayoutRanges: saved.riderPayoutRanges ?? [],
            freeDeliveryUpTo: saved.freeDeliveryUpTo ?? "",
            freeDeliveryThreshold: saved.freeDeliveryThreshold ?? "",
            discountDeliveryThreshold: saved.discountDeliveryThreshold ?? "",
            discountedDeliveryFee: saved.discountedDeliveryFee ?? "",
            platformFee: saved.platformFee ?? "",
            takeawayPlatformFee: saved.takeawayPlatformFee ?? "",
            packagingFee: saved.packagingFee ?? "",
            gstRate: saved.gstRate ?? "",
            gstOnDeliveryFee: saved.gstOnDeliveryFee ?? "",
            gstOnPlatformFee: saved.gstOnPlatformFee ?? "",
            gstOnTakeawayPlatformFee: saved.gstOnTakeawayPlatformFee ?? "",
            gstOnPackagingFee: saved.gstOnPackagingFee ?? "",
            deliveryBonusAmount: saved.deliveryBonusAmount ?? "",
            dispatchRadiusTiers: saved.dispatchRadiusTiers?.join(", ") ?? "2, 4, 6, 8, 10" })
        }
      } else {
        toast.error(response.data.message || 'Failed to save fee settings')
      }
    } catch (error) {
      debugError('Error saving fee settings:', error)
      toast.error(error.response?.data?.message || 'Failed to save fee settings')
    } finally {
      setSavingFeeSettings(false)
    }
  }

  // Add new delivery fee range
  const handleAddRange = () => {
    if (newRange.min === '' || newRange.max === '' || newRange.fee === '') {
      toast.error('Please fill all fields (Min, Max, Fee)')
      return
    }

    const min = Number(newRange.min)
    const max = Number(newRange.max)
    const fee = Number(newRange.fee)

    if (min < 0 || max < 0 || fee < 0) {
      toast.error('All values must be positive numbers')
      return
    }

    if (min >= max) {
      toast.error('Min value must be less than Max value')
      return
    }

    // Check for overlapping ranges
    const ranges = [...feeSettings.deliveryFeeRanges]
    for (const range of ranges) {
      if ((min >= range.min && min < range.max) || (max > range.min && max <= range.max) || (min <= range.min && max >= range.max)) {
        toast.error('This range overlaps with an existing range')
        return
      }
    }

    setFeeSettings({
      ...feeSettings,
      deliveryFeeRanges: [...ranges, { min, max, fee }].sort((a, b) => a.min - b.min)
    })
    setNewRange({ min: '', max: '', fee: '' })
    toast.success('Range added successfully')
  }

  // Delete delivery fee range
  const handleDeleteRange = (index) => {
    const newRanges = feeSettings.deliveryFeeRanges.filter((_, i) => i !== index)
    setFeeSettings({
      ...feeSettings,
      deliveryFeeRanges: newRanges
    })
    toast.success('Range deleted successfully')
  }

  // Edit delivery fee range
  const handleEditRange = (index) => {
    const range = feeSettings.deliveryFeeRanges[index]
    setNewRange({ min: range.min, max: range.max, fee: range.fee })
    setEditingRangeIndex(index)
  }

  // Save edited range
  const handleSaveEditRange = () => {
    if (newRange.min === '' || newRange.max === '' || newRange.fee === '') {
      toast.error('Please fill all fields')
      return
    }

    const min = Number(newRange.min)
    const max = Number(newRange.max)
    const fee = Number(newRange.fee)

    if (min < 0 || max < 0 || fee < 0) {
      toast.error('All values must be positive numbers')
      return
    }

    if (min >= max) {
      toast.error('Min value must be less than Max value')
      return
    }

    const ranges = [...feeSettings.deliveryFeeRanges]
    // Remove the range being edited
    ranges.splice(editingRangeIndex, 1)

    // Check for overlapping ranges
    for (const range of ranges) {
      if ((min >= range.min && min < range.max) || (max > range.min && max <= range.max) || (min <= range.min && max >= range.max)) {
        toast.error('This range overlaps with an existing range')
        return
      }
    }

    // Add updated range
    ranges.push({ min, max, fee })
    ranges.sort((a, b) => a.min - b.min)

    setFeeSettings({
      ...feeSettings,
      deliveryFeeRanges: ranges
    })
    setNewRange({ min: '', max: '', fee: '' })
    setEditingRangeIndex(null)
    toast.success('Range updated successfully')
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setNewRange({ min: '', max: '', fee: '' })
    setEditingRangeIndex(null)
  }

  // --- RIDER PAYOUT RANGES HANDLERS ---
  const handleAddRiderRange = () => {
    if (newRiderRange.min === '' || newRiderRange.max === '' || newRiderRange.pay === '') {
      toast.error('Please fill all fields for rider payout range')
      return
    }

    const min = Number(newRiderRange.min)
    const max = Number(newRiderRange.max)
    const pay = Number(newRiderRange.pay)

    if (min < 0 || max < 0 || pay < 0) {
      toast.error('All values must be positive numbers')
      return
    }

    if (min >= max) {
      toast.error('Min value must be less than Max value')
      return
    }

    const ranges = [...(feeSettings.riderPayoutRanges || [])]
    for (const range of ranges) {
      if ((min >= range.min && min < range.max) || (max > range.min && max <= range.max) || (min <= range.min && max >= range.max)) {
        toast.error('This rider payout range overlaps with an existing range')
        return
      }
    }

    setFeeSettings({
      ...feeSettings,
      riderPayoutRanges: [...ranges, { min, max, pay }].sort((a, b) => a.min - b.min)
    })
    setNewRiderRange({ min: '', max: '', pay: '' })
    toast.success('Rider payout range added')
  }

  const handleDeleteRiderRange = (index) => {
    const newRanges = (feeSettings.riderPayoutRanges || []).filter((_, i) => i !== index)
    setFeeSettings({
      ...feeSettings,
      riderPayoutRanges: newRanges
    })
    toast.success('Rider payout range deleted')
  }

  const handleEditRiderRange = (index) => {
    const range = feeSettings.riderPayoutRanges[index]
    setNewRiderRange({ min: range.min, max: range.max, pay: range.pay })
    setEditingRiderRangeIndex(index)
  }

  const handleSaveEditRiderRange = () => {
    if (newRiderRange.min === '' || newRiderRange.max === '' || newRiderRange.pay === '') {
      toast.error('Please fill all fields')
      return
    }

    const min = Number(newRiderRange.min)
    const max = Number(newRiderRange.max)
    const pay = Number(newRiderRange.pay)

    if (min < 0 || max < 0 || pay < 0) {
      toast.error('All values must be positive numbers')
      return
    }

    if (min >= max) {
      toast.error('Min value must be less than Max value')
      return
    }

    const ranges = [...(feeSettings.riderPayoutRanges || [])]
    ranges.splice(editingRiderRangeIndex, 1)

    for (const range of ranges) {
      if ((min >= range.min && min < range.max) || (max > range.min && max <= range.max) || (min <= range.min && max >= range.max)) {
        toast.error('This range overlaps with an existing range')
        return
      }
    }

    ranges.push({ min, max, pay })
    ranges.sort((a, b) => a.min - b.min)

    setFeeSettings({
      ...feeSettings,
      riderPayoutRanges: ranges
    })
    setNewRiderRange({ min: '', max: '', pay: '' })
    setEditingRiderRangeIndex(null)
    toast.success('Rider payout range updated')
  }

  const handleCancelRiderEdit = () => {
    setNewRiderRange({ min: '', max: '', pay: '' })
    setEditingRiderRangeIndex(null)
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery & Platform Fee</h1>
        </div>
        <p className="text-sm text-slate-600">
          Configure delivery fee, platform fee, and GST settings for orders
        </p>
      </div>

      {/* Fee Settings Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Fee Configuration</h2>
              <p className="text-sm text-slate-500 mt-1">
                Set the fees and charges that will be applied to all orders
              </p>
            </div>
            <Button
              onClick={handleSaveFeeSettings}
              disabled={savingFeeSettings || loadingFeeSettings}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              {savingFeeSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>

          {loadingFeeSettings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (
            <>
              {/* Delivery Fee Ranges Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Delivery Fee Configuration</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Configure how delivery fees are calculated for customers
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 bg-slate-100 p-4 rounded-lg">
                  <div>
                    <span className="text-sm font-semibold text-slate-700 block">Calculation Method</span>
                    <span className="text-xs text-slate-500">Choose how customer delivery fee is computed</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFeeSettings({ ...feeSettings, deliveryFeeType: 'range' })}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        feeSettings.deliveryFeeType === 'range'
                          ? 'bg-green-600 border-green-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Range-based Slabs
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeSettings({ ...feeSettings, deliveryFeeType: 'slab' })}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        feeSettings.deliveryFeeType === 'slab'
                          ? 'bg-green-600 border-green-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Slab-based (Flat + Per Km extra)
                    </button>
                  </div>
                </div>

                {feeSettings.deliveryFeeType === 'slab' ? (
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-6">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4">Slab Pricing Parameters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Base Slab Distance (km)</label>
                        <input
                          type="number"
                          value={feeSettings.slabDistance}
                          onChange={(e) => setFeeSettings({ ...feeSettings, slabDistance: e.target.value })}
                          min="0"
                          step="0.1"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                          placeholder="e.g. 5"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Delivery fee is flat up to this distance</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Flat Slab Price (₹)</label>
                        <input
                          type="number"
                          value={feeSettings.slabPrice}
                          onChange={(e) => setFeeSettings({ ...feeSettings, slabPrice: e.target.value })}
                          min="0"
                          step="1"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                          placeholder="e.g. 40"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Price charged for any distance up to base slab distance</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Extra Distance Price Per Km (₹)</label>
                        <input
                          type="number"
                          value={feeSettings.extraPricePerKm}
                          onChange={(e) => setFeeSettings({ ...feeSettings, extraPricePerKm: e.target.value })}
                          min="0"
                          step="1"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                          placeholder="e.g. 10"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Price charged per km beyond base slab distance</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Ranges Table */}
                    {feeSettings.deliveryFeeRanges.length > 0 && (
                      <div className="mb-4 overflow-x-auto">
                        <table className="w-full border border-slate-200 rounded-lg">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">Min (km)</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">Max (km)</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">Delivery Fee (₹)</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700 border-b border-slate-200">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {feeSettings.deliveryFeeRanges
                              .map((range, originalIndex) => ({ range, originalIndex }))
                              .sort((a, b) => a.range.min - b.range.min)
                              .map(({ range, originalIndex }) => {
                                const isEditing = editingRangeIndex === originalIndex;
                                return (
                                  <tr key={originalIndex} className={`${isEditing ? 'bg-blue-50' : 'hover:bg-slate-50'} transition-colors`}>
                                    <td className="px-4 py-3 text-sm text-slate-900 border-b border-slate-100">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={newRange.min}
                                          onChange={(e) => setNewRange({ ...newRange, min: e.target.value })}
                                          className="w-24 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                      ) : (
                                        <>{range.min} km</>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-900 border-b border-slate-100">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={newRange.max}
                                          onChange={(e) => setNewRange({ ...newRange, max: e.target.value })}
                                          className="w-24 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                      ) : (
                                        <>{range.max} km</>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-green-600 border-b border-slate-100">
                                      {isEditing ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-400">₹</span>
                                          <input
                                            type="number"
                                            value={newRange.fee}
                                            onChange={(e) => setNewRange({ ...newRange, fee: e.target.value })}
                                            className="w-24 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-green-600 font-medium"
                                          />
                                        </div>
                                      ) : (
                                        <>₹{range.fee}</>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center border-b border-slate-100">
                                      <div className="flex items-center justify-center gap-2">
                                        {isEditing ? (
                                          <>
                                            <button
                                              onClick={handleSaveEditRange}
                                              className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                              title="Save"
                                            >
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={handleCancelEdit}
                                              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                              title="Cancel"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => handleEditRange(originalIndex)}
                                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                              title="Edit"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteRange(originalIndex)}
                                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                              title="Delete"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add New Range Form - Only show when NOT editing */}
                    {editingRangeIndex === null && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Plus className="w-4 h-4 text-green-600" />
                          <h4 className="text-sm font-semibold text-slate-700">Add Distance Range</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Min Distance (km)</label>
                            <input
                              type="number"
                              value={newRange.min}
                              onChange={(e) => setNewRange({ ...newRange, min: e.target.value })}
                              min="0"
                              step="1"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Max Distance (km)</label>
                            <input
                              type="number"
                              value={newRange.max}
                              onChange={(e) => setNewRange({ ...newRange, max: e.target.value })}
                              min="0"
                              step="1"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                              placeholder="5"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Delivery Fee (₹)</label>
                            <input
                              type="number"
                              value={newRange.fee}
                              onChange={(e) => setNewRange({ ...newRange, fee: e.target.value })}
                              min="0"
                              step="1"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                              placeholder="50"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={handleAddRange}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm w-full flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Range
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 italic">
                          Example: Orders between 0 km and 5 km will charge customer ₹50 delivery fee.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Rider Delivery Payout Section */}
              <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
                      <span>🏍️</span> Rider Delivery Payout Configuration (Paid to Delivery Partner)
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Configure separate payout rates paid to riders for completing deliveries (independent of what customers pay).
                    </p>
                  </div>
                </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">
                          Fixed Rider Base Pay (₹) (Fallback if no range matches)
                        </label>
                        <input
                          type="number"
                          value={feeSettings.riderBasePayout}
                          onChange={(e) => setFeeSettings({ ...feeSettings, riderBasePayout: e.target.value })}
                          min="0"
                          step="1"
                          className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                          placeholder="e.g. 30"
                        />
                        <p className="text-[11px] text-amber-700 mt-1">Default flat payout per order for delivery partner</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">
                          Additional Delivery Bonus (₹)
                        </label>
                        <input
                          type="number"
                          value={feeSettings.deliveryBonusAmount}
                          onChange={(e) => setFeeSettings({ ...feeSettings, deliveryBonusAmount: e.target.value })}
                          min="0"
                          step="1"
                          className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                          placeholder="e.g. 10"
                        />
                        <p className="text-[11px] text-amber-700 mt-1">Extra bonus added on top of rider earnings per delivery</p>
                      </div>
                    </div>

                    {/* Rider Range Table */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">Distance-based Rider Payout Slabs</h4>
                      {(!feeSettings.riderPayoutRanges || feeSettings.riderPayoutRanges.length === 0) ? (
                        <div className="bg-white p-4 rounded-lg border border-amber-200 text-center text-xs text-amber-800">
                          No distance-based payout slabs added. Rider will receive the Fixed Base Pay.
                        </div>
                      ) : (
                        <div className="overflow-x-auto bg-white rounded-lg border border-amber-200">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-amber-100/60 border-b border-amber-200">
                                <th className="px-4 py-2.5 text-xs font-bold text-amber-900">Min Distance</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-amber-900">Max Distance</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-amber-900">Rider Payout (₹)</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-amber-900 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {feeSettings.riderPayoutRanges.map((range, originalIndex) => {
                                const isEditing = editingRiderRangeIndex === originalIndex;
                                return (
                                  <tr key={originalIndex} className="border-b border-slate-100 hover:bg-amber-50/30">
                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={newRiderRange.min}
                                          onChange={(e) => setNewRiderRange({ ...newRiderRange, min: e.target.value })}
                                          className="w-20 px-2 py-1 border border-amber-400 rounded"
                                        />
                                      ) : (
                                        <>{range.min} km</>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={newRiderRange.max}
                                          onChange={(e) => setNewRiderRange({ ...newRiderRange, max: e.target.value })}
                                          className="w-20 px-2 py-1 border border-amber-400 rounded"
                                        />
                                      ) : (
                                        <>{range.max} km</>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs font-bold text-amber-700">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={newRiderRange.pay}
                                          onChange={(e) => setNewRiderRange({ ...newRiderRange, pay: e.target.value })}
                                          className="w-20 px-2 py-1 border border-amber-400 rounded text-amber-700 font-bold"
                                        />
                                      ) : (
                                        <>₹{range.pay}</>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        {isEditing ? (
                                          <>
                                            <button onClick={handleSaveEditRiderRange} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={handleCancelRiderEdit} className="p-1 text-red-600 hover:bg-red-100 rounded">
                                              <X className="w-4 h-4" />
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button onClick={() => handleEditRiderRange(originalIndex)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteRiderRange(originalIndex)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add New Rider Range */}
                      {editingRiderRangeIndex === null && (
                        <div className="bg-white p-3.5 rounded-lg border border-amber-200 mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-amber-900 mb-1">Min (km)</label>
                              <input
                                type="number"
                                value={newRiderRange.min}
                                onChange={(e) => setNewRiderRange({ ...newRiderRange, min: e.target.value })}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-amber-900 mb-1">Max (km)</label>
                              <input
                                type="number"
                                value={newRiderRange.max}
                                onChange={(e) => setNewRiderRange({ ...newRiderRange, max: e.target.value })}
                                placeholder="3"
                                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-amber-900 mb-1">Rider Pay (₹)</label>
                              <input
                                type="number"
                                value={newRiderRange.pay}
                                onChange={(e) => setNewRiderRange({ ...newRiderRange, pay: e.target.value })}
                                placeholder="35"
                                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none font-bold text-amber-800"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                onClick={handleAddRiderRange}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs w-full h-8 flex items-center justify-center gap-1 font-bold"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Slab
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6 mt-6">

                {/* Free Delivery Up To */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Free Delivery Up To (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.freeDeliveryUpTo}
                    onChange={(e) => setFeeSettings({ ...feeSettings, freeDeliveryUpTo: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="500"
                  />
                  <p className="text-xs text-slate-500">
                    Orders at or above this amount get free delivery
                  </p>
                </div>

                {/* Discounted Delivery Threshold */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Discount Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.discountDeliveryThreshold}
                    onChange={(e) => setFeeSettings({ ...feeSettings, discountDeliveryThreshold: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="300"
                  />
                  <p className="text-xs text-slate-500">
                    Orders at or above this amount get a discounted delivery fee
                  </p>
                </div>

                {/* Discounted Delivery Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Discounted Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.discountedDeliveryFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, discountedDeliveryFee: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="10"
                  />
                  <p className="text-xs text-slate-500">
                    The lower delivery fee to charge when threshold is met
                  </p>
                </div>


                {/* Platform Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Platform Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.platformFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, platformFee: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500">
                    Platform service fee per order
                  </p>
                </div>
                
                {/* Takeaway Platform Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Takeaway Platform Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.takeawayPlatformFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, takeawayPlatformFee: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500">
                    Platform service fee per takeaway order
                  </p>
                </div>
                
                {/* Packaging Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Packaging Charges Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.packagingFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, packagingFee: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="10"
                  />
                  <p className="text-xs text-slate-500">
                    Packaging charges fee per order
                  </p>
                </div>

                {/* GST Rate (Item) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    GST on Item (%)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.gstRate}
                    onChange={(e) => setFeeSettings({ ...feeSettings, gstRate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500">
                    GST percentage applied on order subtotal
                  </p>
                </div>

                {/* GST on Delivery Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    GST on Delivery Fee (%)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.gstOnDeliveryFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, gstOnDeliveryFee: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="18"
                  />
                  <p className="text-xs text-slate-500">
                    GST percentage applied on delivery fee
                  </p>
                </div>

                {/* GST on Platform Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    GST on Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.gstOnPlatformFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, gstOnPlatformFee: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="18"
                  />
                  <p className="text-xs text-slate-500">
                    GST percentage applied on platform fee
                  </p>
                </div>

                {/* GST on Takeaway Platform Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    GST on Takeaway Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.gstOnTakeawayPlatformFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, gstOnTakeawayPlatformFee: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="18"
                  />
                  <p className="text-xs text-slate-500">
                    GST percentage applied on takeaway platform fee
                  </p>
                </div>

                {/* GST on Packaging Fee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    GST on Packaging Fee (%)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.gstOnPackagingFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, gstOnPackagingFee: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="18"
                  />
                  <p className="text-xs text-slate-500">
                    GST percentage applied on packaging fee
                  </p>
                </div>

                {/* Delivery Bonus Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Delivery Bonus Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.deliveryBonusAmount}
                    onChange={(e) => setFeeSettings({ ...feeSettings, deliveryBonusAmount: e.target.value })}
                    min="0"
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="20"
                  />
                  <p className="text-xs text-slate-500">
                    Fixed bonus added to rider earnings per order
                  </p>
                </div>

                {/* Dispatch Radius Tiers */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Dispatch Radius Steps (km)
                  </label>
                  <input
                    type="text"
                    value={feeSettings.dispatchRadiusTiers}
                    onChange={(e) => setFeeSettings({ ...feeSettings, dispatchRadiusTiers: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="2, 4, 6, 8, 10"
                  />
                  <p className="text-xs text-slate-500">
                    Comma-separated list of distance ranges for rider dispatch
                  </p>
                </div>
              </div>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
