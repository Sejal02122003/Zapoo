import { useState, useEffect } from "react"
import { Save, Loader2, Zap } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Switch } from "@food/components/ui/switch"
import axiosInstance from "@/services/api/axios"
import { toast } from "sonner"

export default function WeatherPricing() {
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    isEnabled: false,
    weatherCondition: "Heavy Rain",
    feePerKm: "2",
    gstPercentage: "18",
    minDistance: "0",
    applicableZones: ["ALL"],
    isGlobal: true
  })
  
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const [pricingRes, zonesRes] = await Promise.all([
        axiosInstance.get('/food/admin/weather-pricing'),
        axiosInstance.get('/food/admin/zones')
      ])

      if (zonesRes.data?.success && zonesRes.data?.data?.zones) {
        setZones(zonesRes.data.data.zones)
      }

      if (pricingRes.data?.success && pricingRes.data?.data) {
        const policy = pricingRes.data.data
        const appZones = policy.applicableZones || ["ALL"]
        setSettings({
          isEnabled: policy.isEnabled || false,
          weatherCondition: (policy.weatherCondition && policy.weatherCondition.length > 0) ? policy.weatherCondition[0] : "Heavy Rain",
          feePerKm: policy.feePerKm?.toString() || "2",
          gstPercentage: policy.gstPercentage?.toString() || "18",
          minDistance: policy.minDistance?.toString() || "0",
          applicableZones: appZones,
          isGlobal: appZones.includes("ALL")
        })
      }
    } catch (error) {
      console.error('Error fetching weather pricing:', error)
      toast.error('Failed to load weather pricing settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleZoneToggle = (zoneId) => {
    setSettings(prev => {
      if (prev.isGlobal) return prev
      const isSelected = prev.applicableZones.includes(zoneId)
      let newZones = []
      if (isSelected) {
        newZones = prev.applicableZones.filter(id => id !== zoneId)
      } else {
        newZones = [...prev.applicableZones, zoneId].filter(id => id !== "ALL")
      }
      return { ...prev, applicableZones: newZones }
    })
  }

  const handleGlobalToggle = () => {
    setSettings(prev => ({
      ...prev,
      isGlobal: !prev.isGlobal,
      applicableZones: !prev.isGlobal ? ["ALL"] : []
    }))
  }

  const handleToggle = async () => {
    try {
      const response = await axiosInstance.patch('/food/admin/weather-pricing/toggle', {
        enabled: !settings.isEnabled
      })
      if (response.data?.success) {
        setSettings(prev => ({ ...prev, isEnabled: !prev.isEnabled }))
        toast.success(`Weather pricing ${!settings.isEnabled ? 'enabled' : 'disabled'}`)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to toggle weather pricing')
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await axiosInstance.patch('/food/admin/weather-pricing', {
        isEnabled: settings.isEnabled,
        weatherCondition: [settings.weatherCondition],
        feePerKm: Number(settings.feePerKm),
        gstPercentage: Number(settings.gstPercentage),
        minDistance: Number(settings.minDistance),
        applicableZones: settings.isGlobal ? ["ALL"] : settings.applicableZones
      })
      if (response.data?.success) {
        toast.success('Weather pricing settings saved successfully')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Bad Weather Pricing</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Configure dynamic service fees for bad weather conditions.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-neutral-50 px-4 py-2 rounded-lg border border-neutral-200">
          <span className="text-sm font-medium text-neutral-700">Status</span>
          <Switch 
            checked={settings.isEnabled} 
            onCheckedChange={handleToggle} 
            className="!border-transparent"
            style={{ backgroundColor: settings.isEnabled ? '#22c55e' : '#d1d5db' }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Weather Condition Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                value={settings.weatherCondition}
                onChange={e => setSettings({...settings, weatherCondition: e.target.value})}
                placeholder="e.g. Heavy Rain"
              />
              <p className="text-xs text-neutral-500">This label is shown to customers.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Fee Per Km (₹)</label>
              <input
                type="number"
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                value={settings.feePerKm}
                onChange={e => setSettings({...settings, feePerKm: e.target.value})}
                placeholder="2"
                min="0"
                step="0.5"
              />
              <p className="text-xs text-neutral-500">Amount charged per kilometer of distance.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">GST on Weather Fee (%)</label>
              <input
                type="number"
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                value={settings.gstPercentage}
                onChange={e => setSettings({...settings, gstPercentage: e.target.value})}
                placeholder="18"
                min="0"
                max="100"
              />
              <p className="text-xs text-neutral-500">GST applied on top of the calculated weather fee.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Minimum Distance (km)</label>
              <input
                type="number"
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                value={settings.minDistance}
                onChange={e => setSettings({...settings, minDistance: e.target.value})}
                placeholder="0"
                min="0"
                step="0.5"
              />
              <p className="text-xs text-neutral-500">Only apply weather fee if delivery is beyond this distance.</p>
            </div>
            
            <div className="space-y-4 md:col-span-2 mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700">Zone Applicability</h3>
                  <p className="text-xs text-neutral-500">Select which zones this pricing applies to.</p>
                </div>
                <div className="flex items-center gap-3 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
                  <span className="text-xs font-medium text-neutral-700">Apply to All Zones</span>
                  <Switch 
                    checked={settings.isGlobal} 
                    onCheckedChange={handleGlobalToggle} 
                    className="!border-transparent scale-75"
                    style={{ backgroundColor: settings.isGlobal ? '#22c55e' : '#d1d5db' }}
                  />
                </div>
              </div>
              
              {!settings.isGlobal && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {zones.map(zone => (
                    <label key={zone._id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.applicableZones.includes(zone._id) ? 'bg-orange-50 border-orange-200' : 'bg-white border-neutral-200 hover:bg-neutral-50'}`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-500"
                        checked={settings.applicableZones.includes(zone._id)}
                        onChange={() => handleZoneToggle(zone._id)}
                      />
                      <span className="text-sm font-medium text-neutral-700 truncate">{zone.name}</span>
                    </label>
                  ))}
                  {zones.length === 0 && (
                    <div className="col-span-full text-sm text-neutral-500 py-2">No zones available. Please create zones first.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
            <h3 className="font-semibold text-orange-800 mb-2">Live Preview (For a 5km Delivery)</h3>
            <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
              <li>Base calculation: 5km × ₹{settings.feePerKm || 0} = ₹{5 * (Number(settings.feePerKm) || 0)}</li>
              <li>GST ({settings.gstPercentage || 0}%): ₹{((5 * (Number(settings.feePerKm) || 0)) * (Number(settings.gstPercentage) || 0) / 100).toFixed(2)}</li>
              <li className="font-bold pt-1">Total Customer Surcharge: ₹{(5 * (Number(settings.feePerKm) || 0) * (1 + (Number(settings.gstPercentage) || 0) / 100)).toFixed(2)}</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-6"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}
