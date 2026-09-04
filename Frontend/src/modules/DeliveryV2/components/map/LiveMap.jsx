import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  GoogleMap, 
  MarkerF, 
  PolygonF,
  PolylineF,
  useJsApiLoader,
  OverlayViewF
} from '@react-google-maps/api';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { extractCoordinates } from '@/modules/DeliveryV2/hooks/useProximityCheck';
import { getHaversineDistance } from '@/modules/DeliveryV2/utils/geo';
import { zoneAPI } from '@food/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  inset: 0
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: true,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f8f9fa" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
  ]
};

const LIBRARIES = ['places', 'geometry'];

const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 }; // Indore fallback

const ROUTE_LINE_BG_OPTIONS = {
  strokeColor: '#1d4ed8',
  strokeOpacity: 0.25,
  strokeWeight: 10,
  zIndex: 10
};

const ROUTE_LINE_MAIN_OPTIONS = {
  strokeColor: '#2563eb',
  strokeOpacity: 0.95,
  strokeWeight: 6,
  zIndex: 12
};

const ZONE_POLYGON_OPTIONS = {
  fillColor: "#22c55e",
  fillOpacity: 0.04,
  strokeColor: "#22c55e",
  strokeOpacity: 0.2,
  strokeWeight: 1.5,
  zIndex: 1
};

export const LiveMap = ({ 
  onMapClick, 
  onMapLoad, 
  onPathReceived, 
  onPolylineReceived, 
  onRouteInfoUpdate,
  fallbackPath = [], 
  zoom = 14 
}) => {
  const { riderLocation, activeOrder, tripStatus } = useDeliveryStore();
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [map, setMapInternal] = useState(null);
  const [zones, setZones] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const directionsServiceRef = useRef(null);
  const lastRouteReqRef = useRef({ origin: null, dest: null, time: 0 });
  const lastFittedPhaseRef = useRef('');

  // Handle map instance initialization
  const handleMapLoad = useCallback((mapInstance) => {
    mapInstance.setOptions({
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: true,
      fullscreenControl: false,
      gestureHandling: 'greedy'
    });
    setMapInternal(mapInstance);
    if (onMapLoad) onMapLoad(mapInstance);
  }, [onMapLoad]);

  // Extract precise points safely using universal extractor
  const restaurantPoint = useMemo(() => {
    if (!activeOrder) return null;
    return extractCoordinates(
      activeOrder.restaurantLocation || 
      activeOrder.restaurant_location || 
      activeOrder.restaurant?.location || 
      activeOrder.restaurantId?.location || 
      activeOrder.restaurant || 
      activeOrder.restaurantId ||
      activeOrder.pickupLocation
    );
  }, [activeOrder]);

  const customerPoint = useMemo(() => {
    if (!activeOrder) return null;
    return extractCoordinates(
      activeOrder.customerLocation || 
      activeOrder.customer_location || 
      activeOrder.deliveryAddress?.location || 
      activeOrder.deliveryAddress || 
      activeOrder.dropLocation || 
      activeOrder.drop_location || 
      activeOrder.userLocation ||
      activeOrder.user?.location
    );
  }, [activeOrder]);

  const targetLocation = useMemo(() => {
    if (!activeOrder) return null;
    if (['PICKING_UP', 'REACHED_PICKUP'].includes(tripStatus) || !['PICKED_UP', 'REACHED_DROP', 'DELIVERING', 'COMPLETED'].includes(tripStatus)) {
      return restaurantPoint;
    }
    if (['PICKED_UP', 'REACHED_DROP', 'DELIVERING'].includes(tripStatus)) {
      return customerPoint;
    }
    return null;
  }, [activeOrder, tripStatus, restaurantPoint, customerPoint]);

  const parsedRiderLocation = useMemo(() => {
    if (!riderLocation) return null;
    const coords = extractCoordinates(riderLocation);
    if (!coords) return null;
    const heading = parseFloat(riderLocation.heading || riderLocation.bearing || 0) || 0;
    return { ...coords, heading };
  }, [riderLocation]);

  // Handle zoom changes smoothly
  useEffect(() => { 
    if (map && Number.isFinite(zoom)) {
      map.setZoom(zoom); 
    }
  }, [zoom, map]);

  // Initialize DirectionsService instance once
  useEffect(() => {
    if (isLoaded && window.google?.maps && !directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    }
  }, [isLoaded]);

  // Fetch Public Zones once on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await zoneAPI.getPublicZones();
        if (isMounted && response?.data?.success && response.data.data?.zones) {
          const formattedZones = response.data.data.zones
            .map(zone => ({
              ...zone,
              paths: (zone.coordinates || []).map(coord => ({
                lat: parseFloat(coord.latitude || coord.lat),
                lng: parseFloat(coord.longitude || coord.lng)
              })).filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng))
            }))
            .filter(z => z.paths.length >= 3);
          setZones(formattedZones);
        }
      } catch (err) {
        console.warn('[LiveMap] Failed to load public zones:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Imperative, throttled, and cached Directions Calculation
  const fetchRoute = useCallback((origin, destination, force = false) => {
    if (!directionsServiceRef.current || !origin || !destination || !window.google?.maps) return;

    const now = Date.now();
    const last = lastRouteReqRef.current;

    // Cache & Throttle Check
    if (!force && last.origin && last.dest) {
      const distFromLastOrigin = getHaversineDistance(origin.lat, origin.lng, last.origin.lat, last.origin.lng);
      const isSameDest = Math.abs(destination.lat - last.dest.lat) < 0.0001 && Math.abs(destination.lng - last.dest.lng) < 0.0001;
      const elapsed = now - last.time;

      // If rider hasn't moved more than 60m and destination is same, throttle to at least 20s
      if (isSameDest && distFromLastOrigin < 60 && elapsed < 20000) {
        return;
      }
    }

    lastRouteReqRef.current = { origin: { ...origin }, dest: { ...destination }, time: now };

    directionsServiceRef.current.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.[0]) {
          const route = result.routes[0];
          const leg = route.legs?.[0];

          // 1. Extract Overview Path
          const rawPath = route.overview_path || [];
          const simplePath = rawPath.map(p => ({
            lat: typeof p.lat === 'function' ? p.lat() : (p.lat || p.latitude),
            lng: typeof p.lng === 'function' ? p.lng() : (p.lng || p.longitude)
          }));
          setRoutePath(simplePath);

          // 2. Extract Road Distance & Duration
          const distanceMeters = leg?.distance?.value || 0;
          const distanceText = leg?.distance?.text || '';
          const durationSeconds = leg?.duration?.value || 0;
          const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
          const durationText = leg?.duration?.text || '';

          // 3. Extract Encoded Polyline
          const rawPolyline = route.overview_polyline;
          const encodedPolyline = typeof rawPolyline === 'string' ? rawPolyline : (rawPolyline?.points || '');

          // 4. Notify Callbacks
          if (onPathReceived) onPathReceived(simplePath);
          if (onPolylineReceived && encodedPolyline) onPolylineReceived(encodedPolyline);
          if (onRouteInfoUpdate) {
            onRouteInfoUpdate({
              distanceMeters,
              distanceText,
              durationMinutes,
              durationText
            });
          }
        } else {
          console.warn('[LiveMap] Driving route lookup status:', status);
        }
      }
    );
  }, [onPathReceived, onPolylineReceived, onRouteInfoUpdate]);

  // Trigger route calculation when target or rider location updates significantly
  useEffect(() => {
    if (!parsedRiderLocation || !targetLocation) {
      setRoutePath([]);
      return;
    }
    fetchRoute(parsedRiderLocation, targetLocation);
  }, [parsedRiderLocation?.lat, parsedRiderLocation?.lng, targetLocation?.lat, targetLocation?.lng, tripStatus, activeOrder?._id, fetchRoute]);

  // Reset route on order or trip status change
  useEffect(() => {
    lastRouteReqRef.current = { origin: null, dest: null, time: 0 };
    setRoutePath([]);
  }, [activeOrder?._id, tripStatus]);

  // Smart Camera Framing: Fit bounds ONCE per phase transition (never on a disruptive loop timer)
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const currentPhaseKey = `${activeOrder?._id || 'none'}_${tripStatus}`;
    if (lastFittedPhaseRef.current === currentPhaseKey) return;

    const pointsToFrame = [];
    if (parsedRiderLocation) pointsToFrame.push(parsedRiderLocation);
    if (targetLocation) pointsToFrame.push(targetLocation);

    if (pointsToFrame.length >= 2) {
      const bounds = new window.google.maps.LatLngBounds();
      pointsToFrame.forEach(pt => bounds.extend(new window.google.maps.LatLng(pt.lat, pt.lng)));
      map.fitBounds(bounds, { top: 90, right: 60, bottom: 150, left: 60 });
      lastFittedPhaseRef.current = currentPhaseKey;
    } else if (parsedRiderLocation && pointsToFrame.length === 1) {
      map.panTo(parsedRiderLocation);
      lastFittedPhaseRef.current = currentPhaseKey;
    }
  }, [map, parsedRiderLocation, targetLocation, tripStatus, activeOrder?._id]);

  // Marker icons (Memoized to prevent Google Maps from unmounting markers on render)
  const restaurantMarkerIcon = useMemo(() => {
    if (!window.google?.maps) return null;
    const url = activeOrder?.restaurantImage || activeOrder?.restaurant?.logo || activeOrder?.restaurant?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png';
    return {
      url,
      scaledSize: new window.google.maps.Size(42, 42),
      anchor: new window.google.maps.Point(21, 21)
    };
  }, [activeOrder?.restaurantImage, activeOrder?.restaurant?.logo, activeOrder?.restaurant?.profileImage]);

  const customerMarkerIcon = useMemo(() => {
    if (!window.google?.maps) return null;
    const url = activeOrder?.customerImage || activeOrder?.user?.logo || activeOrder?.user?.profileImage || 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png';
    return {
      url,
      scaledSize: new window.google.maps.Size(42, 42),
      anchor: new window.google.maps.Point(21, 21)
    };
  }, [activeOrder?.customerImage, activeOrder?.user?.logo, activeOrder?.user?.profileImage]);

  const overlayOffset = useCallback((w, h) => ({
    x: -(w / 2),
    y: -(h / 2)
  }), []);

  // Use routePath or fallbackPath
  const activePath = routePath.length > 0 ? routePath : fallbackPath;

  if (loadError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-red-500 font-bold">
        Map Load Error. Please check Google Maps API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 text-gray-900 overflow-hidden flex flex-col">
      <GoogleMap
        onLoad={handleMapLoad}
        mapContainerStyle={mapContainerStyle}
        center={parsedRiderLocation || targetLocation || DEFAULT_CENTER}
        zoom={zoom}
        heading={parsedRiderLocation?.heading || 0}
        onClick={(e) => onMapClick?.(e.latLng.lat(), e.latLng.lng())}
        options={mapOptions}
      >
        {/* Glow Background Polyline */}
        {activePath.length > 1 && (
          <PolylineF 
            path={activePath} 
            options={ROUTE_LINE_BG_OPTIONS} 
          />
        )}

        {/* Main Solid Navigation Polyline */}
        {activePath.length > 1 && (
          <PolylineF 
            path={activePath} 
            options={ROUTE_LINE_MAIN_OPTIONS} 
          />
        )}

        {/* Lightweight Rider Marker with Smooth Heading Rotation */}
        {parsedRiderLocation && (
          <OverlayViewF 
            position={parsedRiderLocation} 
            mapPaneName={OverlayViewF.MARKER_LAYER}
            getPixelPositionOffset={overlayOffset}
          >
            <div className="relative w-16 h-16 flex items-center justify-center pointer-events-none">
              {/* Pulsing GPS Halo */}
              <div className="absolute inset-2 bg-blue-500/20 rounded-full animate-ping pointer-events-none" />
              <div 
                style={{ 
                  transform: `rotate(${parsedRiderLocation.heading || 0}deg)`, 
                  transition: 'transform 0.4s ease-out' 
                }} 
                className="relative w-14 h-14 drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]"
              >
                <img 
                  src="/MapRider.png" 
                  alt="Rider" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.target.src = 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png';
                  }}
                />
              </div>
            </div>
          </OverlayViewF>
        )}

        {/* Restaurant Pin */}
        {restaurantPoint && restaurantMarkerIcon && (
          <MarkerF
            position={restaurantPoint}
            icon={restaurantMarkerIcon}
          />
        )}

        {/* Customer Pin */}
        {customerPoint && customerMarkerIcon && (
          <MarkerF
            position={customerPoint}
            icon={customerMarkerIcon}
          />
        )}

        {/* Delivery Service Zones */}
        {zones.map((zone) => (
          <PolygonF 
            key={zone._id || zone.id} 
            paths={zone.paths} 
            options={ZONE_POLYGON_OPTIONS} 
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default React.memo(LiveMap);
