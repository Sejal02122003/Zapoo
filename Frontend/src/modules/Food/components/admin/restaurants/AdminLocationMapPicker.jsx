import React, { useState, useEffect, useRef, useCallback } from "react"
import { MapPin, Search, Navigation, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
import { Loader } from "@googlemaps/js-api-loader"

/**
 * Check if a point (lat, lng) is inside a polygon defined by coordinate objects/arrays.
 */
export const isPointInZone = (lat, lng, coordinates) => {
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

/**
 * Helper to parse address components from Google Places / Geocoder.
 */
export const parseAddressComponents = (comps = []) => {
  if (!Array.isArray(comps)) return { area: "", city: "", state: "", pincode: "" }
  const get = (types) => comps.find((c) => types.some((t) => c.types?.includes(t)))?.long_name || ""
  const area = get(["sublocality_level_1", "sublocality", "sublocality_level_2", "neighborhood"]) || get(["locality"]) || ""
  const city = get(["locality"]) || get(["administrative_area_level_2"]) || ""
  const state = get(["administrative_area_level_1"]) || ""
  const pincode = get(["postal_code"]) || ""
  return { area, city, state, pincode }
}

/**
 * AdminLocationMapPicker Component
 * An interactive map location & draggable pin picker for Admin Restaurant onboarding and editing.
 */
export default function AdminLocationMapPicker({
  location = {},
  zoneId = "",
  zones = [],
  onChange,
  onZoneSelect,
  disabled = false,
  className = ""
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const infoWindowRef = useRef(null)
  const geocoderRef = useRef(null)
  const autocompleteInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const polygonRefs = useRef([])

  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  const [searchInputValue, setSearchInputValue] = useState(location?.formattedAddress || location?.addressLine1 || "")
  const [detectedZone, setDetectedZone] = useState(null)
  const [isInZone, setIsInZone] = useState(false)

  // Keep latest onChange in ref to avoid stale closures in listeners
  const onChangeRef = useRef(onChange)
  const onZoneSelectRef = useRef(onZoneSelect)
  const locationRef = useRef(location)
  const zoneIdRef = useRef(zoneId)
  const zonesRef = useRef(zones)

  useEffect(() => {
    onChangeRef.current = onChange
    onZoneSelectRef.current = onZoneSelect
    locationRef.current = location
    zoneIdRef.current = zoneId
    zonesRef.current = zones
  })

  // Sync external search value when location.formattedAddress changes externally
  useEffect(() => {
    const nextAddr = location?.formattedAddress || location?.addressLine1 || ""
    if (nextAddr && nextAddr !== searchInputValue && document.activeElement !== autocompleteInputRef.current) {
      setSearchInputValue(nextAddr)
    }
  }, [location?.formattedAddress, location?.addressLine1])

  // Detect zone based on coordinates
  const detectZoneForCoords = useCallback((lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setDetectedZone(null)
      setIsInZone(false)
      return null
    }

    const currentZones = zonesRef.current || []
    for (const z of currentZones) {
      if (z.coordinates && z.coordinates.length >= 3) {
        if (isPointInZone(lat, lng, z.coordinates)) {
          const zoneObj = {
            id: String(z._id || z.id),
            name: z.name || z.zoneName || z.serviceLocation || "Service Zone"
          }
          setDetectedZone(zoneObj)
          setIsInZone(true)
          return zoneObj
        }
      }
    }

    setDetectedZone(null)
    setIsInZone(false)
    return null
  }, [])

  // Check initial zone detection if lat/lng are already available
  useEffect(() => {
    const lat = Number(location?.latitude)
    const lng = Number(location?.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      detectZoneForCoords(lat, lng)
    }
  }, [location?.latitude, location?.longitude, zones, detectZoneForCoords])

  // Update marker position & popup
  const updateMarkerPosition = useCallback((lat, lng, formattedAddress = "") => {
    if (!mapInstanceRef.current || !window.google?.maps) return

    const pos = new window.google.maps.LatLng(lat, lng)

    if (!markerRef.current) {
      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        draggable: !disabled,
        animation: window.google.maps.Animation.DROP,
        title: "Restaurant Pin Location"
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 6px 10px; font-family: sans-serif; font-size: 12px; color: #1e293b; max-width: 240px;">
            <strong style="color: #ef4444; font-size: 13px;">📍 Restaurant Pin</strong>
            <p style="margin: 4px 0 2px; font-weight: 500;">${formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</p>
            <span style="font-size: 10px; color: #64748b;">(Drag to fine-tune location)</span>
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
      infoWindowRef.current = infoWindow
    } else {
      markerRef.current.setPosition(pos)
      markerRef.current.setDraggable(!disabled)
      if (infoWindowRef.current) {
        infoWindowRef.current.setContent(`
          <div style="padding: 6px 10px; font-family: sans-serif; font-size: 12px; color: #1e293b; max-width: 240px;">
            <strong style="color: #ef4444; font-size: 13px;">📍 Restaurant Pin</strong>
            <p style="margin: 4px 0 2px; font-weight: 500;">${formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</p>
            <span style="font-size: 10px; color: #64748b;">(Drag to fine-tune location)</span>
          </div>
        `)
      }
    }
  }, [disabled])

  // Handle position change from marker drag, map click, or autocomplete
  const handlePositionChanged = useCallback((lat, lng, addressHint = "") => {
    const latNum = Number(lat.toFixed(6))
    const lngNum = Number(lng.toFixed(6))

    // Detect zone immediately
    const matched = detectZoneForCoords(latNum, lngNum)
    if (matched && onZoneSelectRef.current) {
      onZoneSelectRef.current(matched.id)
    }

    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: { lat: latNum, lng: lngNum } }, (results, status) => {
        let formatted = addressHint
        let area = ""
        let city = ""
        let state = ""
        let pincode = ""

        if (status === "OK" && results?.[0]) {
          formatted = results[0].formatted_address || addressHint || `${latNum}, ${lngNum}`
          const parsed = parseAddressComponents(results[0].address_components)
          area = parsed.area
          city = parsed.city
          state = parsed.state
          pincode = parsed.pincode
        } else if (!formatted) {
          formatted = `${latNum}, ${lngNum}`
        }

        setSearchInputValue(formatted)
        updateMarkerPosition(latNum, lngNum, formatted)

        if (onChangeRef.current) {
          const prev = locationRef.current || {}
          onChangeRef.current(
            {
              ...prev,
              formattedAddress: formatted,
              addressLine1: formatted || prev.addressLine1,
              area: area || prev.area,
              city: city || prev.city,
              state: state || prev.state,
              pincode: pincode || prev.pincode,
              latitude: latNum,
              longitude: lngNum,
              coordinates: [lngNum, latNum]
            },
            matched?.id || null
          )
        }
      })
    } else {
      const formatted = addressHint || `${latNum}, ${lngNum}`
      setSearchInputValue(formatted)
      updateMarkerPosition(latNum, lngNum, formatted)

      if (onChangeRef.current) {
        const prev = locationRef.current || {}
        onChangeRef.current(
          {
            ...prev,
            formattedAddress: formatted,
            latitude: latNum,
            longitude: lngNum,
            coordinates: [lngNum, latNum]
          },
          matched?.id || null
        )
      }
    }
  }, [detectZoneForCoords, updateMarkerPosition])

  // Load Google Maps SDK
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        setMapLoading(true)
        setMapError("")

        const apiKey = await getGoogleMapsApiKey()
        if (!apiKey) {
          throw new Error("Google Maps API Key not configured.")
        }

        let googleObj = window.google
        if (!googleObj?.maps) {
          const loader = new Loader({
            apiKey,
            version: "weekly",
            libraries: ["places", "geometry"]
          })
          googleObj = await loader.load()
        }

        if (cancelled || !mapRef.current) return

        const initialLat = Number(location?.latitude)
        const initialLng = Number(location?.longitude)
        const hasValidInitial = Number.isFinite(initialLat) && Number.isFinite(initialLng) && (initialLat !== 0 || initialLng !== 0)

        // Center on India or initial coords
        const center = hasValidInitial
          ? { lat: initialLat, lng: initialLng }
          : { lat: 20.5937, lng: 78.9629 }
        const zoom = hasValidInitial ? 17 : 5

        const map = new googleObj.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: googleObj.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: googleObj.maps.ControlPosition.TOP_RIGHT,
            mapTypeIds: [googleObj.maps.MapTypeId.ROADMAP, googleObj.maps.MapTypeId.SATELLITE]
          },
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          scrollwheel: true,
          gestureHandling: "greedy",
          disableDoubleClickZoom: false
        })

        mapInstanceRef.current = map
        geocoderRef.current = new googleObj.maps.Geocoder()

        // Map Click Listener
        map.addListener("click", (e) => {
          if (disabled) return
          const clickedLat = e.latLng.lat()
          const clickedLng = e.latLng.lng()
          handlePositionChanged(clickedLat, clickedLng)
        })

        // Places Autocomplete
        if (autocompleteInputRef.current && googleObj.maps.places) {
          const autocomplete = new googleObj.maps.places.Autocomplete(autocompleteInputRef.current, {
            componentRestrictions: { country: "in" },
            fields: ["formatted_address", "address_components", "geometry", "name"]
          })

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace()
            if (!place?.geometry?.location) return

            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            const formatted = place.formatted_address || place.name || ""

            map.setCenter(place.geometry.location)
            map.setZoom(17)

            const parsed = parseAddressComponents(place.address_components)
            setSearchInputValue(formatted)
            updateMarkerPosition(lat, lng, formatted)

            const matched = detectZoneForCoords(lat, lng)
            if (matched && onZoneSelectRef.current) {
              onZoneSelectRef.current(matched.id)
            }

            if (onChangeRef.current) {
              const prev = locationRef.current || {}
              onChangeRef.current(
                {
                  ...prev,
                  formattedAddress: formatted,
                  addressLine1: formatted || prev.addressLine1,
                  area: parsed.area || prev.area,
                  city: parsed.city || prev.city,
                  state: parsed.state || prev.state,
                  pincode: parsed.pincode || prev.pincode,
                  latitude: Number(lat.toFixed(6)),
                  longitude: Number(lng.toFixed(6)),
                  coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))]
                },
                matched?.id || null
              )
            }
          })

          autocompleteRef.current = autocomplete
        }

        // Place initial marker if coords exist
        if (hasValidInitial) {
          updateMarkerPosition(initialLat, initialLng, location?.formattedAddress || "")
        }

        setMapLoading(false)
      } catch (err) {
        if (!cancelled) {
          setMapError(err?.message || "Failed to initialize Google Maps")
          setMapLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (polygonRefs.current) {
        polygonRefs.current.forEach((p) => p?.polygon?.setMap(null))
        polygonRefs.current = []
      }
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
    }
  }, [])

  // Draw Service Zone Polygons on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps || mapLoading) return

    // Clear old polygons
    polygonRefs.current.forEach((p) => p?.polygon?.setMap(null))
    polygonRefs.current = []

    const currentZoneIdNorm = String(zoneId || detectedZone?.id || "")

    zones.forEach((z) => {
      if (!z.coordinates || !Array.isArray(z.coordinates) || z.coordinates.length < 3) return

      const paths = z.coordinates
        .map((c) => ({
          lat: Number(c.latitude ?? c.lat ?? (Array.isArray(c) ? c[1] : NaN)),
          lng: Number(c.longitude ?? c.lng ?? (Array.isArray(c) ? c[0] : NaN))
        }))
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))

      if (paths.length < 3) return

      const isSelected = String(z._id || z.id) === currentZoneIdNorm
      const polygon = new window.google.maps.Polygon({
        paths,
        strokeColor: isSelected ? "#22c55e" : "#3b82f6",
        strokeOpacity: 0.85,
        strokeWeight: isSelected ? 2.5 : 1.5,
        fillColor: isSelected ? "#22c55e" : "#3b82f6",
        fillOpacity: isSelected ? 0.22 : 0.1,
        map: mapInstanceRef.current
      })

      // Forward click on polygon to map click
      polygon.addListener("click", (e) => {
        if (disabled) return
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        handlePositionChanged(lat, lng)
      })

      polygonRefs.current.push({
        id: String(z._id || z.id),
        name: z.name || z.zoneName,
        polygon
      })
    })
  }, [zones, zoneId, detectedZone?.id, mapLoading, disabled, handlePositionChanged])

  // Use GPS / Current Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false)
        const { latitude, longitude } = position.coords
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude })
          mapInstanceRef.current.setZoom(17)
        }
        handlePositionChanged(latitude, longitude)
      },
      (error) => {
        setIsLocating(false)
        alert(`Failed to fetch current location: ${error.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const selectedLat = Number(location?.latitude)
  const selectedLng = Number(location?.longitude)
  const hasCoordinates = Number.isFinite(selectedLat) && Number.isFinite(selectedLng) && (selectedLat !== 0 || selectedLng !== 0)
  const displayAddress = searchInputValue || location?.formattedAddress || location?.addressLine1 || ""

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar & GPS Locate Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={autocompleteInputRef}
            type="text"
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            disabled={disabled}
            placeholder="Search address or landmark to place pin..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-slate-900"
          />
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={disabled || isLocating}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-slate-700 shadow-sm transition-colors disabled:opacity-60 shrink-0"
          title="Use GPS to detect current location"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-red-500" />
          )}
          <span>Locate Me</span>
        </button>
      </div>

      {/* Selected Location Details Card (Matching screenshot style) */}
      {hasCoordinates && (
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-left shadow-xs">
          <p className="text-xs text-slate-700 leading-snug">
            <strong className="text-slate-900 font-semibold">Selected Location:</strong>{" "}
            {displayAddress || "Location selected"}
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Coordinates: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Zone Status Banner */}
      {hasCoordinates && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
            isInZone
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-full ${
                isInZone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isInZone ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold leading-tight">
                {isInZone
                  ? `Operating in ${detectedZone?.name || "Service Zone"}`
                  : "Outside Service Area"}
              </h4>
              <p className="text-[11px] opacity-85 mt-0.5">
                {isInZone
                  ? "Your selected location is within an active serviced area. You can proceed."
                  : "Warning: Pinned location is outside active delivery zones. Deliveries might be limited."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-lg border border-gray-300 overflow-hidden bg-slate-100 shadow-sm">
        <div
          ref={mapRef}
          className="w-full h-[360px] sm:h-[420px]"
          style={{ minHeight: "360px" }}
        />

        {/* Map Loading Overlay */}
        {mapLoading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Loading Google Map...</p>
          </div>
        )}

        {/* Map Error Overlay */}
        {mapError && (
          <div className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center p-4 text-center z-10">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm font-semibold text-red-700">Unable to load map</p>
            <p className="text-xs text-red-600 mt-1 max-w-sm">{mapError}</p>
          </div>
        )}

        {/* Instruction Badge on Top-Left of Map */}
        <div className="absolute top-2 left-2 z-1 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-gray-200 text-[11px] font-medium text-slate-700 pointer-events-none flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-red-600" />
          <span>Click map or drag pin to mark exact location</span>
        </div>
      </div>
    </div>
  )
}
