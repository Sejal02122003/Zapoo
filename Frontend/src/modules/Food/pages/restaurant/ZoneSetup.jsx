import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import {
  MapPin,
  Search,
  Save,
  Loader2,
  ArrowLeft,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Store,
  Plus,
  ExternalLink,
  Layers,
  RefreshCw,
  Check,
  Compass
} from "lucide-react"
import { restaurantAPI, zoneAPI, ownerAPI } from "@food/api"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
import { Loader } from "@googlemaps/js-api-loader"
import { toast } from "sonner"
import { getCurrentUser } from "@food/utils/auth"

/**
 * Check if a point (lat, lng) is inside a polygon defined by coordinate objects/arrays.
 */
const isPointInPolygon = (lat, lng, coordinates) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) return false

  let isInside = false
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const ptI = coordinates[i]
    const ptJ = coordinates[j]
    const xi = Number(ptI?.latitude ?? ptI?.lat ?? (Array.isArray(ptI) ? ptI[1] : NaN))
    const yi = Number(ptI?.longitude ?? ptI?.lng ?? (Array.isArray(ptI) ? ptI[0] : NaN))
    const xj = Number(ptJ?.latitude ?? ptJ?.lat ?? (Array.isArray(ptJ) ? ptJ[1] : NaN))
    const yj = Number(ptJ?.longitude ?? ptJ?.lng ?? (Array.isArray(ptJ) ? ptJ[0] : NaN))

    if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) continue

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)
    if (intersect) isInside = !isInside
  }
  return isInside
}

const parseCoordinate = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const getSavedLocationCoords = (location) => {
  if (!location) return null

  let lat = null
  let lng = null

  if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    lng = parseCoordinate(location.coordinates[0])
    lat = parseCoordinate(location.coordinates[1])
  }

  if (lat === null || lng === null) {
    lat = parseCoordinate(location.latitude)
    lng = parseCoordinate(location.longitude)
  }

  if (lat === null || lng === null) return null

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const swappedLat = lng
    const swappedLng = lat

    if (
      swappedLat >= -90 && swappedLat <= 90 &&
      swappedLng >= -180 && swappedLng <= 180
    ) {
      return { lat: swappedLat, lng: swappedLng }
    }

    return null
  }

  return { lat, lng }
}

const getTargetCoords = (entity) => {
  if (!entity) return null
  const locCoords = getSavedLocationCoords(entity.location)
  if (locCoords) return locCoords

  const lat = parseCoordinate(entity.latitude || entity.location?.latitude)
  const lng = parseCoordinate(entity.longitude || entity.location?.longitude)
  if (lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng }
  }
  return null
}

const parseAddressComponents = (comps = []) => {
  if (!Array.isArray(comps)) return { area: "", city: "", state: "", pincode: "" }
  const get = (types) => comps.find((c) => types.some((t) => c.types?.includes(t)))?.long_name || ""
  const area = get(["sublocality_level_1", "sublocality", "sublocality_level_2", "neighborhood"]) || get(["locality"]) || ""
  const city = get(["locality"]) || get(["administrative_area_level_2"]) || ""
  const state = get(["administrative_area_level_1"]) || ""
  const pincode = get(["postal_code"]) || ""
  return { area, city, state, pincode }
}

export default function ZoneSetup() {
  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlOutletId = searchParams.get("outletId")

  const user = getCurrentUser("restaurant")
  const isOwner = user && (user.role === "OWNER" || user.isOwner || (!user.outletId && user.role !== "OUTLETER"))

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const otherMarkersRef = useRef([])
  const autocompleteInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const geocoderRef = useRef(null)
  const polygonRefs = useRef([])

  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState("")
  const [saving, setSaving] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  // Targets state: "main" (HQ restaurant) or outlet _id
  const [selectedTargetId, setSelectedTargetId] = useState(
    urlOutletId || (user?.outletId ? String(user.outletId) : "main")
  )
  const [restaurantData, setRestaurantData] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [loadingOutlets, setLoadingOutlets] = useState(false)

  const [locationSearch, setLocationSearch] = useState("")
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState("")
  const [addressDetails, setAddressDetails] = useState({
    area: "",
    city: "",
    state: "",
    pincode: "",
    addressLine1: "",
    addressLine2: "",
    landmark: ""
  })

  const [zones, setZones] = useState([])
  const [currentZone, setCurrentZone] = useState(null)
  const [isInZone, setIsInZone] = useState(false)
  const [checkingZone, setCheckingZone] = useState(false)

  // Fetch zones list
  const fetchZones = async () => {
    try {
      const response = await zoneAPI.getPublicZones()
      const list = response?.data?.data?.zones || response?.data?.zones || []
      setZones(Array.isArray(list) ? list : [])
    } catch (error) {
      console.warn("Error fetching zones:", error)
    }
  }

  // Fetch current restaurant data
  const fetchRestaurantData = async () => {
    try {
      const response = await restaurantAPI.getCurrentRestaurant()
      const data = response?.data?.data?.restaurant || response?.data?.restaurant
      if (data) {
        setRestaurantData(data)
      }
    } catch (error) {
      console.warn("Error fetching restaurant profile:", error)
    }
  }

  // Fetch all outlets for multi-outlet pinning
  const fetchOutlets = async () => {
    if (!isOwner) return
    try {
      setLoadingOutlets(true)
      const res = await ownerAPI.getOutlets()
      const data = res?.data?.data || res?.data
      const list = Array.isArray(data?.outlets) ? data.outlets : Array.isArray(data) ? data : []
      setOutlets(list)
    } catch (error) {
      console.warn("Error fetching outlets:", error)
    } finally {
      setLoadingOutlets(false)
    }
  }

  useEffect(() => {
    fetchRestaurantData()
    fetchZones()
    fetchOutlets()
  }, [])

  // Identify currently active entity
  const activeTarget = selectedTargetId === "main"
    ? restaurantData
    : outlets.find((o) => String(o._id) === String(selectedTargetId))

  const activeTargetName = selectedTargetId === "main"
    ? (restaurantData?.name || "Main Restaurant (HQ)")
    : (activeTarget?.name || "Outlet Branch")

  // Detect zone based on coordinates
  const detectZoneForCoords = useCallback((lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setCurrentZone(null)
      setIsInZone(false)
      return null
    }

    if (zones.length > 0) {
      for (const z of zones) {
        const coords = z.coordinates || z.boundary?.coordinates?.[0] || []
        if (isPointInPolygon(lat, lng, coords)) {
          setCurrentZone(z)
          setIsInZone(true)
          return z
        }
      }
    }

    setCurrentZone(null)
    setIsInZone(false)
    return null
  }, [zones])

  // Update active marker on the map
  const updateMarker = useCallback((lat, lng, address = "") => {
    if (!mapInstanceRef.current || !window.google?.maps) return

    const pos = new window.google.maps.LatLng(lat, lng)

    const activePinSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <path d="M19 0C8.5 0 0 8.5 0 19c0 14 19 29 19 29s19-15 19-29C38 8.5 29.5 0 19 0z" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" filter="url(#shadow)"/>
        <circle cx="19" cy="18" r="7.5" fill="#ffffff"/>
        <circle cx="19" cy="18" r="4" fill="#dc2626"/>
      </svg>
    `

    if (!markerRef.current) {
      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        draggable: true,
        animation: window.google.maps.Animation?.DROP,
        title: "Active Pin Location",
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(activePinSvg),
          scaledSize: new window.google.maps.Size(38, 48),
          anchor: new window.google.maps.Point(19, 48)
        },
        zIndex: 999
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 6px 10px; font-family: sans-serif; font-size: 12px; color: #1e293b; max-width: 240px;">
            <strong style="color: #dc2626; font-size: 13px;">📍 Active Outlet Pin</strong>
            <p style="margin: 4px 0 2px; font-weight: 600;">${address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</p>
            <span style="font-size: 10px; color: #64748b;">(Drag marker to fine-tune exact entrance)</span>
          </div>
        `
      })

      marker.addListener("click", () => {
        infoWindow.open(mapInstanceRef.current, marker)
      })

      marker.addListener("dragend", (e) => {
        const newLat = e.latLng.lat()
        const newLng = e.latLng.lng()
        handlePositionChanged(newLat, newLng)
      })

      markerRef.current = marker
    } else {
      markerRef.current.setPosition(pos)
      markerRef.current.setIcon({
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(activePinSvg),
        scaledSize: new window.google.maps.Size(38, 48),
        anchor: new window.google.maps.Point(19, 48)
      })
    }
  }, [])

  // Handle position changed (via click, drag, or search)
  const handlePositionChanged = useCallback((lat, lng, customFormatted = "") => {
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return

    detectZoneForCoords(latNum, lngNum)

    if (customFormatted) {
      setSelectedLocation({ lat: latNum, lng: lngNum, address: customFormatted })
      setSelectedAddress(customFormatted)
      setLocationSearch(customFormatted)
      updateMarker(latNum, lngNum, customFormatted)
      return
    }

    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: { lat: latNum, lng: lngNum } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const res = results[0]
          const formatted = res.formatted_address || `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`
          const parsed = parseAddressComponents(res.address_components)
          
          setSelectedLocation({ lat: latNum, lng: lngNum, address: formatted })
          setSelectedAddress(formatted)
          setLocationSearch(formatted)
          setAddressDetails((prev) => ({
            ...prev,
            area: parsed.area || prev.area,
            city: parsed.city || prev.city,
            state: parsed.state || prev.state,
            pincode: parsed.pincode || prev.pincode
          }))
          updateMarker(latNum, lngNum, formatted)
        } else {
          const fallback = `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`
          setSelectedLocation({ lat: latNum, lng: lngNum, address: fallback })
          setSelectedAddress(fallback)
          setLocationSearch(fallback)
          updateMarker(latNum, lngNum, fallback)
        }
      })
    } else {
      const fallback = `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`
      setSelectedLocation({ lat: latNum, lng: lngNum, address: fallback })
      setSelectedAddress(fallback)
      setLocationSearch(fallback)
      updateMarker(latNum, lngNum, fallback)
    }
  }, [detectZoneForCoords, updateMarker])

  // Select a target to pin (Main restaurant or specific outlet)
  const handleSelectTarget = useCallback((targetId) => {
    setSelectedTargetId(targetId)
    if (targetId === "main") {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ outletId: targetId }, { replace: true })
    }

    const target = targetId === "main" ? restaurantData : outlets.find((o) => String(o._id) === String(targetId))
    if (!target) return

    const coords = getTargetCoords(target)
    const formattedAddr = target.location?.formattedAddress || target.location?.address || target.address?.street || ""

    if (targetId === "main") {
      const loc = target.location || {}
      setAddressDetails({
        area: loc.area || target.area || "",
        city: loc.city || target.city || "",
        state: loc.state || target.state || "",
        pincode: loc.pincode || loc.zipCode || target.pincode || "",
        addressLine1: loc.addressLine1 || target.addressLine1 || "",
        addressLine2: loc.addressLine2 || target.addressLine2 || "",
        landmark: loc.landmark || target.landmark || ""
      })
    } else {
      setAddressDetails({
        area: target.address?.street || target.location?.area || "",
        city: target.address?.city || target.location?.city || "",
        state: target.address?.state || target.location?.state || "",
        pincode: target.address?.pincode || target.location?.pincode || "",
        addressLine1: target.address?.street || "",
        addressLine2: "",
        landmark: target.address?.landmark || ""
      })
    }

    if (coords) {
      setSelectedLocation({ lat: coords.lat, lng: coords.lng, address: formattedAddr })
      setSelectedAddress(formattedAddr)
      setLocationSearch(formattedAddr)
      updateMarker(coords.lat, coords.lng, formattedAddr)
      detectZoneForCoords(coords.lat, coords.lng)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: coords.lat, lng: coords.lng })
        mapInstanceRef.current.setZoom(16)
      }
    } else {
      setSelectedLocation(null)
      setSelectedAddress("")
      setLocationSearch("")
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      detectZoneForCoords(null, null)
    }
  }, [restaurantData, outlets, setSearchParams, updateMarker, detectZoneForCoords])

  // Sync state whenever active target or target list loads
  useEffect(() => {
    if (selectedTargetId === "main" && restaurantData) {
      const coords = getTargetCoords(restaurantData)
      const formattedAddr = restaurantData.location?.formattedAddress || restaurantData.location?.address || ""
      const loc = restaurantData.location || {}
      setAddressDetails({
        area: loc.area || restaurantData.area || "",
        city: loc.city || restaurantData.city || "",
        state: loc.state || restaurantData.state || "",
        pincode: loc.pincode || loc.zipCode || restaurantData.pincode || "",
        addressLine1: loc.addressLine1 || restaurantData.addressLine1 || "",
        addressLine2: loc.addressLine2 || restaurantData.addressLine2 || "",
        landmark: loc.landmark || restaurantData.landmark || ""
      })
      if (coords) {
        setSelectedLocation({ lat: coords.lat, lng: coords.lng, address: formattedAddr })
        setSelectedAddress(formattedAddr)
        setLocationSearch(formattedAddr)
        updateMarker(coords.lat, coords.lng, formattedAddr)
        detectZoneForCoords(coords.lat, coords.lng)
      }
    } else if (selectedTargetId !== "main" && outlets.length > 0) {
      const target = outlets.find((o) => String(o._id) === String(selectedTargetId))
      if (target) {
        const coords = getTargetCoords(target)
        const formattedAddr = target.location?.formattedAddress || target.location?.address || target.address?.street || ""
        setAddressDetails({
          area: target.address?.street || target.location?.area || "",
          city: target.address?.city || target.location?.city || "",
          state: target.address?.state || target.location?.state || "",
          pincode: target.address?.pincode || target.location?.pincode || "",
          addressLine1: target.address?.street || "",
          addressLine2: "",
          landmark: target.address?.landmark || ""
        })
        if (coords) {
          setSelectedLocation({ lat: coords.lat, lng: coords.lng, address: formattedAddr })
          setSelectedAddress(formattedAddr)
          setLocationSearch(formattedAddr)
          updateMarker(coords.lat, coords.lng, formattedAddr)
          detectZoneForCoords(coords.lat, coords.lng)
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo({ lat: coords.lat, lng: coords.lng })
            mapInstanceRef.current.setZoom(16)
          }
        }
      }
    }
  }, [selectedTargetId, restaurantData, outlets, updateMarker, detectZoneForCoords])

  // Initialize and Load Google Maps
  useEffect(() => {
    let isCancelled = false

    const initMap = async () => {
      try {
        setMapLoading(true)
        setMapError("")

        const apiKey = await getGoogleMapsApiKey()
        if (!apiKey) {
          throw new Error("Google Maps API key is not configured.")
        }

        let googleMaps = window.google?.maps
        if (!googleMaps || typeof googleMaps.Map !== "function") {
          const loader = new Loader({
            apiKey,
            version: "weekly",
            libraries: ["places", "geometry"]
          })
          try {
            await loader.load()
          } catch (loadErr) {
            try {
              await loader.importLibrary("maps")
              await loader.importLibrary("places")
              await loader.importLibrary("geometry")
            } catch (importErr) {
              console.warn("Maps import library fallback warning:", importErr)
            }
          }
          googleMaps = window.google?.maps
        }

        if (!googleMaps || typeof googleMaps.Map !== "function") {
          for (let i = 0; i < 30; i++) {
            if (typeof window.google?.maps?.Map === "function") {
              googleMaps = window.google.maps
              break
            }
            await new Promise((r) => setTimeout(r, 100))
          }
        }

        if (!googleMaps || typeof googleMaps.Map !== "function") {
          throw new Error("Google Maps JavaScript API could not be initialized.")
        }

        if (isCancelled || !mapRef.current) return

        // Determine center
        const activeInitial = (urlOutletId && outlets.length > 0)
          ? outlets.find((o) => String(o._id) === String(urlOutletId))
          : restaurantData
        const savedCoords = getTargetCoords(activeInitial) || getTargetCoords(restaurantData)
        const initialLat = savedCoords?.lat || (restaurantData?.location?.latitude ? Number(restaurantData.location.latitude) : 20.5937)
        const initialLng = savedCoords?.lng || (restaurantData?.location?.longitude ? Number(restaurantData.location.longitude) : 78.9629)
        const hasValidCoords = Number.isFinite(initialLat) && Number.isFinite(initialLng) && (initialLat !== 20.5937 || initialLng !== 78.9629)

        const center = { lat: initialLat, lng: initialLng }
        const zoom = hasValidCoords ? 16 : 5

        const map = new googleMaps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          scrollwheel: true,
          gestureHandling: "greedy"
        })

        mapInstanceRef.current = map
        geocoderRef.current = new googleMaps.Geocoder()

        // Click listener on Map
        map.addListener("click", (e) => {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          handlePositionChanged(lat, lng)
        })

        // Setup Autocomplete
        if (autocompleteInputRef.current && googleMaps.places?.Autocomplete) {
          const autocomplete = new googleMaps.places.Autocomplete(autocompleteInputRef.current, {
            componentRestrictions: { country: "in" }
          })
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace()
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat()
              const lng = place.geometry.location.lng()
              const addr = place.formatted_address || place.name || ""
              map.setCenter({ lat, lng })
              map.setZoom(17)
              handlePositionChanged(lat, lng, addr)
            }
          })
          autocompleteRef.current = autocomplete
        }

        // Place initial marker if coords exist
        if (hasValidCoords) {
          const initialAddress = activeInitial?.location?.formattedAddress || activeInitial?.location?.address || restaurantData?.location?.formattedAddress || ""
          setSelectedLocation({ lat: initialLat, lng: initialLng, address: initialAddress })
          setSelectedAddress(initialAddress)
          setLocationSearch(initialAddress)
          updateMarker(initialLat, initialLng, initialAddress)
          detectZoneForCoords(initialLat, initialLng)
        }

        setMapLoading(false)
      } catch (err) {
        console.error("Map initialization failed:", err)
        if (!isCancelled) {
          setMapError(err.message || "Failed to initialize Google Maps.")
          setMapLoading(false)
        }
      }
    }

    initMap()

    return () => {
      isCancelled = true
    }
  }, [restaurantData])

  // Draw Service Zone Polygons on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps || zones.length === 0) return

    polygonRefs.current.forEach((p) => p.polygon.setMap(null))
    polygonRefs.current = []

    const targetZoneId = currentZone ? (currentZone._id || currentZone.id) : (activeTarget?.zoneId?._id || activeTarget?.zoneId)

    zones.forEach((z) => {
      const rawCoords = z.coordinates || z.boundary?.coordinates?.[0] || []
      if (!Array.isArray(rawCoords) || rawCoords.length < 3) return

      const paths = rawCoords.map((c) => ({
        lat: Number(c.latitude ?? c.lat ?? (Array.isArray(c) ? c[1] : 0)),
        lng: Number(c.longitude ?? c.lng ?? (Array.isArray(c) ? c[0] : 0))
      })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

      if (paths.length < 3) return

      const isCurrentActive = targetZoneId && (String(targetZoneId) === String(z._id || z.id))

      const polygon = new window.google.maps.Polygon({
        paths,
        strokeColor: isCurrentActive ? "#10b981" : "#6366f1",
        strokeOpacity: 0.85,
        strokeWeight: 2.5,
        fillColor: isCurrentActive ? "#10b981" : "#6366f1",
        fillOpacity: isCurrentActive ? 0.22 : 0.08,
        map: mapInstanceRef.current
      })

      polygon.addListener("click", (e) => {
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        handlePositionChanged(lat, lng)
      })

      polygonRefs.current.push({
        id: z._id || z.id,
        name: z.name || z.zoneName,
        polygon
      })
    })
  }, [zones, currentZone, activeTarget?.zoneId, handlePositionChanged])

  // Render Other Outlets Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return

    // Clean up previous markers
    otherMarkersRef.current.forEach((m) => {
      if (m.marker) m.marker.setMap(null)
    })
    otherMarkersRef.current = []

    const itemsToRender = []

    // 1. Main Restaurant HQ (if not currently active)
    if (selectedTargetId !== "main" && restaurantData) {
      const coords = getTargetCoords(restaurantData)
      if (coords) {
        itemsToRender.push({
          id: "main",
          name: restaurantData.name || "Main Restaurant HQ",
          type: "hq",
          coords,
          zoneId: restaurantData.zoneId,
          address: restaurantData.location?.formattedAddress || restaurantData.location?.address || ""
        })
      }
    }

    // 2. Outlets (if not currently active)
    outlets.forEach((outlet) => {
      if (String(outlet._id) !== String(selectedTargetId)) {
        const coords = getTargetCoords(outlet)
        if (coords) {
          itemsToRender.push({
            id: String(outlet._id),
            name: outlet.name || `Outlet ${outlet.outletCode || ""}`,
            type: "outlet",
            outletCode: outlet.outletCode,
            coords,
            zoneId: outlet.zoneId,
            address: outlet.location?.formattedAddress || outlet.location?.address || outlet.address?.street || ""
          })
        }
      }
    })

    itemsToRender.forEach((item) => {
      const isHQ = item.type === "hq"
      const pinColor = isHQ ? "#7c3aed" : "#2563eb"
      const badgeText = isHQ ? "HQ" : (item.outletCode ? item.outletCode.slice(-2) : "B")

      const iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
          <path d="M17 0C7.6 0 0 7.6 0 17c0 11.9 17 27 17 27s17-15.1 17-27C34 7.6 26.4 0 17 0z" fill="${pinColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="17" cy="16" r="7.5" fill="#ffffff"/>
          <text x="17" y="20" font-size="8.5" font-family="sans-serif" font-weight="900" fill="${pinColor}" text-anchor="middle">${badgeText}</text>
        </svg>
      `

      const marker = new window.google.maps.Marker({
        position: new window.google.maps.LatLng(item.coords.lat, item.coords.lng),
        map: mapInstanceRef.current,
        title: item.name,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(iconSvg),
          scaledSize: new window.google.maps.Size(32, 42),
          anchor: new window.google.maps.Point(16, 42)
        }
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 6px 10px; font-family: sans-serif; font-size: 12px; color: #1e293b; max-width: 250px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: ${pinColor}; color: #fff; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 9999px;">
                ${isHQ ? "MAIN HQ" : "BRANCH"}
              </span>
              <strong style="font-size: 13px; color: #0f172a;">${item.name}</strong>
            </div>
            <p style="margin: 2px 0 6px; font-size: 11px; color: #64748b;">${item.address || `${item.coords.lat.toFixed(5)}, ${item.coords.lng.toFixed(5)}`}</p>
            <div style="font-size: 11px; color: #2563eb; font-weight: 800; cursor: pointer; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
              👉 Click to Switch & Pin This Outlet
            </div>
          </div>
        `
      })

      marker.addListener("mouseover", () => {
        infoWindow.open(mapInstanceRef.current, marker)
      })
      marker.addListener("mouseout", () => {
        infoWindow.close()
      })
      marker.addListener("click", () => {
        handleSelectTarget(item.id)
        toast.info(`Editing location pin for "${item.name}"`)
      })

      otherMarkersRef.current.push({ id: item.id, marker, infoWindow })
    })

    return () => {
      otherMarkersRef.current.forEach((m) => {
        if (m.marker) m.marker.setMap(null)
      })
      otherMarkersRef.current = []
    }
  }, [outlets, restaurantData, selectedTargetId, handleSelectTarget])

  // GPS Current Location Handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const { latitude, longitude } = pos.coords
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude })
          mapInstanceRef.current.setZoom(17)
        }
        handlePositionChanged(latitude, longitude)
        toast.success(`Location updated to your current GPS spot for ${activeTargetName}!`)
      },
      (err) => {
        setIsLocating(false)
        toast.error(`Unable to get location: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Save Location & Zone to Backend (Main restaurant or Outlet)
  const handleSaveLocation = async () => {
    if (!selectedLocation) {
      toast.error("Please select a location pin on the map first.")
      return
    }

    try {
      setSaving(true)
      const { lat, lng, address } = selectedLocation

      if (selectedTargetId === "main") {
        const payload = {
          location: {
            latitude: lat,
            longitude: lng,
            coordinates: [lng, lat], // GeoJSON format [longitude, latitude]
            formattedAddress: address || selectedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            address: address || selectedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            addressLine1: addressDetails.addressLine1 || addressDetails.area || "",
            addressLine2: addressDetails.addressLine2 || "",
            area: addressDetails.area || "",
            city: addressDetails.city || "",
            state: addressDetails.state || "",
            pincode: addressDetails.pincode || "",
            landmark: addressDetails.landmark || ""
          }
        }

        if (currentZone && (currentZone._id || currentZone.id)) {
          payload.zoneId = currentZone._id || currentZone.id
        }

        const response = await restaurantAPI.updateProfile(payload)

        if (response?.data?.success || response?.data?.data?.restaurant) {
          toast.success("Main restaurant location & zone pinned successfully!")
          window.dispatchEvent(new Event("addressUpdated"))
          window.dispatchEvent(new Event("ownerDataUpdated"))
          await fetchRestaurantData()
        } else {
          throw new Error(response?.data?.message || "Failed to save main restaurant location")
        }
      } else {
        // Save Outlet Location & Zone
        const payload = {
          latitude: lat,
          longitude: lng,
          location: {
            latitude: lat,
            longitude: lng,
            coordinates: [lng, lat],
            formattedAddress: address || selectedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            address: address || selectedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            area: addressDetails.area || "",
            city: addressDetails.city || "",
            state: addressDetails.state || "",
            pincode: addressDetails.pincode || ""
          },
          address: {
            street: addressDetails.addressLine1 || addressDetails.area || "",
            city: addressDetails.city || "",
            state: addressDetails.state || "",
            pincode: addressDetails.pincode || "",
            landmark: addressDetails.landmark || ""
          },
          zoneId: currentZone ? (currentZone._id || currentZone.id) : null
        }

        const response = await ownerAPI.updateOutlet(selectedTargetId, payload)

        if (response?.data?.success || response?.data?.data?.outlet) {
          toast.success(`Outlet "${activeTargetName}" location & zone pinned successfully!`)
          window.dispatchEvent(new Event("addressUpdated"))
          window.dispatchEvent(new Event("ownerDataUpdated"))
          await fetchOutlets()
        } else {
          throw new Error(response?.data?.message || "Failed to update outlet location")
        }
      }
    } catch (error) {
      console.error("Save location error:", error)
      toast.error(error.response?.data?.message || error.message || "Failed to save location.")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (isOwner) {
      navigate("/food/restaurant/owner/outlets")
    } else {
      goBack()
    }
  }

  // Helper to find zone name by id
  const getZoneNameById = (zId) => {
    if (!zId) return "Unassigned"
    const actualId = typeof zId === "object" ? (zId._id || zId.id) : zId
    const found = zones.find((z) => String(z._id || z.id) === String(actualId))
    return found ? (found.name || found.zoneName) : "Zone Assigned"
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white bg-white/80 border border-slate-200 rounded-xl transition shadow-sm text-slate-700"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-200 shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  Multi-Outlet Pin & Zone Setup
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-red-100 text-red-700 uppercase tracking-wider whitespace-nowrap shrink-0 inline-flex items-center">
                  {isOwner ? "Owner Portal" : "Outlet Portal"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Pin multiple branch outlets on the map and link each to its active delivery service zone
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating || mapLoading}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 text-blue-600 ${isLocating ? "animate-spin" : ""}`} />
              <span>{isLocating ? "Locating..." : "Locate Me (GPS)"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={!selectedLocation || saving || mapLoading}
              className="px-5 sm:px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-lg shadow-red-200 flex items-center gap-2 transition active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Pin for {activeTargetName.length > 15 ? `${activeTargetName.slice(0, 15)}...` : activeTargetName}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Multi-Outlet Switcher / Selector Section */}
        {isOwner && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    Select Outlet to Pin Location
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 normal-case">
                      {outlets.length + 1} Outlets Available
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Click any outlet or branch below to drag and set its map pin, entrance location, and operating zone
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchOutlets}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                  title="Refresh Outlets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOutlets ? "animate-spin" : ""}`} />
                </button>
                <Link
                  to="/food/restaurant/owner/outlets"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Outlets</span>
                </Link>
              </div>
            </div>

            {/* Outlets Horizontal Cards List */}
            <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {/* Main HQ Restaurant Card */}
              {(() => {
                const isSelected = selectedTargetId === "main"
                const hasCoords = Boolean(getTargetCoords(restaurantData))
                const zoneName = getZoneNameById(restaurantData?.zoneId)

                return (
                  <button
                    key="main-hq"
                    type="button"
                    onClick={() => handleSelectTarget("main")}
                    className={`shrink-0 w-64 text-left p-3 rounded-xl border transition-all relative ${
                      isSelected
                        ? "bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-purple-100 text-purple-700 flex items-center gap-1 uppercase tracking-wider">
                        <Building2 className="w-2.5 h-2.5" />
                        Main HQ
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-red-600 text-white flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          Pinning Now
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-900 truncate leading-tight">
                      {restaurantData?.name || "Main Restaurant"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {restaurantData?.location?.formattedAddress || restaurantData?.location?.address || "Address not set"}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className={`font-bold flex items-center gap-1 ${hasCoords ? "text-emerald-700" : "text-amber-600"}`}>
                        <MapPin className="w-3 h-3" />
                        {hasCoords ? "Pinned" : "Pin Missing"}
                      </span>
                      <span className="text-slate-500 truncate max-w-[110px]" title={zoneName}>
                        {zoneName}
                      </span>
                    </div>
                  </button>
                )
              })()}

              {/* Branch Outlets Cards */}
              {outlets.map((outlet) => {
                const isSelected = String(selectedTargetId) === String(outlet._id)
                const hasCoords = Boolean(getTargetCoords(outlet))
                const zoneName = getZoneNameById(outlet.zoneId)

                return (
                  <button
                    key={outlet._id}
                    type="button"
                    onClick={() => handleSelectTarget(String(outlet._id))}
                    className={`shrink-0 w-64 text-left p-3 rounded-xl border transition-all relative ${
                      isSelected
                        ? "bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-blue-100 text-blue-700 flex items-center gap-1 uppercase tracking-wider">
                        <Store className="w-2.5 h-2.5" />
                        Branch: {outlet.outletCode || "OUTLET"}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-red-600 text-white flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          Pinning Now
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-900 truncate leading-tight">
                      {outlet.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {outlet.location?.formattedAddress || outlet.address?.street || "Address not set"}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className={`font-bold flex items-center gap-1 ${hasCoords ? "text-emerald-700" : "text-amber-600"}`}>
                        <MapPin className="w-3 h-3" />
                        {hasCoords ? "Pinned" : "Pin Missing"}
                      </span>
                      <span className="text-slate-500 truncate max-w-[110px]" title={zoneName}>
                        {zoneName}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Search and Autocomplete Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={autocompleteInputRef}
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder={`Search location for "${activeTargetName}" (e.g. area, street, landmark)...`}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50/50 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Zone Status Banner */}
        <div className={`p-4 rounded-2xl border mb-4 flex items-center justify-between transition-all ${
          isInZone 
            ? "bg-emerald-50/90 border-emerald-200 text-emerald-900" 
            : "bg-amber-50/90 border-amber-200 text-amber-900"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${isInZone ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
              {isInZone ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                {checkingZone ? (
                  "Checking service zone..."
                ) : isInZone ? (
                  <>Operating in Zone: <span className="underline">{currentZone?.name || currentZone?.zoneName || "Active Zone"}</span></>
                ) : (
                  "Outside Service Zone"
                )}
              </h3>
              <p className="text-xs opacity-85 mt-0.5 font-medium">
                {isInZone
                  ? `Your pinned location for "${activeTargetName}" is inside an active operational service zone. Customers in this zone can place orders.`
                  : `Please drag the pin inside the colored zone boundary on the map so customers in that zone can discover "${activeTargetName}".`}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Active Target
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Main HQ
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Other Branches
            </span>
          </div>
        </div>

        {/* Map Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div ref={mapRef} className="w-full h-[540px]" />
            
            {mapLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center p-6">
                  <Loader2 className="w-9 h-9 animate-spin text-red-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800">Initializing Interactive Map...</p>
                  <p className="text-xs text-slate-400 mt-1">Loading Google Maps satellite & road layers</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 p-6">
                <div className="text-center max-w-sm">
                  <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900">{mapError}</p>
                  <p className="text-xs text-slate-500 mt-1">Please ensure your internet is connected or contact support.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
                  >
                    Retry Load
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location & Address Summary Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-red-600" />
                  Currently Pinning
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-100 text-red-700">
                  {selectedTargetId === "main" ? "MAIN HQ" : "BRANCH OUTLET"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs font-black text-slate-900">{activeTargetName}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedTargetId === "main" ? "Master restaurant profile" : `Outlet Code: ${activeTarget?.outletCode || "N/A"}`}
                </p>
              </div>

              {selectedLocation ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Selected Address</label>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 break-words bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {selectedAddress || selectedLocation.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Latitude</label>
                      <p className="text-xs font-black text-slate-800">{selectedLocation.lat.toFixed(6)}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Longitude</label>
                      <p className="text-xs font-black text-slate-800">{selectedLocation.lng.toFixed(6)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Assigned Zone</label>
                    <div className={`mt-1 p-2.5 rounded-xl border flex items-center justify-between text-xs font-extrabold ${
                      isInZone ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      <span>{currentZone?.name || currentZone?.zoneName || "No Zone Selected"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isInZone ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                      }`}>
                        {isInZone ? "ACTIVE" : "UNASSIGNED"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Click anywhere on the map to place the location pin for this outlet.
                </div>
              )}
            </div>

            {/* Editable Address Details Form */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b pb-2">
                Address Details (Auto-filled)
              </h3>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Area / Locality / Street</label>
                <input
                  type="text"
                  value={addressDetails.area}
                  onChange={(e) => setAddressDetails({ ...addressDetails, area: e.target.value, addressLine1: e.target.value })}
                  placeholder="e.g. Vijay Nagar"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">City</label>
                  <input
                    type="text"
                    value={addressDetails.city}
                    onChange={(e) => setAddressDetails({ ...addressDetails, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={addressDetails.pincode}
                    onChange={(e) => setAddressDetails({ ...addressDetails, pincode: e.target.value })}
                    placeholder="Pincode"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  value={addressDetails.landmark}
                  onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                  placeholder="e.g. Near City Mall"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={!selectedLocation || saving || mapLoading}
                className="w-full mt-2 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Pin & Zone...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Confirm & Save Pin for {activeTargetName}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
